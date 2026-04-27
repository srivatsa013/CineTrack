import httpx
import asyncio
import time
import logging
from typing import Dict, Optional
from app.config import settings

logger = logging.getLogger(__name__)

ANIME_GENRE_ID = 16

# ── Simple in-memory TTL cache ────────────────────────────────────────────────
# Avoids re-hitting TMDB for the same content within the TTL window
_cache: Dict[str, tuple] = {}  # key → (data, expires_at)
CACHE_TTL = 60 * 60  # 1 hour

def _cache_get(key: str):
    entry = _cache.get(key)
    if entry and time.time() < entry[1]:
        return entry[0]
    return None

def _cache_set(key: str, data):
    _cache[key] = (data, time.time() + CACHE_TTL)
    # Simple eviction: if cache grows too large, drop oldest 20%
    if len(_cache) > 2000:
        cutoff = time.time()
        expired = [k for k, (_, exp) in _cache.items() if exp < cutoff]
        for k in expired[:400]:
            _cache.pop(k, None)


# ── Persistent client (reuses TCP connections) ────────────────────────────────
_client: Optional[httpx.AsyncClient] = None

def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            headers={"accept": "application/json"},
        )
    return _client


class TMDBService:
    def __init__(self):
        self.base_url = settings.TMDB_BASE_URL
        self.api_key  = settings.TMDB_API_KEY

    def _params(self, extra: Dict = None) -> Dict:
        p = {"api_key": self.api_key, "language": "en-US"}
        if extra:
            p.update(extra)
        return p

    async def _get(self, url: str, params: Dict, cache_key: str = None) -> Dict:
        """Single GET with caching and retry."""
        if cache_key:
            cached = _cache_get(cache_key)
            if cached is not None:
                return cached

        client = get_client()
        for attempt in range(2):
            try:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
                if cache_key:
                    _cache_set(cache_key, data)
                return data
            except (httpx.TimeoutException, httpx.NetworkError) as e:
                if attempt == 1:
                    raise
                await asyncio.sleep(0.5)

    async def search_multi(self, query: str, page: int = 1) -> Dict:
        """
        Returns raw TMDB search results.
        We normalise directly from this — NO per-item detail calls.
        """
        return await self._get(
            f"{self.base_url}/search/multi",
            self._params({"query": query, "page": page, "include_adult": False}),
            cache_key=f"search:{query}:{page}",
        )

    async def get_movie_details(self, tmdb_id: int) -> Dict:
        """Full details — only called when a user opens a content page."""
        return await self._get(
            f"{self.base_url}/movie/{tmdb_id}",
            self._params({"append_to_response": "credits,keywords"}),
            cache_key=f"movie:{tmdb_id}",
        )

    async def get_tv_details(self, tmdb_id: int) -> Dict:
        """Full details — only called when a user opens a content page."""
        return await self._get(
            f"{self.base_url}/tv/{tmdb_id}",
            self._params({"append_to_response": "credits,keywords"}),
            cache_key=f"tv:{tmdb_id}",
        )

    async def get_trending(self, media_type: str = "all", time_window: str = "week") -> Dict:
        return await self._get(
            f"{self.base_url}/trending/{media_type}/{time_window}",
            self._params(),
            cache_key=f"trending:{media_type}:{time_window}",
        )

    async def discover_anime(self, page: int = 1) -> Dict:
        return await self._get(
            f"{self.base_url}/discover/tv",
            self._params({
                "with_genres": ANIME_GENRE_ID,
                "with_original_language": "ja",
                "sort_by": "popularity.desc",
                "page": page,
            }),
            cache_key=f"anime:{page}",
        )

    # ── Normalizers ───────────────────────────────────────────────────────────

    def normalize_from_search(self, item: Dict) -> Dict:
        """
        Fast normalizer — uses only data already in the TMDB search result.
        No extra API calls. Genres come as IDs; we convert to names using
        the static map below.
        """
        media_type = item.get("media_type", "movie")
        is_tv      = media_type == "tv"
        lang       = item.get("original_language", "")
        genre_ids  = item.get("genre_ids", [])
        genres     = [GENRE_MAP.get(gid, "") for gid in genre_ids if gid in GENRE_MAP]

        # Detect anime: animation genre + Japanese
        content_type = "movie"
        if is_tv:
            content_type = "anime" if (ANIME_GENRE_ID in genre_ids and lang == "ja") else "series"

        return {
            "tmdb_id":           item["id"],
            "title":             item.get("title") or item.get("name", ""),
            "original_title":    item.get("original_title") or item.get("original_name"),
            "type":              content_type,
            "overview":          item.get("overview"),
            "poster_path":       item.get("poster_path"),
            "backdrop_path":     item.get("backdrop_path"),
            "genres":            genres,
            "genre_ids":         genre_ids,
            "release_date":      item.get("release_date") or item.get("first_air_date"),
            "vote_average":      item.get("vote_average"),
            "vote_count":        item.get("vote_count"),
            "popularity":        item.get("popularity"),
            "original_language": lang,
            "keywords":          [],   # populated on first detail-page visit
            "cast":              [],   # populated on first detail-page visit
            "director":          None, # populated on first detail-page visit
            "status":            None,
            "platforms":         [],
            "detail_fetched":    False,
        }

    def normalize_movie(self, data: Dict) -> Dict:
        """Full normalizer — used when fetching detail page."""
        genres   = [g["name"] for g in data.get("genres", [])]
        credits  = data.get("credits", {})
        cast     = [m["name"] for m in credits.get("cast", [])[:5]]
        director = next((m["name"] for m in credits.get("crew", []) if m["job"] == "Director"), None)
        keywords = [k["name"] for k in data.get("keywords", {}).get("keywords", [])]

        return {
            "tmdb_id":           data["id"],
            "title":             data.get("title", ""),
            "original_title":    data.get("original_title"),
            "type":              "movie",
            "overview":          data.get("overview"),
            "poster_path":       data.get("poster_path"),
            "backdrop_path":     data.get("backdrop_path"),
            "genres":            genres,
            "genre_ids":         [g["id"] for g in data.get("genres", [])],
            "release_date":      data.get("release_date"),
            "vote_average":      data.get("vote_average"),
            "vote_count":        data.get("vote_count"),
            "popularity":        data.get("popularity"),
            "original_language": data.get("original_language"),
            "keywords":          keywords,
            "cast":              cast,
            "director":          director,
            "status":            data.get("status"),
            "platforms":         [],
            "detail_fetched":    True,
        }

    def normalize_tv(self, data: Dict, is_anime: bool = False) -> Dict:
        """Full normalizer — used when fetching detail page."""
        genres   = [g["name"] for g in data.get("genres", [])]
        credits  = data.get("credits", {})
        cast     = [m["name"] for m in credits.get("cast", [])[:5]]
        keywords = [k["name"] for k in data.get("keywords", {}).get("results", [])]

        return {
            "tmdb_id":           data["id"],
            "title":             data.get("name", ""),
            "original_title":    data.get("original_name"),
            "type":              "anime" if is_anime else "series",
            "overview":          data.get("overview"),
            "poster_path":       data.get("poster_path"),
            "backdrop_path":     data.get("backdrop_path"),
            "genres":            genres,
            "genre_ids":         [g["id"] for g in data.get("genres", [])],
            "release_date":      data.get("first_air_date"),
            "vote_average":      data.get("vote_average"),
            "vote_count":        data.get("vote_count"),
            "popularity":        data.get("popularity"),
            "original_language": data.get("original_language"),
            "keywords":          keywords,
            "cast":              cast,
            "director":          None,
            "status":            data.get("status"),
            "platforms":         [],
            "detail_fetched":    True,
        }

    def is_anime(self, data: Dict) -> bool:
        genre_ids = [g["id"] for g in data.get("genres", [])]
        return ANIME_GENRE_ID in genre_ids and data.get("original_language") == "ja"


# ── Static TMDB genre ID → name map ──────────────────────────────────────────
# Avoids an extra API call just to resolve genre names on search results
GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
    9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
    53: "Thriller", 10752: "War", 37: "Western",
    # TV-specific
    10759: "Action & Adventure", 10762: "Kids", 10763: "News",
    10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap",
    10767: "Talk", 10768: "War & Politics",
}

tmdb = TMDBService()