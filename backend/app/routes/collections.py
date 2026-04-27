from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models.collection import CollectionCreate, CollectionUpdate, CollectionInDB
from app.services.auth_service import get_current_active_user

router = APIRouter(prefix="/api/collections", tags=["Collections"])


@router.post("/", status_code=201)
async def create_collection(body: CollectionCreate, current_user=Depends(get_current_active_user)):
    db = get_db()
    doc = CollectionInDB(
        user_id=current_user["id"],
        name=body.name,
        description=body.description,
        is_private=body.is_private,
    ).model_dump()
    result = await db.collections.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc, [])


@router.get("/")
async def get_my_collections(current_user=Depends(get_current_active_user)):
    db = get_db()
    docs = await db.collections.find({"user_id": current_user["id"]}).sort("updated_at", -1).to_list(100)
    results = []
    for doc in docs:
        posters = await _get_preview_posters(db, doc.get("content_ids", []))
        results.append(_serialize(doc, posters))
    return {"collections": results}


@router.get("/{collection_id}")
async def get_collection(collection_id: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    doc = await db.collections.find_one({"_id": ObjectId(collection_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Collection not found")
    if doc["user_id"] != current_user["id"] and doc.get("is_private", True):
        raise HTTPException(status_code=403, detail="Private collection")

    content_ids = doc.get("content_ids", [])
    content_docs = []
    for cid in content_ids:
        c = await db.content.find_one({"_id": ObjectId(cid)})
        if c:
            content_docs.append({
                "id": str(c["_id"]),
                "title": c.get("title"),
                "type": c.get("type"),
                "poster_path": c.get("poster_path"),
                "genres": c.get("genres", []),
                "vote_average": c.get("vote_average"),
                "release_date": c.get("release_date"),
            })

    result = _serialize(doc, [c.get("poster_path") for c in content_docs if c.get("poster_path")][:4])
    result["content"] = content_docs
    return result


@router.put("/{collection_id}")
async def update_collection(collection_id: str, body: CollectionUpdate, current_user=Depends(get_current_active_user)):
    db = get_db()
    doc = await db.collections.find_one({"_id": ObjectId(collection_id)})
    if not doc or doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Not found")

    update = {k: v for k, v in body.model_dump().items() if v is not None}
    update["updated_at"] = datetime.utcnow()
    await db.collections.update_one({"_id": ObjectId(collection_id)}, {"$set": update})
    updated = await db.collections.find_one({"_id": ObjectId(collection_id)})
    posters = await _get_preview_posters(db, updated.get("content_ids", []))
    return _serialize(updated, posters)


@router.delete("/{collection_id}", status_code=204)
async def delete_collection(collection_id: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    doc = await db.collections.find_one({"_id": ObjectId(collection_id)})
    if not doc or doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Not found")
    await db.collections.delete_one({"_id": ObjectId(collection_id)})


@router.post("/{collection_id}/add/{content_id}")
async def add_to_collection(collection_id: str, content_id: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    doc = await db.collections.find_one({"_id": ObjectId(collection_id)})
    if not doc or doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Not found")

    if not await db.content.find_one({"_id": ObjectId(content_id)}):
        raise HTTPException(status_code=404, detail="Content not found")

    await db.collections.update_one(
        {"_id": ObjectId(collection_id)},
        {"$addToSet": {"content_ids": content_id}, "$set": {"updated_at": datetime.utcnow()}}
    )
    return {"message": "Added to collection"}


@router.delete("/{collection_id}/remove/{content_id}")
async def remove_from_collection(collection_id: str, content_id: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    doc = await db.collections.find_one({"_id": ObjectId(collection_id)})
    if not doc or doc["user_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Not found")

    await db.collections.update_one(
        {"_id": ObjectId(collection_id)},
        {"$pull": {"content_ids": content_id}, "$set": {"updated_at": datetime.utcnow()}}
    )
    return {"message": "Removed from collection"}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_preview_posters(db, content_ids: list) -> list:
    posters = []
    for cid in content_ids[:4]:
        try:
            c = await db.content.find_one({"_id": ObjectId(cid)})
            if c and c.get("poster_path"):
                posters.append(c["poster_path"])
        except Exception:
            pass
    return posters


def _serialize(doc: dict, preview_posters: list) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": doc["user_id"],
        "name": doc["name"],
        "description": doc.get("description"),
        "is_private": doc.get("is_private", True),
        "content_count": len(doc.get("content_ids", [])),
        "preview_posters": preview_posters,
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }