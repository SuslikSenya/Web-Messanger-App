from pydantic import BaseModel, EmailStr

from schemas.token import Token


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        from_attributes = True


class UserToken(UserRead):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
