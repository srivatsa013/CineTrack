from fastapi import APIRouter, Depends, Query
from bson import ObjectId
from datetime import datetime
from collections import defaultdict

from app.database import get_db
from app.services.auth_service import get_current_active_user

router = APIRouter(prefix="/api/stats", tags=["Stats"])

MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]


@router.get("/year-in-review")
async def year_in_review(
    year: int = Query(default=None),
    current_user=Depends(get_current_active_user),
):
    db = get_db()
    user_id = current_user["id"]

    # Default to current year
    if not year:
        year = datetime.utcnow().year

    year_start = datetime(year, 1, 1)
    year_end   = datetime(year + 1, 1, 1)

    # Fetch all ratings in the year
    ratings = await db.ratings.find({
        "user_id": user_id,
        "updated_at": {"$gte": year_start, "$lt": year_end},
    }).to_list(10000)

    if not ratings:
        return {"year": year, "empty": True}

    # Enrich with content data
    content_cache = {}
    async def get_content(cid):
        if cid not in content_cache:
            try:
                c = await db.content.find_one({"_id": ObjectId(cid)})
                content_cache[cid] = c
            except Exception:
                content_cache[cid] = None
        return content_cache[cid]

    enriched = []
    for r in ratings:
        c = await get_content(r["content_id"])
        enriched.append({"rating": r, "content": c})

    total_titles = len(enriched)

    # ── Genre stats ───────────────────────────────────────────────────────────
    genre_count  = defaultdict(int)
    genre_rating = defaultdict(list)
    for e in enriched:
        c = e["content"]
        if c:
            for g in c.get("genres", []):
                genre_count[g]  += 1
                genre_rating[g].append(e["rating"]["rating"])

    top_genres = sorted(genre_count.items(), key=lambda x: x[1], reverse=True)[:5]
    top_genres = [
        {"genre": g, "count": cnt, "avg_rating": round(sum(genre_rating[g]) / len(genre_rating[g]), 1)}
        for g, cnt in top_genres
    ]

    # ── Monthly activity ──────────────────────────────────────────────────────
    monthly = defaultdict(int)
    for e in enriched:
        d = e["rating"].get("updated_at")
        if d:
            monthly[d.month] += 1

    monthly_data = [{"month": MONTH_NAMES[m-1], "count": monthly.get(m, 0)} for m in range(1, 13)]
    most_active_month_num = max(monthly, key=monthly.get) if monthly else None
    most_active_month = MONTH_NAMES[most_active_month_num - 1] if most_active_month_num else None

    # ── Rating distribution ───────────────────────────────────────────────────
    rating_dist = defaultdict(int)
    for e in enriched:
        r = int(e["rating"]["rating"])
        rating_dist[r] += 1
    rating_distribution = [{"rating": i, "count": rating_dist.get(i, 0)} for i in range(1, 6)]

    # ── Highest rated ─────────────────────────────────────────────────────────
    top_rated = sorted(enriched, key=lambda x: x["rating"]["rating"], reverse=True)[:5]
    top_rated_list = []
    for e in top_rated:
        c = e["content"]
        if c:
            top_rated_list.append({
                "content_id":   str(c["_id"]),
                "title":        c.get("title"),
                "poster_path":  c.get("poster_path"),
                "type":         c.get("type"),
                "rating":       e["rating"]["rating"],
            })

    # ── Average rating ────────────────────────────────────────────────────────
    avg_rating = round(sum(e["rating"]["rating"] for e in enriched) / len(enriched), 1)

    # ── Content type breakdown ────────────────────────────────────────────────
    type_count = defaultdict(int)
    for e in enriched:
        c = e["content"]
        if c:
            type_count[c.get("type", "unknown")] += 1

    # ── Most rewatched ────────────────────────────────────────────────────────
    history = await db.watch_history.find({
        "user_id": user_id,
        "watched_date": {"$gte": year_start, "$lt": year_end},
        "rewatch_count": {"$gt": 0},
    }).sort("rewatch_count", -1).limit(3).to_list(3)

    most_rewatched = []
    for h in history:
        c = await get_content(h["content_id"])
        if c:
            most_rewatched.append({
                "content_id":    h["content_id"],
                "title":         c.get("title"),
                "poster_path":   c.get("poster_path"),
                "rewatch_count": h.get("rewatch_count", 0),
            })

    # ── First and last watched ────────────────────────────────────────────────
    sorted_by_date = sorted(
        [e for e in enriched if e["rating"].get("updated_at")],
        key=lambda x: x["rating"]["updated_at"]
    )
    first_watch = None
    last_watch  = None
    if sorted_by_date:
        c = sorted_by_date[0]["content"]
        if c:
            first_watch = {"title": c.get("title"), "poster_path": c.get("poster_path"),
                           "date": sorted_by_date[0]["rating"]["updated_at"].strftime("%b %d")}
        c = sorted_by_date[-1]["content"]
        if c:
            last_watch = {"title": c.get("title"), "poster_path": c.get("poster_path"),
                          "date": sorted_by_date[-1]["rating"]["updated_at"].strftime("%b %d")}

    return {
        "year":                 year,
        "empty":                False,
        "total_titles":         total_titles,
        "avg_rating":           avg_rating,
        "top_genres":           top_genres,
        "monthly_activity":     monthly_data,
        "most_active_month":    most_active_month,
        "rating_distribution":  rating_distribution,
        "top_rated":            top_rated_list,
        "type_breakdown":       dict(type_count),
        "most_rewatched":       most_rewatched,
        "first_watch":          first_watch,
        "last_watch":           last_watch,
    }