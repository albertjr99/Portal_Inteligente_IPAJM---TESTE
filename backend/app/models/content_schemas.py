from pydantic import BaseModel
from typing import Optional, List

class EventBase(BaseModel):
    title: str
    date: str
    time: Optional[str] = None
    description: str
    type: str
    sectors: Optional[List[str]] = None
    owner_username: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: int
    class Config:
        from_attributes = True

class AnnouncementBase(BaseModel):
    title: str
    content: str
    date: str
    priority: str
    author: str
    sectors: Optional[List[str]] = None

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementResponse(AnnouncementBase):
    id: int
    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    title: str
    description: str
    category: str
    url: str
    uploadDate: str
    size: str
    sectors: Optional[List[str]] = None

class DocumentCreate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    id: int
    class Config:
        from_attributes = True
