from sqlalchemy.orm import Session
from app.models.db_models import Role, SectorRoleMapping
from app.core.database import SessionLocal

def init_db():
    db: Session = SessionLocal()
    try:
        # Popular funções predefinidas (roles)
        roles_data = [
            {"name": "super-admin", "description": "Acesso total ao sistema"},
            {"name": "admin", "description": "Pode alterar e alimentar comunicados/eventos"},
            {"name": "usuário", "description": "Acesso básico (solicitações e pesquisa)"}
        ]
        
        for r_data in roles_data:
            role = db.query(Role).filter(Role.name == r_data["name"]).first()
            if not role:
                db.add(Role(name=r_data["name"], description=r_data["description"]))
        db.commit()

        # Popular mapeamentos iniciais de setores
        mappings_data = [
            {"sector_name": "TI", "role_name": "super-admin"},
            {"sector_name": "RH", "role_name": "admin"},
            {"sector_name": "ASC", "role_name": "admin"},
        ]
        
        for m_data in mappings_data:
            mapping = db.query(SectorRoleMapping).filter(SectorRoleMapping.sector_name == m_data["sector_name"]).first()
            if not mapping:
                role = db.query(Role).filter(Role.name == m_data["role_name"]).first()
                if role:
                    db.add(SectorRoleMapping(sector_name=m_data["sector_name"], role_id=role.id))
        db.commit()

        # Popular conteúdo para integração da Fase 2
        from app.models.db_models import Event, Announcement, Document
        import json

        if db.query(Event).count() == 0:
            db.add(Event(title="Reunião de Planejamento TI", date="2024-03-25", time="14:00", description="Alinhamento mensal e revisões de projeto.", type="meeting", sectors=json.dumps(["GTI"])))
            db.add(Event(title="Feriado Nacional (Tiradentes)", date="2024-04-21", time="", description="Feriado nacional de Tiradentes.", type="holiday", sectors=json.dumps([])))
            db.commit()

        if db.query(Announcement).count() == 0:
            db.add(Announcement(title="Atualização do Sistema", content="O Portal passará por manutenção neste fim de semana.", date="2024-03-20", priority="high", author="Equipe de TI", sectors=json.dumps(["GTI", "RH", "ASC"])))
            db.commit()

        if db.query(Document).count() == 0:
            db.add(Document(title="Manual do Novo Servidor", description="Guia completo para novos colaboradores do IPAJM.", category="Manuais", url="#", uploadDate="2024-01-15", size="2.4 MB", sectors=json.dumps([])))
            db.add(Document(title="Política de Férias 2024", description="Regras atualizadas para solicitação de férias.", category="Normativas", url="#", uploadDate="2024-02-01", size="1.1 MB", sectors=json.dumps(["RH"])))
            db.commit()

    finally:
        db.close()
