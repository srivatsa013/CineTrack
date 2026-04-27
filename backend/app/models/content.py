from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ContentType(str, Enum):
    movie = "movie"
    series = "series"
    anime = "anime"


class ContentBase(BaseModel):
    tmdb_id: int
    title: str
    original_title: Optional[str] = None
    type: ContentType
    overview: Optional[str] = None
    poster_path: Optional[str] = None
    backdrop_path: Optional[str] = None
    genres: List[str] = []
    genre_ids: List[int] = []
    release_date: Optional[str] = None
    vote_average: Optional[float] = None
    vote_count: Optional[int] = None
    popularity: Optional[float] = None
    original_language: Optional[str] = None
    platforms: List[str] = []       # OTT platforms (future JustWatch integration)
    keywords: List[str] = []        # Used for ML features
    cast: List[str] = []            # Top 5 cast names
    director: Optional[str] = None
    status: Optional[str] = None    # "Released", "Ended", "Ongoing"


class ContentInDB(ContentBase):
    """Full content document stored in MongoDB."""
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class ContentResponse(ContentBase):
    """Content returned via API, includes DB id."""
    id: str
    last_updated: datetime
    avg_user_rating: Optional[float] = None   # computed field from ratings
    user_rating_count: Optional[int] = None

    class Config:
        populate_by_name = True


class ContentSearchResult(BaseModel):
    """Lightweight content card for search / list views."""
    id: str
    tmdb_id: int
    title: str
    type: ContentType
    poster_path: Optional[str]
    release_date: Optional[str]
    genres: List[str] = []
    vote_average: Optional[float]
    avg_user_rating: Optional[float] = None