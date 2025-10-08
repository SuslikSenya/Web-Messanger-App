import os

from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from config import BASE_DIR
from models.message import Message
from schemas.message import MessageCreate, MessageUpdate, MessageRead
from datetime import datetime


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)

    async def send_personal_message(self, message: dict, user_id: int):
        ws = self.active_connections.get(user_id)
        if ws:
            payload = {"type": "message", "message": jsonable_encoder(MessageRead.from_orm(message))}
            await ws.send_json(payload)

    async def send_delete(self, message_id: int, user_id: int):
        ws = self.active_connections.get(user_id)
        if ws:
            payload = {"type": "delete", "message": {"id": message_id}}
            await ws.send_json(payload)

    async def send_edit(self, message: MessageRead, user_id: int):
        ws = self.active_connections.get(user_id)
        if ws:
            payload = {"type": "edit", "message": jsonable_encoder(message)}
            await ws.send_json(payload)

    async def send_history(self, messages: list[MessageRead], user_id: int):
        ws = self.active_connections.get(user_id)
        if ws:
            payload = {
                "type": "history",
                "messages": jsonable_encoder(messages)
            }
            await ws.send_json(payload)


manager = ConnectionManager()


async def create_message(
        db: AsyncSession,
        sender_id: int,
        msg_in: MessageCreate
):
    message = Message(
        sender_id=sender_id,
        receiver_id=msg_in.receiver_id,
        text=msg_in.text,
        files=msg_in.files or [],
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


async def get_messages_between(db: AsyncSession, user1: int, user2: int):
    result = await db.execute(
        select(Message).where(
            ((Message.sender_id == user1) & (Message.receiver_id == user2)) |
            ((Message.sender_id == user2) & (Message.receiver_id == user1))
        ).order_by(Message.created_at)
    )
    return result.scalars().all()


async def update_message(db: AsyncSession, message_id: int, msg_in: MessageUpdate):
    result = await db.execute(select(Message).where(Message.id == message_id))
    message = result.scalar_one_or_none()
    if not message:
        return None
    if msg_in.text is not None:
        message.text = msg_in.text
    if msg_in.files is not None:
        message.files = msg_in.files
    message.updated_at = datetime.utcnow()
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


async def delete_message(db: AsyncSession, message_id: int):
    result = await db.execute(select(Message).where(Message.id == message_id))
    message = result.scalar_one_or_none()
    if not message:
        return None

    deleted_message = MessageRead.from_orm(message)

    for file_path in message.files or []:
        full_path = os.path.join(BASE_DIR, file_path.lstrip("/"))
        if os.path.exists(full_path):
            os.remove(full_path)

    await db.delete(message)
    await db.commit()
    return deleted_message


async def get_message_by_id(db: AsyncSession, message_id: int):
    result = await db.execute((select(Message).where(Message.id == message_id)))
    return result.scalar_one_or_none()
