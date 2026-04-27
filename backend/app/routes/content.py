from fastapi import APIRouter, HTTPException, Query, Depends
from bson import ObjectId
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.services.tmdb_service import tmdb
from app.services.auth_service import get_current_active_user

router = APIRouter(prefix="/api/content", tags=["Content"])


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc["_id"])
    doc.pop("_id", None)
    return doc


def _build_card(doc: dict) -> dict:
    """Lightweight card for grids — only what the frontend needs."""
    return {
        "id":           str(doc["_id"]),
        "tmdb_id":      doc.get("tmdb_id"),
        "title":        doc.get("title"),
        "type":         doc.get("type"),
        "poster_path":  doc.get("poster_path"),
        "release_date": doc.get("release_date"),
        "genres":       doc.get("genres", []),
        "vote_average": doc.get("vote_average"),
    }


# ── Search ────────────────────────────────────────────────────────────────────

@router.get("/search")
async def search_content(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    _: dict = Depends(get_current_active_user),
):
    """
    Search TMDB. Uses lightweight normalisation from search results directly —
    no per-item detail calls. Fast.
    """
    db = get_db()
    raw = await tmdb.search_multi(q, page)
    results = []

    for item in raw.get("results", []):
        if item.get("media_type") not in ("movie", "tv"):
            continue

        tmdb_id = item["id"]

        # Check DB first (already stored)
        existing = await db.content.find_one({"tmdb_id": tmdb_id})
        if existing:
            results.append(_build_card(existing))
            continue

        # Normalise from search data — zero extra API calls
        doc = tmdb.normalize_from_search(item)
        doc["last_updated"] = datetime.utcnow()

        try:
            await db.content.update_one(
                {"tmdb_id": tmdb_id},
                {"$setOnInsert": doc},
                upsert=True,
            )
            stored = await db.content.find_one({"tmdb_id": tmdb_id})
            if stored:
                results.append(_build_card(stored))
        except Exception as e:
            # Still return a card even if DB write fails
            results.append({
                "id":           f"tmdb_{tmdb_id}",
                "tmdb_id":      tmdb_id,
                "title":        doc.get("title"),
                "type":         doc.get("type"),
                "poster_path":  doc.get("poster_path"),
                "release_date": doc.get("release_date"),
                "genres":       doc.get("genres", []),
                "vote_average": doc.get("vote_average"),
            })

    return {
        "results":       results,
        "total_results": raw.get("total_results", 0),
        "page":          page,
        "total_pages":   raw.get("total_pages", 0),
    }


# ── Trending ──────────────────────────────────────────────────────────────────

@router.get("/trending")
async def get_trending(
    type: Optional[str] = Query("all", regex="^(all|movie|tv)$"),
    _: dict = Depends(get_current_active_user),
):
    db = get_db()
    raw = await tmdb.get_trending(type)
    results = []

    for item in raw.get("results", []):
        media_type = item.get("media_type", type)
        if media_type not in ("movie", "tv"):
            continue

        tmdb_id = item["id"]
        existing = await db.content.find_one({"tmdb_id": tmdb_id})
        if existing:
            results.append(_build_card(existing))
            continue

        doc = tmdb.normalize_from_search(item)
        doc["last_updated"] = datetime.utcnow()
        try:
            await db.content.update_one(
                {"tmdb_id": tmdb_id}, {"$setOnInsert": doc}, upsert=True
            )
            stored = await db.content.find_one({"tmdb_id": tmdb_id})
            if stored:
                results.append(_build_card(stored))
        except Exception:
            continue

    return {"results": results}


# ── Single content detail ─────────────────────────────────────────────────────

@router.get("/{content_id}")
async def get_content(content_id: str, _: dict = Depends(get_current_active_user)):
    """
    Returns full content details. If this content hasn't had its full
    details fetched yet (cast, keywords, director), fetches them now.
    This is the ONE place we make a TMDB detail call, and only once per item.
    """
    db = get_db()

    if not ObjectId.is_valid(content_id):
        raise HTTPException(status_code=400, detail="Invalid content ID")

    doc = await db.content.find_one({"_id": ObjectId(content_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")

    # Fetch full details if we only have the lightweight search version
    if not doc.get("detail_fetched") and doc.get("tmdb_id"):
        try:
            if doc["type"] == "movie":
                details = await tmdb.get_movie_details(doc["tmdb_id"])
                full = tmdb.normalize_movie(details)
            else:
                details = await tmdb.get_tv_details(doc["tmdb_id"])
                full = tmdb.normalize_tv(details, is_anime=doc["type"] == "anime")

            # Update DB with the full data
            await db.content.update_one(
                {"_id": ObjectId(content_id)},
                {"$set": {**full, "last_updated": datetime.utcnow()}}
            )
            doc = await db.content.find_one({"_id": ObjectId(content_id)})
        except Exception as e:
            # Return what we have if TMDB call fails
            pass

    # Aggregate ratings
    pipeline = [
        {"$match": {"content_id": content_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    agg = await db.ratings.aggregate(pipeline).to_list(1)
    avg   = round(agg[0]["avg"], 1) if agg else None
    count = agg[0]["count"] if agg else 0

    result = _serialize(doc)
    result["avg_user_rating"]    = avg
    result["user_rating_count"]  = count
    return result