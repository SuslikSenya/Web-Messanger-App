from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class MessageCreate(BaseModel):
    receiver_id: int
    text: str
    files: Optional[List[str]] = None


class MessageRead(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    text: str
    files: List[str] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MessageUpdate(BaseModel):
    text: Optional[str] = None
    files: Optional[List[str]] = None
