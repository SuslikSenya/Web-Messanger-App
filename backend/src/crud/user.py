from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from models.user import User
from schemas.user import UserCreate
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_user(db: AsyncSession, user_in: UserCreate):
    hashed_password = pwd_context.hash(user_in.password)
    user = User(username=user_in.username, email=user_in.email, hashed_password=hashed_password)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_id(db: AsyncSession, user_id: int):
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_all_users_from_db(db: AsyncSession, current_user_id: int):
    result = await db.execute(
        select(User).where(User.id != current_user_id)
    )
    return result.scalars().all()


async def get_user_by_username(db: AsyncSession, username: str):
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()
