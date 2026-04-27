from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from datetime import datetime

from app.database import get_db
from app.models.user import UserRegister, UserLogin, UserPublic, UserUpdate, TokenResponse, UserInDB
from app.services.auth_service import (
    hash_password, verify_password, create_access_token, get_current_active_user
)

router = APIRouter(prefix="/api/auth", tags=["Auth"])


def _serialize_user(user: dict) -> UserPublic:
    """Convert MongoDB user doc → UserPublic schema."""
    return UserPublic(
        id=str(user["_id"]),
        username=user["username"],
        email=user["email"],
        display_name=user.get("display_name"),
        avatar_url=user.get("avatar_url"),
        bio=user.get("bio"),
        friends=user.get("friends", []),
        friend_requests=user.get("friend_requests", []),
        created_at=user.get("created_at", datetime.utcnow()),
    )


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: UserRegister):
    db = get_db()

    # Check duplicates
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await db.users.find_one({"username": body.username}):
        raise HTTPException(status_code=400, detail="Username already taken")

    user_doc = UserInDB(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        display_name=body.display_name or body.username,
    ).model_dump()

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = create_access_token({"sub": str(result.inserted_id)})
    return TokenResponse(access_token=token, user=_serialize_user(user_doc))


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": body.email})

    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user["_id"])})
    return TokenResponse(access_token=token, user=_serialize_user(user))


@router.get("/me", response_model=UserPublic)
async def get_me(current_user=Depends(get_current_active_user)):
    return _serialize_user(current_user)


@router.put("/me", response_model=UserPublic)
async def update_profile(body: UserUpdate, current_user=Depends(get_current_active_user)):
    db = get_db()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": update_data}
    )

    updated = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    return _serialize_user(updated)