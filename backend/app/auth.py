import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from app.models.auth_models import LoginRequest
from app.services.ldap_auth import authenticate_user
from app.services.token_service import create_token
from app.core.database import get_db
from app.models.db_models import User, Role, SectorRoleMapping

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    # 1. Autenticar no LDAP
    user_data = authenticate_user(data.username, data.password)

    if not user_data:
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")

    sector = user_data.get("sector") or ""

    # 2. Sincronizar com MySQL (opcional — sem DB o login ainda funciona com role padrão)
    try:
        db_user = db.query(User).filter(User.username == user_data["username"]).first()

        if not db_user:
            db_user = User(username=user_data["username"], sector=sector)
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        else:
            if db_user.sector != sector:
                db_user.sector = sector
                db.commit()
                db.refresh(db_user)

        # 3. Mapear Roles Baseado no Setor/Departamento
        if not db_user.is_manual_role:
            db_user.roles.clear()
            mapping = db.query(SectorRoleMapping).filter(SectorRoleMapping.sector_name == sector).first()
            if mapping and mapping.role:
                db_user.roles.append(mapping.role)
            else:
                usuario_role = db.query(Role).filter(Role.name == "usuário").first()
                if usuario_role:
                    db_user.roles.append(usuario_role)
            db.commit()
            db.refresh(db_user)

        roles = [r.name for r in db_user.roles]

    except (OperationalError, SQLAlchemyError) as exc:
        logger.warning("DB indisponível durante login, usando role padrão: %s", exc)
        db.rollback()
        roles = ["usuário"]

    # 4. Incluir Roles no Payload do Token
    user_data["roles"] = roles

    token = create_token(user_data)

    return {
        "message": "Login realizado com sucesso",
        "token": token,
        "user": user_data
    }