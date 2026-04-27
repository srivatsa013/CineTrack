from fastapi import APIRouter, Depends, Query
from bson import ObjectId
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.ml.hybrid import get_recommendations, get_similar_content, train_models
from app.services.auth_service import get_current_active_user

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])


@router.get("/")
async def recommendations(
    top_n: int = Query(20, ge=1, le=50),
    content_type: Optional[str] = Query(None, regex="^(movie|series|anime)$"),
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    # Load genre preferences and not-interested list from user doc
    genre_weights = current_user.get("genre_preferences", {})
    not_interested = current_user.get("not_interested", [])

    results = await get_recommendations(
        user_id=current_user["id"],
        db=db,
        top_n=top_n,
        content_type=content_type,
        genre_weights=genre_weights,
        extra_exclude=not_interested,
    )
    return {"recommendations": results, "count": len(results), "user_id": current_user["id"]}


@router.get("/similar/{content_id}")
async def similar_content(
    content_id: str,
    top_n: int = Query(10, ge=1, le=30),
    _: dict = Depends(get_current_active_user),
):
    db = get_db()
    results = await get_similar_content(content_id=content_id, db=db, top_n=top_n)
    return {"similar": results, "content_id": content_id}


@router.post("/not-interested/{content_id}")
async def mark_not_interested(content_id: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$addToSet": {"not_interested": content_id}}
    )
    return {"message": "Marked as not interested"}


@router.delete("/not-interested/{content_id}")
async def undo_not_interested(content_id: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$pull": {"not_interested": content_id}}
    )
    return {"message": "Removed from not interested"}


@router.put("/genre-preferences")
async def update_genre_preferences(body: dict, current_user=Depends(get_current_active_user)):
    """
    body: {"Action": 1.8, "Horror": 0.2, "Comedy": 1.0, ...}
    Values: 0.1 (strongly dislike) → 1.0 (neutral) → 2.0 (strongly prefer)
    """
    db = get_db()
    # Validate all values are in range
    for genre, weight in body.items():
        if not (0.1 <= float(weight) <= 2.0):
            body[genre] = max(0.1, min(2.0, float(weight)))

    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"genre_preferences": body}}
    )
    return {"genre_preferences": body}


@router.get("/genre-preferences")
async def get_genre_preferences(current_user=Depends(get_current_active_user)):
    return {"genre_preferences": current_user.get("genre_preferences", {})}


@router.post("/retrain", include_in_schema=False)
async def retrain(_: dict = Depends(get_current_active_user)):
    db = get_db()
    await train_models(db)
    return {"message": "Models retrained successfully."}