from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

# Tabela de associação para Usuário <-> Função
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id"), primary_key=True)
)

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(200), nullable=True)
    
    # Relação com os usuários
    users = relationship("User", secondary=user_roles, back_populates="roles")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=True)
    sector = Column(String(100), nullable=True)
    is_manual_role = Column(Integer, default=False) # Representa um booleano: 0 = False, 1 = True
    
    # Relação com as funções
    roles = relationship("Role", secondary=user_roles, back_populates="users")


class SectorRoleMapping(Base):
    __tablename__ = "sector_role_mappings"
    
    id = Column(Integer, primary_key=True, index=True)
    sector_name = Column(String(100), unique=True, index=True, nullable=False)
    # Função padrão atribuída aos usuários deste setor
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    
    role = relationship("Role")

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    date = Column(String(20), nullable=False)
    time = Column(String(20), nullable=True)
    description = Column(String(500), nullable=False)
    type = Column(String(50), nullable=False)
    sectors = Column(String(500), nullable=True) # JSON/CSV string
    owner_username = Column(String(100), nullable=True, index=True) # Para eventos pessoais

class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(String(2000), nullable=False)
    date = Column(String(20), nullable=False)
    priority = Column(String(50), nullable=False)
    author = Column(String(100), nullable=False)
    sectors = Column(String(500), nullable=True)

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String(500), nullable=False)
    category = Column(String(100), nullable=False)
    url = Column(String(500), nullable=False)
    uploadDate = Column(String(20), nullable=False)
    size = Column(String(50), nullable=False)
    sectors = Column(String(500), nullable=True)
