from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.db_models import Role, SectorRoleMapping, User
from app.models.admin_schemas import (
    RoleCreate, RoleResponse, 
    SectorMappingCreate, SectorMappingResponse,
    UserResponse
)
from app.services.token_service import get_current_super_admin
from pydantic import BaseModel

class RoleUpdate(BaseModel):
    role_id: int

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/roles", response_model=List[RoleResponse])
def get_roles(db: Session = Depends(get_db)):
    return db.query(Role).all()

@router.post("/roles", response_model=RoleResponse)
def create_role(role: RoleCreate, db: Session = Depends(get_db)):
    db_role = db.query(Role).filter(Role.name == role.name).first()
    if db_role:
        raise HTTPException(status_code=400, detail="Role already registered")
    new_role = Role(**role.model_dump())
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    return new_role

@router.delete("/roles/{role_id}")
def delete_role(role_id: int, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    db.delete(role)
    db.commit()
    return {"detail": "Role deleted"}

@router.get("/mappings", response_model=List[SectorMappingResponse])
def get_mappings(db: Session = Depends(get_db)):
    return db.query(SectorRoleMapping).all()

@router.post("/mappings", response_model=SectorMappingResponse)
def create_mapping(mapping: SectorMappingCreate, db: Session = Depends(get_db)):
    db_mapping = db.query(SectorRoleMapping).filter(SectorRoleMapping.sector_name == mapping.sector_name).first()
    if db_mapping:
        raise HTTPException(status_code=400, detail="Sector already mapped")
    new_mapping = SectorRoleMapping(**mapping.model_dump())
    db.add(new_mapping)
    db.commit()
    db.refresh(new_mapping)
    return new_mapping

@router.delete("/mappings/{mapping_id}")
def delete_mapping(mapping_id: int, db: Session = Depends(get_db)):
    mapping = db.query(SectorRoleMapping).filter(SectorRoleMapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    db.delete(mapping)
    db.commit()
    return {"detail": "Mapping deleted"}

@router.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.put("/users/{user_id}/role", dependencies=[Depends(get_current_super_admin)])
def update_user_role(user_id: int, role_data: RoleUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    role = db.query(Role).filter(Role.id == role_data.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role não encontrada")
        
    user.roles.clear()
    user.roles.append(role)
    user.is_manual_role = 1 # Definir valor booleano para coluna de inteiros
    db.commit()
    
    return {"detail": "Role atualizada com sucesso"}
