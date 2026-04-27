from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class NotificationType(str, Enum):
    friend_request = "friend_request"
    friend_accepted = "friend_accepted"
    friend_rated = "friend_rated"


class NotificationInDB(BaseModel):
    user_id: str
    type: NotificationType
    from_user_id: str
    from_username: str
    from_display_name: Optional[str] = None
    content_id: Optional[str] = None
    content_title: Optional[str] = None
    content_poster: Optional[str] = None
    rating: Optional[float] = None
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)