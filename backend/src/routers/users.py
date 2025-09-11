from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from crud.user import get_all_users_from_db
from database import get_async_session

router = APIRouter()


@router.get("/")
async def get_all_users(db: AsyncSession = Depends(get_async_session), current_user=Depends(get_current_user)):
    users = await get_all_users_from_db(db, current_user.id)
    return users
