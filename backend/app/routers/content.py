import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.db_models import Event, Announcement, Document, User
from app.models.content_schemas import (
    EventCreate, EventResponse,
    AnnouncementCreate, AnnouncementResponse,
    DocumentCreate, DocumentResponse
)
from app.services.token_service import get_current_user, get_current_super_admin

router = APIRouter(prefix="/content", tags=["Content"])

# AUXILIARES PARA PROCESSAR SETORES
def parse_sectors(sectors_str):
    if not sectors_str:
        return []
    try:
        return json.loads(sectors_str)
    except:
        return sectors_str.split(",")

def serialize_sectors(sectors_list):
    if not sectors_list:
        return None
    return json.dumps(sectors_list)

# --- EVENTOS ---
@router.get("/events", response_model=List[EventResponse])
def get_events(db: Session = Depends(get_db)):
    events = db.query(Event).filter(Event.owner_username.is_(None)).all()
    results = []
    for e in events:
        data = e.__dict__.copy()
        data["sectors"] = parse_sectors(e.sectors)
        results.append(data)
    return results

@router.post("/events", response_model=EventResponse, dependencies=[Depends(get_current_user)])
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    data = event.model_dump()
    data["sectors"] = serialize_sectors(data.get("sectors"))
    new_event = Event(**data)
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    resp = new_event.__dict__.copy()
    resp["sectors"] = parse_sectors(resp["sectors"])
    return resp

# --- EVENTOS PESSOAIS ---
@router.get("/personal-events", response_model=List[EventResponse])
def get_personal_events(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    events = db.query(Event).filter(Event.owner_username == current_user["username"]).all()
    results = []
    for e in events:
        data = e.__dict__.copy()
        data["sectors"] = parse_sectors(e.sectors)
        results.append(data)
    return results

@router.post("/personal-events", response_model=EventResponse)
def create_personal_event(event: EventCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = event.model_dump()
    data["owner_username"] = current_user["username"]
    data["sectors"] = serialize_sectors(["personal"])
    new_event = Event(**data)
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    resp = new_event.__dict__.copy()
    resp["sectors"] = parse_sectors(resp["sectors"])
    return resp

@router.put("/personal-events/{event_id}", response_model=EventResponse)
def update_personal_event(event_id: int, event: EventCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_event = db.query(Event).filter(Event.id == event_id, Event.owner_username == current_user["username"]).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Lembrete não encontrado ou acesso negado")
    
    data = event.model_dump()
    db_event.title = data["title"]
    db_event.date = data["date"]
    db_event.time = data.get("time")
    db_event.description = data["description"]
    db_event.type = data["type"]
    
    db.commit()
    db.refresh(db_event)
    resp = db_event.__dict__.copy()
    resp["sectors"] = parse_sectors(resp["sectors"])
    return resp

@router.delete("/personal-events/{event_id}")
def delete_personal_event(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_event = db.query(Event).filter(Event.id == event_id, Event.owner_username == current_user["username"]).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Lembrete não encontrado ou acesso negado")
    
    db.delete(db_event)
    db.commit()
    return {"detail": "Lembrete excluído com sucesso"}

# --- ANÚNCIOS ---
@router.get("/announcements", response_model=List[AnnouncementResponse])
def get_announcements(db: Session = Depends(get_db)):
    announcements = db.query(Announcement).all()
    results = []
    for a in announcements:
        data = a.__dict__.copy()
        data["sectors"] = parse_sectors(a.sectors)
        results.append(data)
    return results

@router.post("/announcements", response_model=AnnouncementResponse, dependencies=[Depends(get_current_user)])
def create_announcement(announcement: AnnouncementCreate, db: Session = Depends(get_db)):
    data = announcement.model_dump()
    data["sectors"] = serialize_sectors(data.get("sectors"))
    new_announcement = Announcement(**data)
    db.add(new_announcement)
    db.commit()
    db.refresh(new_announcement)
    resp = new_announcement.__dict__.copy()
    resp["sectors"] = parse_sectors(resp["sectors"])
    return resp

# --- DOCUMENTOS ---
@router.get("/documents", response_model=List[DocumentResponse])
def get_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).all()
    results = []
    for d in docs:
        data = d.__dict__.copy()
        data["sectors"] = parse_sectors(d.sectors)
        results.append(data)
    return results

@router.post("/documents", response_model=DocumentResponse, dependencies=[Depends(get_current_user)])
def create_document(document: DocumentCreate, db: Session = Depends(get_db)):
    data = document.model_dump()
    data["sectors"] = serialize_sectors(data.get("sectors"))
    new_doc = Document(**data)
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    resp = new_doc.__dict__.copy()
    resp["sectors"] = parse_sectors(resp["sectors"])
    return resp
