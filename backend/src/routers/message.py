import os
import aiofiles
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from crud.message import create_message, get_messages_between, update_message, delete_message, get_message_by_id
from schemas.message import MessageCreate, MessageRead, MessageUpdate
from auth.dependencies import get_async_session, get_current_user

from config import UPLOAD_DIR

os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter()


@router.post("/", response_model=MessageRead)
async def send_message(
    text: str = Form(...),
    receiver_id: int = Form(...),
    files: List[UploadFile] = File([]),
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(get_current_user)
):
    saved_files = []
    for file in files:
        filename = f"{uuid.uuid4().hex}_{file.filename}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        async with aiofiles.open(filepath, "wb") as f:
            content = await file.read()
            await f.write(content)
        saved_files.append(f"/uploads/{filename}")

    message_in = MessageCreate(text=text, receiver_id=receiver_id, files=saved_files)
    message = await create_message(db, current_user.id, message_in)
    return message


@router.get("/{other_user_id}", response_model=list[MessageRead])
async def get_chat(
        other_user_id: int,
        db: AsyncSession = Depends(get_async_session),
        current_user=Depends(get_current_user)
):
    return await get_messages_between(db, current_user.id, other_user_id)


@router.put("/{message_id}", response_model=MessageRead)
async def edit_message(
    message_id: int,
    text: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    db: AsyncSession = Depends(get_async_session),
    current_user=Depends(get_current_user),
):
    message = await get_message_by_id(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    if text is not None:
        message.text = text

    if files is not None:
        saved_files = []
        for file in files:
            filename = f"{uuid.uuid4().hex}_{file.filename}"
            filepath = os.path.join(UPLOAD_DIR, filename)
            async with aiofiles.open(filepath, "wb") as f:
                content = await file.read()
                await f.write(content)
            saved_files.append(f"/uploads/{filename}")

        message.files = saved_files

    await db.commit()
    await db.refresh(message)
    return message


@router.delete("/{message_id}")
async def remove_message(
        message_id: int,
        db: AsyncSession = Depends(get_async_session),
        current_user=Depends(get_current_user)
):
    message = await delete_message(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    return {"detail": "Message deleted"}
