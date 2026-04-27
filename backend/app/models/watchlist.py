from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId


class WatchStatus(str, Enum):
    plan_to_watch = "plan_to_watch"
    watching = "watching"
    completed = "completed"
    dropped = "dropped"
    on_hold = "on_hold"


class EpisodeNote(BaseModel):
    note_id: str = Field(default_factory=lambda: str(ObjectId()))
    episode_ref: str = Field(..., max_length=100)
    description: str = Field(..., max_length=1000)
    episode_rating: Optional[float] = Field(None, ge=1, le=5)
    watched_on: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EpisodeNoteCreate(BaseModel):
    episode_ref: str = Field(..., max_length=100)
    description: str = Field(..., max_length=1000)
    episode_rating: Optional[float] = Field(None, ge=1, le=5)
    watched_on: Optional[str] = None


class WatchlistAdd(BaseModel):
    content_id: str
    status: WatchStatus = WatchStatus.plan_to_watch
    notes: Optional[str] = Field(None, max_length=500)
    rewatch_count: int = Field(0, ge=0)
    progress: Optional[int] = Field(None, ge=0)
    started_date: Optional[str] = None
    finished_date: Optional[str] = None


class WatchlistUpdate(BaseModel):
    status: Optional[WatchStatus] = None
    notes: Optional[str] = Field(None, max_length=500)
    rewatch_count: Optional[int] = Field(None, ge=0)
    progress: Optional[int] = Field(None, ge=0)
    started_date: Optional[str] = None
    finished_date: Optional[str] = None


class WatchlistInDB(BaseModel):
    user_id: str
    content_id: str
    status: WatchStatus = WatchStatus.plan_to_watch
    notes: Optional[str] = None
    rewatch_count: int = 0
    progress: Optional[int] = None
    started_date: Optional[str] = None
    finished_date: Optional[str] = None
    episode_notes: List[EpisodeNote] = []
    added_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class WatchHistoryInDB(BaseModel):
    user_id: str
    content_id: str
    watched_date: datetime = Field(default_factory=datetime.utcnow)
    rewatch: bool = False
    rewatch_count: int = 0