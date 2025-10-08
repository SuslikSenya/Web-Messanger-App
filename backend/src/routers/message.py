import base64
import json
import os
import aiofiles
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from crud.message import create_message, get_messages_between, update_message, delete_message, get_message_by_id, manager
from schemas.message import MessageCreate, MessageRead, MessageUpdate
from auth.dependencies import get_async_session, get_current_user_ws, get_current_user

from config import UPLOAD_DIR

os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter()


@router.websocket("/ws/chat")
async def websocket_chat(
        websocket: WebSocket,
        db: AsyncSession = Depends(get_async_session),
        current_user=Depends(get_current_user_ws)
):
    user_id = current_user.id
    await manager.connect(websocket, user_id)
    print(f"New WS connection for {current_user.username}")

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            action = payload.get("action")

            # --- SEND HISTORY ---
            if action == "history":
                other_user_id = payload.get("other_user_id")
                if other_user_id:
                    messages = await get_messages_between(db, user_id, other_user_id)
                    messages_data = [MessageRead.from_orm(m) for m in messages]
                    await manager.send_history(messages_data, user_id)

            # --- SEND NEW MESSAGE ---
            elif action == "send":
                files = payload.get("files", [])
                saved_files = []
                for file in files:
                    filename = f"{uuid.uuid4().hex}_{file['name']}"
                    filepath = os.path.join(UPLOAD_DIR, filename)

                    file_bytes = base64.b64decode(file["content"])
                    async with aiofiles.open(filepath, "wb") as f:
                        await f.write(file_bytes)

                    saved_files.append(f"/uploads/{filename}")

                msg_in = MessageCreate(
                    text=payload.get("text", ""),
                    receiver_id=payload.get("receiver_id"),
                    files=saved_files,  # <-- исправлено
                )
                message = await create_message(db, user_id, msg_in)
                message_data = MessageRead.from_orm(message)

                await manager.send_personal_message(message_data, payload["receiver_id"])
                await manager.send_personal_message(message_data, user_id)


            # --- EDIT MESSAGE ---
            elif action == "edit":
                msg_id = payload.get("id")
                text = payload.get("text")
                files = payload.get("files")
                msg_in = MessageUpdate(text=text, files=files)
                message = await update_message(db, msg_id, msg_in)
                if message:
                    message_data = MessageRead.from_orm(message)
                    await manager.send_edit(message_data, message.sender_id)
                    await manager.send_edit(message_data, message.receiver_id)

            # --- DELETE MESSAGE ---
            elif action == "delete":
                msg_id = payload.get("id")
                deleted_message = await delete_message(db, msg_id)
                if deleted_message:
                    await manager.send_delete(deleted_message.id, deleted_message.sender_id)
                    await manager.send_delete(deleted_message.id, deleted_message.receiver_id)

    except WebSocketDisconnect:
        manager.disconnect(user_id)


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
        current_user=Depends(get_current_user_ws)
):
    return await get_messages_between(db, current_user.id, other_user_id)


@router.put("/{message_id}", response_model=MessageRead)
async def edit_message(
        message_id: int,
        text: Optional[str] = Form(None),
        files: Optional[List[UploadFile]] = File(None),
        db: AsyncSession = Depends(get_async_session),
        current_user=Depends(get_current_user_ws),
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
        current_user=Depends(get_current_user_ws)
):
    message = await delete_message(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    return {"detail": "Message deleted"}
