from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import OAuth2PasswordRequestForm
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from auth.utils import create_refresh_token, create_access_token
from crud.user import create_user, get_user_by_username
from schemas.token import Token
from schemas.user import UserCreate, UserRead, UserToken
from auth.dependencies import get_async_session, get_current_user

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter()


@router.post("/register", response_model=UserToken)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_async_session)):
    existing = await get_user_by_username(db, user_in.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    user = await create_user(db, user_in)
    access_token = create_access_token(user.username)
    refresh_token = create_refresh_token(user.username)

    return UserToken(
        id=user.id,
        username=user.username,
        email=user.email,
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.post("/token", response_model=UserToken)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_async_session)):
    user = await get_user_by_username(db, form_data.username)
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = create_access_token(user.username)
    refresh_token = create_refresh_token(user.username)
    return UserToken(
        id=user.id,
        username=user.username,
        email=user.email,
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.post("/logout")
async def logout(
        response: Response,
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: AsyncSession = Depends(get_async_session)
):
    user = await get_user_by_username(db, form_data.username)
    if not user or pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")

    return {"detail": "Successfully logged out"}


@router.post("/refresh", response_model=Token)
async def refresh_access_token(
        refresh_token: str
):
    from jose import jwt, JWTError
    from config import SECRET_KEY, ALGORITHM
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    access_token = create_access_token(username)
    new_refresh_token = create_refresh_token(username)
    return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}


@router.get("/me", response_model=UserRead)
async def read_me(current_user=Depends(get_current_user)):
    return current_user
