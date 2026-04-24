from pydantic import BaseModel
from typing import List, Optional

class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class RoleResponse(RoleBase):
    id: int

    class Config:
        from_attributes = True

class SectorMappingBase(BaseModel):
    sector_name: str
    role_id: int

class SectorMappingCreate(SectorMappingBase):
    pass

class SectorMappingResponse(SectorMappingBase):
    id: int
    role: RoleResponse

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    username: str
    department: Optional[str] = None
    sector: Optional[str] = None
    roles: List[RoleResponse] = []

    class Config:
        from_attributes = True
