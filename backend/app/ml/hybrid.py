import logging
import asyncio
from typing import List, Dict, Optional
from bson import ObjectId

from app.ml.content_based import content_filter
from app.ml.collaborative import collab_filter

logger = logging.getLogger(__name__)

WEIGHTS_COLD   = (1.0, 0.0)
WEIGHTS_MEDIUM = (0.8, 0.2)
WEIGHTS_WARM   = (0.7, 0.3)
MIN_RATING_FOR_LIKED = 4.0


def _get_weights(n_ratings: int):
    if n_ratings < 5:
        return WEIGHTS_COLD
    elif n_ratings < 15:
        return WEIGHTS_MEDIUM
    else:
        return WEIGHTS_WARM


async def train_models(db):
    logger.info("Training ML models...")
    content_docs = await db.content.find({}).to_list(length=50000)
    ratings = await db.ratings.find({}).to_list(length=500000)
    ratings_simple = [{"user_id": r["user_id"], "content_id": r["content_id"], "rating": r["rating"]} for r in ratings]

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, content_filter.fit, content_docs)
    await loop.run_in_executor(None, collab_filter.fit, ratings_simple)
    logger.info("ML models trained successfully.")


async def get_recommendations(
    user_id: str,
    db,
    top_n: int = 20,
    content_type: Optional[str] = None,
    genre_weights: Optional[Dict[str, float]] = None,
    extra_exclude: Optional[List[str]] = None,
) -> List[Dict]:
    watched = await db.watch_history.find({"user_id": user_id}).to_list(10000)
    watchlisted = await db.watchlist.find({"user_id": user_id}).to_list(10000)
    rated = await db.ratings.find({"user_id": user_id}).to_list(10000)

    exclude_ids = list({
        *[r["content_id"] for r in watched],
        *[w["content_id"] for w in watchlisted],
        *[r["content_id"] for r in rated],
        *(extra_exclude or []),
    })

    liked_ids = [r["content_id"] for r in rated if r["rating"] >= MIN_RATING_FOR_LIKED]
    n_ratings = len(rated)
    cb_weight, cf_weight = _get_weights(n_ratings)

    all_content = await db.content.find({}).to_list(50000)
    content_docs_map = {str(c["_id"]): c for c in all_content}

    fetch_n = top_n * 3
    cb_results: Dict[str, float] = {}
    if liked_ids and content_filter._fitted:
        cb_raw = content_filter.recommend(
            liked_content_ids=liked_ids, exclude_ids=exclude_ids,
            top_n=fetch_n, content_type_filter=content_type, content_docs_map=content_docs_map,
        )
        if cb_raw:
            max_score = max(r["score"] for r in cb_raw) or 1
            cb_results = {r["content_id"]: r["score"] / max_score for r in cb_raw}

    cf_results: Dict[str, float] = {}
    if collab_filter._fitted and cf_weight > 0:
        cf_raw = collab_filter.recommend(user_id=user_id, exclude_ids=exclude_ids, top_n=fetch_n)
        if cf_raw:
            max_score = max(r["score"] for r in cf_raw) or 1
            cf_results = {r["content_id"]: r["score"] / max_score for r in cf_raw}

    all_cids = set(cb_results.keys()) | set(cf_results.keys())
    merged: List[Dict] = []

    for cid in all_cids:
        cb_score = cb_results.get(cid, 0.0)
        cf_score = cf_results.get(cid, 0.0)
        hybrid_score = cb_weight * cb_score + cf_weight * cf_score

        if content_type:
            doc = content_docs_map.get(cid, {})
            if doc.get("type") != content_type:
                continue

        # Apply genre weight multiplier
        if genre_weights:
            doc = content_docs_map.get(cid, {})
            genres = doc.get("genres", [])
            multiplier = 1.0
            for genre in genres:
                gw = genre_weights.get(genre)
                if gw is not None:
                    multiplier = max(multiplier, float(gw))
            hybrid_score *= multiplier

        merged.append({"content_id": cid, "score": hybrid_score, "cb_score": cb_score, "cf_score": cf_score})

    merged.sort(key=lambda x: x["score"], reverse=True)

    results = []
    for item in merged[:top_n]:
        doc = content_docs_map.get(item["content_id"])
        if not doc:
            continue
        results.append({
            "id": item["content_id"],
            "tmdb_id": doc.get("tmdb_id"),
            "title": doc.get("title"),
            "type": doc.get("type"),
            "poster_path": doc.get("poster_path"),
            "genres": doc.get("genres", []),
            "vote_average": doc.get("vote_average"),
            "release_date": doc.get("release_date"),
            "recommendation_score": round(item["score"], 4),
        })
    return results


async def get_similar_content(content_id: str, db, top_n: int = 10) -> List[Dict]:
    similar = content_filter.get_similar(content_id, top_n=top_n * 2)
    results = []
    for item in similar[:top_n]:
        doc = await db.content.find_one({"_id": ObjectId(item["content_id"])})
        if not doc:
            continue
        results.append({
            "id": str(doc["_id"]), "title": doc.get("title"), "type": doc.get("type"),
            "poster_path": doc.get("poster_path"), "genres": doc.get("genres", []),
            "vote_average": doc.get("vote_average"), "similarity_score": round(item["score"], 4),
        })
    return results