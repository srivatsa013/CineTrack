from fastapi import APIRouter, Depends
from bson import ObjectId
from datetime import datetime

from app.database import get_db
from app.services.auth_service import get_current_active_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/")
async def get_notifications(current_user=Depends(get_current_active_user)):
    db = get_db()
    docs = await db.notifications.find(
        {"user_id": current_user["id"]}
    ).sort("created_at", -1).limit(50).to_list(50)

    return {
        "notifications": [_serialize(n) for n in docs],
        "unread_count": sum(1 for n in docs if not n.get("read")),
    }


@router.post("/read-all")
async def mark_all_read(current_user=Depends(get_current_active_user)):
    db = get_db()
    await db.notifications.update_many(
        {"user_id": current_user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}


@router.post("/{notif_id}/read")
async def mark_read(notif_id: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    await db.notifications.update_one(
        {"_id": ObjectId(notif_id), "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}


@router.delete("/{notif_id}")
async def delete_notification(notif_id: str, current_user=Depends(get_current_active_user)):
    db = get_db()
    await db.notifications.delete_one(
        {"_id": ObjectId(notif_id), "user_id": current_user["id"]}
    )
    return {"message": "Deleted"}


# ── Helper used by other routes to fire notifications ─────────────────────────

async def create_notification(db, *, user_id: str, type: str, from_user: dict,
                               content: dict = None, rating: float = None):
    """Fire-and-forget notification creation. Call from social/ratings routes."""
    try:
        doc = {
            "user_id": user_id,
            "type": type,
            "from_user_id": from_user.get("id") or str(from_user.get("_id")),
            "from_username": from_user.get("username"),
            "from_display_name": from_user.get("display_name"),
            "content_id": str(content["_id"]) if content else None,
            "content_title": content.get("title") if content else None,
            "content_poster": content.get("poster_path") if content else None,
            "rating": rating,
            "read": False,
            "created_at": datetime.utcnow(),
        }
        await db.notifications.insert_one(doc)
    except Exception:
        pass  # never fail the parent operation


def _serialize(n: dict) -> dict:
    return {
        "id": str(n["_id"]),
        "user_id": n["user_id"],
        "type": n["type"],
        "from_user_id": n["from_user_id"],
        "from_username": n.get("from_username"),
        "from_display_name": n.get("from_display_name"),
        "content_id": n.get("content_id"),
        "content_title": n.get("content_title"),
        "content_poster": n.get("content_poster"),
        "rating": n.get("rating"),
        "read": n.get("read", False),
        "created_at": n.get("created_at"),
    }