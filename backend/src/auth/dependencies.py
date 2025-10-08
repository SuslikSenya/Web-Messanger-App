from fastapi import Depends, HTTPException, status, WebSocket
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_async_session
from crud.user import get_user_by_username
from jose import jwt, JWTError
from config import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_async_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = await get_user_by_username(db, username=username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_user_ws(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_async_session),
):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            await websocket.close(code=4002)
            return
    except JWTError:
        await websocket.close(code=4003)
        return

    user = await get_user_by_username(db, username)
    if not user:
        await websocket.close(code=4004)
        return

    return user
