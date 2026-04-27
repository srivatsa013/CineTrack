from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from typing import List

from app.database import get_db
from app.models.shared_watchlist import (
    SharedWatchlistCreate, SharedWatchlistUpdate,
    SharedWatchlistItemAdd, SharedWatchlistInDB
)
from app.services.auth_service import get_current_active_user
from app.routes.notifications import create_notification

router = APIRouter(prefix="/api/shared-watchlists", tags=["Shared Watchlists"])


def _serialize(doc: dict, members: list = [], content: list = []) -> dict:
    return {
        "id":          str(doc["_id"]),
        "name":        doc["name"],
        "description": doc.get("description"),
        "owner_id":    doc["owner_id"],
        "member_ids":  doc.get("member_ids", []),
        "content_ids": doc.get("content_ids", []),
        "created_at":  doc.get("created_at"),
        "updated_at":  doc.get("updated_at"),
        "members":     members,
        "content":     content,
    }


@router.post("/", status_code=201)
async def create_shared_watchlist(
    body: SharedWatchlistCreate,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    owner_id = current_user["id"]

    # Resolve invited usernames to user IDs
    member_ids = []
    for uname in body.invite_usernames:
        u = await db.users.find_one({"username": uname})
        if u and str(u["_id"]) != owner_id:
            member_ids.append(str(u["_id"]))

    doc = SharedWatchlistInDB(
        name=body.name,
        description=body.description,
        owner_id=owner_id,
        member_ids=member_ids,
    ).model_dump()

    result = await db.shared_watchlists.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Notify invited members
    for mid in member_ids:
        await create_notification(
            db,
            user_id=mid,
            type="friend_request",  # reuse closest type
            from_user=current_user,
        )

    members_data = await _get_members(db, [owner_id] + member_ids)
    return _serialize(doc, members_data, [])


@router.get("/")
async def get_my_shared_watchlists(current_user=Depends(get_current_active_user)):
    db = get_db()
    uid = current_user["id"]
    # Lists where I'm owner OR member
    cursor = db.shared_watchlists.find({
        "$or": [{"owner_id": uid}, {"member_ids": uid}]
    }).sort("updated_at", -1)
    docs = await cursor.to_list(50)

    results = []
    for doc in docs:
        all_ids = list(set([doc["owner_id"]] + doc.get("member_ids", [])))
        members_data = await _get_members(db, all_ids)
        # Preview: first 4 poster paths
        preview = await _get_preview(db, doc.get("content_ids", []))
        s = _serialize(doc, members_data, [])
        s["preview_posters"] = preview
        results.append(s)
    return {"shared_watchlists": results}


@router.get("/{swl_id}")
async def get_shared_watchlist(
    swl_id: str,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    doc = await db.shared_watchlists.find_one({"_id": ObjectId(swl_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")

    uid = current_user["id"]
    if uid != doc["owner_id"] and uid not in doc.get("member_ids", []):
        raise HTTPException(status_code=403, detail="Not a member")

    all_ids = list(set([doc["owner_id"]] + doc.get("member_ids", [])))
    members_data = await _get_members(db, all_ids)
    content_data = await _get_content(db, doc.get("content_ids", []))
    return _serialize(doc, members_data, content_data)


@router.post("/{swl_id}/items")
async def add_item(
    swl_id: str,
    body: SharedWatchlistItemAdd,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    doc = await db.shared_watchlists.find_one({"_id": ObjectId(swl_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")

    uid = current_user["id"]
    if uid != doc["owner_id"] and uid not in doc.get("member_ids", []):
        raise HTTPException(status_code=403, detail="Not a member")

    if not await db.content.find_one({"_id": ObjectId(body.content_id)}):
        raise HTTPException(status_code=404, detail="Content not found")

    await db.shared_watchlists.update_one(
        {"_id": ObjectId(swl_id)},
        {
            "$addToSet": {"content_ids": body.content_id},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )
    return {"message": "Added"}


@router.delete("/{swl_id}/items/{content_id}")
async def remove_item(
    swl_id: str,
    content_id: str,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    doc = await db.shared_watchlists.find_one({"_id": ObjectId(swl_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")

    uid = current_user["id"]
    if uid != doc["owner_id"] and uid not in doc.get("member_ids", []):
        raise HTTPException(status_code=403, detail="Not a member")

    await db.shared_watchlists.update_one(
        {"_id": ObjectId(swl_id)},
        {
            "$pull": {"content_ids": content_id},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )
    return {"message": "Removed"}


@router.post("/{swl_id}/invite/{username}")
async def invite_member(
    swl_id: str,
    username: str,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    doc = await db.shared_watchlists.find_one({"_id": ObjectId(swl_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only owner can invite")

    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_id = str(user["_id"])
    await db.shared_watchlists.update_one(
        {"_id": ObjectId(swl_id)},
        {"$addToSet": {"member_ids": new_id}},
    )
    await create_notification(db, user_id=new_id, type="friend_request", from_user=current_user)
    return {"message": f"Invited {username}"}


@router.delete("/{swl_id}/members/{member_id}")
async def remove_member(
    swl_id: str,
    member_id: str,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    doc = await db.shared_watchlists.find_one({"_id": ObjectId(swl_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")

    uid = current_user["id"]
    # Owner can remove anyone; members can remove themselves
    if uid != doc["owner_id"] and uid != member_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.shared_watchlists.update_one(
        {"_id": ObjectId(swl_id)},
        {"$pull": {"member_ids": member_id}},
    )
    return {"message": "Removed"}


@router.delete("/{swl_id}", status_code=204)
async def delete_shared_watchlist(
    swl_id: str,
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    doc = await db.shared_watchlists.find_one({"_id": ObjectId(swl_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only owner can delete")
    await db.shared_watchlists.delete_one({"_id": ObjectId(swl_id)})


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_members(db, user_ids: list) -> list:
    result = []
    for uid in user_ids:
        try:
            u = await db.users.find_one({"_id": ObjectId(uid)})
            if u:
                result.append({
                    "id":           str(u["_id"]),
                    "username":     u["username"],
                    "display_name": u.get("display_name"),
                })
        except Exception:
            pass
    return result


async def _get_content(db, content_ids: list) -> list:
    result = []
    for cid in content_ids:
        try:
            c = await db.content.find_one({"_id": ObjectId(cid)})
            if c:
                result.append({
                    "id":          str(c["_id"]),
                    "title":       c.get("title"),
                    "poster_path": c.get("poster_path"),
                    "type":        c.get("type"),
                    "genres":      c.get("genres", []),
                    "vote_average":c.get("vote_average"),
                    "release_date":c.get("release_date"),
                })
        except Exception:
            pass
    return result


async def _get_preview(db, content_ids: list) -> list:
    posters = []
    for cid in content_ids[:4]:
        try:
            c = await db.content.find_one({"_id": ObjectId(cid)})
            if c and c.get("poster_path"):
                posters.append(c["poster_path"])
        except Exception:
            pass
    return posters