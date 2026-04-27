from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class RatingCreate(BaseModel):
    content_id: str
    rating: float = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    review: Optional[str] = Field(None, max_length=2000)
    contains_spoiler: bool = False


class RatingUpdate(BaseModel):
    rating: Optional[float] = Field(None, ge=1, le=10)
    review: Optional[str] = Field(None, max_length=2000)
    contains_spoiler: Optional[bool] = None


class RatingInDB(BaseModel):
    """Rating document stored in MongoDB."""
    user_id: str
    content_id: str
    rating: float
    review: Optional[str] = None
    contains_spoiler: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class RatingResponse(BaseModel):
    id: str
    user_id: str
    content_id: str
    rating: float
    review: Optional[str]
    contains_spoiler: bool
    created_at: datetime
    updated_at: datetime
    # Populated fields
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    content_title: Optional[str] = None
    content_poster: Optional[str] = None

    class Config:
        populate_by_name = True