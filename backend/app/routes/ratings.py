from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from datetime import datetime
from typing import List, Optional

from app.database import get_db
from app.models.rating import RatingCreate, RatingUpdate, RatingInDB, RatingResponse
from app.services.auth_service import get_current_active_user

router = APIRouter(prefix="/api/ratings", tags=["Ratings"])


@router.post("/", status_code=201)
async def add_rating(body: RatingCreate, current_user=Depends(get_current_active_user)):
    db = get_db()
    user_id = current_user["id"]

    # Validate content exists
    if not ObjectId.is_valid(body.content_id):
        raise HTTPException(status_code=400, detail="Invalid content ID")
    content = await db.content.find_one({"_id": ObjectId(body.content_id)})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Upsert: update if exists, create if not
    now = datetime.utcnow()
    existing = await db.ratings.find_one({"user_id": user_id, "content_id": body.content_id})

    if existing:
        await db.ratings.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "rating": body.rating,
                "review": body.review,
                "contains_spoiler": body.contains_spoiler,
                "updated_at": now,
            }}
        )
        updated = await db.ratings.find_one({"_id": existing["_id"]})
        return _serialize_rating(updated, current_user, content)
    else:
        doc = RatingInDB(
            user_id=user_id,
            content_id=body.content_id,
            rating=body.rating,
            review=body.review,
            contains_spoiler=body.contains_spoiler,
        ).model_dump()
        result = await db.ratings.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _serialize_rating(doc, current_user, content)


@router.get("/me")
async def my_ratings(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    skip = (page - 1) * limit
    cursor = db.ratings.find({"user_id": current_user["id"]}).sort("created_at", -1).skip(skip).limit(limit)
    ratings = await cursor.to_list(limit)
    total = await db.ratings.count_documents({"user_id": current_user["id"]})

    results = []
    for r in ratings:
        content = await db.content.find_one({"_id": ObjectId(r["content_id"])})
        results.append(_serialize_rating(r, current_user, content))

    return {"ratings": results, "total": total, "page": page}


@router.get("/content/{content_id}")
async def content_ratings(
    content_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_active_user),
):
    """All ratings for a piece of content — from friends + own."""
    db = get_db()
    user_id = current_user["id"]
    friends = current_user.get("friends", [])
    visible_users = set(friends + [user_id])

    skip = (page - 1) * limit
    query = {"content_id": content_id, "user_id": {"$in": list(visible_users)}}
    cursor = db.ratings.find(query).sort("updated_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    total = await db.ratings.count_documents(query)

    content = await db.content.find_one({"_id": ObjectId(content_id)})
    results = []
    for r in docs:
        author = await db.users.find_one({"_id": ObjectId(r["user_id"])})
        results.append(_serialize_rating(r, author, content))

    return {"ratings": results, "total": total, "page": page}


@router.delete("/{rating_id}", status_code=204)
async def delete_rating(rating_id: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    rating = await db.ratings.find_one({"_id": ObjectId(rating_id)})
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")
    if rating["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your rating")
    await db.ratings.delete_one({"_id": ObjectId(rating_id)})


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize_rating(r: dict, user: dict, content: dict) -> dict:
    return {
        "id": str(r["_id"]),
        "user_id": r["user_id"],
        "content_id": r["content_id"],
        "rating": r["rating"],
        "review": r.get("review"),
        "contains_spoiler": r.get("contains_spoiler", False),
        "created_at": r.get("created_at"),
        "updated_at": r.get("updated_at"),
        "username": user.get("username") if user else None,
        "display_name": user.get("display_name") if user else None,
        "avatar_url": user.get("avatar_url") if user else None,
        "content_title": content.get("title") if content else None,
        "content_poster": content.get("poster_path") if content else None,
    }