from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SharedWatchlistCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=300)
    invite_usernames: List[str] = []


class SharedWatchlistUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=300)


class SharedWatchlistItemAdd(BaseModel):
    content_id: str
    note: Optional[str] = Field(None, max_length=300)


class SharedWatchlistInDB(BaseModel):
    name: str
    description: Optional[str] = None
    owner_id: str
    member_ids: List[str] = []
    content_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)