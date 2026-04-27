from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models.watchlist import WatchlistAdd, WatchlistUpdate, WatchlistInDB, WatchStatus, EpisodeNote, EpisodeNoteCreate
from app.services.auth_service import get_current_active_user

router = APIRouter(prefix="/api/watchlist", tags=["Watchlist"])


@router.post("/", status_code=201)
async def add_to_watchlist(body: WatchlistAdd, current_user=Depends(get_current_active_user)):
    db = get_db()
    user_id = current_user["id"]
    if not ObjectId.is_valid(body.content_id):
        raise HTTPException(status_code=400, detail="Invalid content ID")
    content = await db.content.find_one({"_id": ObjectId(body.content_id)})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    existing = await db.watchlist.find_one({"user_id": user_id, "content_id": body.content_id})
    now = datetime.utcnow()
    if existing:
        await db.watchlist.update_one(
            {"_id": existing["_id"]},
            {"$set": {"status": body.status, "notes": body.notes, "rewatch_count": body.rewatch_count,
                      "progress": body.progress, "started_date": body.started_date,
                      "finished_date": body.finished_date, "updated_at": now}}
        )
        doc = await db.watchlist.find_one({"_id": existing["_id"]})
    else:
        insert = WatchlistInDB(user_id=user_id, content_id=body.content_id, status=body.status,
            notes=body.notes, rewatch_count=body.rewatch_count, progress=body.progress,
            started_date=body.started_date, finished_date=body.finished_date).model_dump()
        result = await db.watchlist.insert_one(insert)
        doc = await db.watchlist.find_one({"_id": result.inserted_id})
    if body.status == WatchStatus.completed:
        await _upsert_history(db, user_id, body.content_id)
    return _serialize(doc, content)


@router.get("/")
async def get_watchlist(status: Optional[str] = None, page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100), current_user=Depends(get_current_active_user)):
    db = get_db()
    query: dict = {"user_id": current_user["id"]}
    if status:
        query["status"] = status
    skip = (page - 1) * limit
    cursor = db.watchlist.find(query).sort("updated_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    total = await db.watchlist.count_documents(query)
    results = []
    for doc in docs:
        content = await db.content.find_one({"_id": ObjectId(doc["content_id"])})
        rating = await db.ratings.find_one({"user_id": current_user["id"], "content_id": doc["content_id"]})
        entry = _serialize(doc, content)
        entry["user_rating"] = rating["rating"] if rating else None
        results.append(entry)
    return {"watchlist": results, "total": total, "page": page}


@router.put("/{entry_id}")
async def update_watchlist_entry(entry_id: str, body: WatchlistUpdate, current_user=Depends(get_current_active_user)):
    db = get_db()
    doc = await db.watchlist.find_one({"_id": ObjectId(entry_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    update["updated_at"] = datetime.utcnow()
    await db.watchlist.update_one({"_id": ObjectId(entry_id)}, {"$set": update})
    if body.status == WatchStatus.completed:
        await _upsert_history(db, current_user["id"], doc["content_id"])
    updated = await db.watchlist.find_one({"_id": ObjectId(entry_id)})
    content = await db.content.find_one({"_id": ObjectId(doc["content_id"])})
    return _serialize(updated, content)


@router.delete("/{entry_id}", status_code=204)
async def remove_from_watchlist(entry_id: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    doc = await db.watchlist.find_one({"_id": ObjectId(entry_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.watchlist.delete_one({"_id": ObjectId(entry_id)})


@router.get("/history")
async def get_watch_history(page: int = Query(1, ge=1), limit: int = Query(30, ge=1, le=100),
    current_user=Depends(get_current_active_user)):
    db = get_db()
    skip = (page - 1) * limit
    cursor = db.watch_history.find({"user_id": current_user["id"]}).sort("watched_date", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    total = await db.watch_history.count_documents({"user_id": current_user["id"]})
    results = []
    for doc in docs:
        content = await db.content.find_one({"_id": ObjectId(doc["content_id"])})
        results.append({"id": str(doc["_id"]), "content_id": doc["content_id"],
            "watched_date": doc.get("watched_date"), "rewatch": doc.get("rewatch", False),
            "content_title": content.get("title") if content else None,
            "content_poster": content.get("poster_path") if content else None,
            "content_type": content.get("type") if content else None})
    return {"history": results, "total": total, "page": page}


# ── Episode Journal ───────────────────────────────────────────────────────────

@router.post("/{entry_id}/episodes", status_code=201)
async def add_episode_note(entry_id: str, body: EpisodeNoteCreate, current_user=Depends(get_current_active_user)):
    db = get_db()
    doc = await db.watchlist.find_one({"_id": ObjectId(entry_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")
    if doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    note = EpisodeNote(**body.model_dump()).model_dump()
    note["created_at"] = note["created_at"].isoformat() if hasattr(note["created_at"], "isoformat") else note["created_at"]
    await db.watchlist.update_one(
        {"_id": ObjectId(entry_id)},
        {"$push": {"episode_notes": note}, "$set": {"updated_at": datetime.utcnow()}}
    )
    return note


@router.delete("/{entry_id}/episodes/{note_id}", status_code=204)
async def delete_episode_note(entry_id: str, note_id: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    doc = await db.watchlist.find_one({"_id": ObjectId(entry_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.watchlist.update_one(
        {"_id": ObjectId(entry_id)}, {"$pull": {"episode_notes": {"note_id": note_id}}}
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _upsert_history(db, user_id: str, content_id: str):
    existing = await db.watch_history.find_one({"user_id": user_id, "content_id": content_id})
    if existing:
        await db.watch_history.update_one({"_id": existing["_id"]},
            {"$set": {"watched_date": datetime.utcnow(), "rewatch": True}, "$inc": {"rewatch_count": 1}})
    else:
        await db.watch_history.insert_one({"user_id": user_id, "content_id": content_id,
            "watched_date": datetime.utcnow(), "rewatch": False, "rewatch_count": 0})


def _serialize(doc: dict, content: dict) -> dict:
    return {
        "id": str(doc["_id"]), "user_id": doc["user_id"], "content_id": doc["content_id"],
        "status": doc.get("status"), "notes": doc.get("notes"),
        "rewatch_count": doc.get("rewatch_count", 0), "progress": doc.get("progress"),
        "started_date": doc.get("started_date"), "finished_date": doc.get("finished_date"),
        "episode_notes": doc.get("episode_notes", []),
        "added_at": doc.get("added_at"), "updated_at": doc.get("updated_at"),
        "content_title": content.get("title") if content else None,
        "content_poster": content.get("poster_path") if content else None,
        "content_type": content.get("type") if content else None,
        "content_genres": content.get("genres", []) if content else [],
    }