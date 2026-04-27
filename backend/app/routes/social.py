from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from datetime import datetime

from app.database import get_db
from app.services.auth_service import get_current_active_user
from app.routes.notifications import create_notification

router = APIRouter(prefix="/api/social", tags=["Social"])


@router.post("/friends/request/{target_username}")
async def send_friend_request(target_username: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    target = await db.users.find_one({"username": target_username})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target_id = str(target["_id"])
    my_id = current_user["id"]
    if target_id == my_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    if my_id in target.get("friends", []):
        raise HTTPException(status_code=400, detail="Already friends")
    if my_id in target.get("friend_requests", []):
        raise HTTPException(status_code=400, detail="Request already sent")
    await db.users.update_one({"_id": ObjectId(target_id)}, {"$addToSet": {"friend_requests": my_id}})
    await create_notification(db, user_id=target_id, type="friend_request", from_user=current_user)
    return {"message": f"Friend request sent to {target_username}"}


@router.post("/friends/accept/{requester_id}")
async def accept_friend_request(requester_id: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    my_id = current_user["id"]
    if requester_id not in current_user.get("friend_requests", []):
        raise HTTPException(status_code=400, detail="No such friend request")
    await db.users.update_one({"_id": ObjectId(my_id)},
        {"$addToSet": {"friends": requester_id}, "$pull": {"friend_requests": requester_id}})
    await db.users.update_one({"_id": ObjectId(requester_id)}, {"$addToSet": {"friends": my_id}})
    requester = await db.users.find_one({"_id": ObjectId(requester_id)})
    if requester:
        await create_notification(db, user_id=requester_id, type="friend_accepted", from_user=current_user)
    return {"message": "Friend request accepted"}


@router.delete("/friends/{friend_id}")
async def remove_friend(friend_id: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    my_id = current_user["id"]
    await db.users.update_one({"_id": ObjectId(my_id)}, {"$pull": {"friends": friend_id}})
    await db.users.update_one({"_id": ObjectId(friend_id)}, {"$pull": {"friends": my_id}})
    return {"message": "Friend removed"}


@router.get("/friends")
async def get_friends(current_user=Depends(get_current_active_user)):
    db = get_db()
    friend_ids = [ObjectId(f) for f in current_user.get("friends", []) if ObjectId.is_valid(f)]
    friends = await db.users.find({"_id": {"$in": friend_ids}}).to_list(100)
    return [{"id": str(f["_id"]), "username": f["username"],
             "display_name": f.get("display_name"), "avatar_url": f.get("avatar_url")} for f in friends]


@router.get("/feed")
async def get_activity_feed(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50),
    current_user=Depends(get_current_active_user)):
    db = get_db()
    user_id = current_user["id"]
    visible = list(set([user_id] + current_user.get("friends", [])))
    skip = (page - 1) * limit
    cursor = db.ratings.find({"user_id": {"$in": visible}}).sort("updated_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    total = await db.ratings.count_documents({"user_id": {"$in": visible}})
    results = []
    for r in docs:
        author = await db.users.find_one({"_id": ObjectId(r["user_id"])})
        content = await db.content.find_one({"_id": ObjectId(r["content_id"])})
        results.append({
            "id": str(r["_id"]), "type": "rating", "user_id": r["user_id"],
            "username": author.get("username") if author else None,
            "display_name": author.get("display_name") if author else None,
            "content_id": r["content_id"],
            "content_title": content.get("title") if content else None,
            "content_poster": content.get("poster_path") if content else None,
            "content_type": content.get("type") if content else None,
            "rating": r["rating"], "review": r.get("review"), "timestamp": r.get("updated_at"),
        })
    return {"feed": results, "total": total, "page": page}


@router.get("/compare/{friend_id}")
async def compare_ratings(friend_id: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    my_id = current_user["id"]
    if friend_id not in current_user.get("friends", []):
        raise HTTPException(status_code=403, detail="Not your friend")
    my_ratings = {r["content_id"]: r async for r in db.ratings.find({"user_id": my_id})}
    friend_ratings = {r["content_id"]: r async for r in db.ratings.find({"user_id": friend_id})}
    common = set(my_ratings.keys()) & set(friend_ratings.keys())
    results = []
    for cid in common:
        content = await db.content.find_one({"_id": ObjectId(cid)})
        results.append({
            "content_id": cid,
            "content_title": content.get("title") if content else None,
            "content_poster": content.get("poster_path") if content else None,
            "my_rating": my_ratings[cid]["rating"],
            "friend_rating": friend_ratings[cid]["rating"],
            "difference": abs(my_ratings[cid]["rating"] - friend_ratings[cid]["rating"]),
        })
    results.sort(key=lambda x: x["difference"])
    return {"comparisons": results, "total_common": len(results)}