from jose import jwt, JWTError
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = "portal-ipajm-secret-key"
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

def create_token(user_data):
    payload = {
        "user": user_data,
        "exp": datetime.utcnow() + timedelta(hours=8)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_data = payload.get("user")
        if user_data is None:
            raise HTTPException(status_code=401, detail="Credenciais inválidas")
        return user_data
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

def get_current_super_admin(current_user: dict = Depends(get_current_user)):
    roles = current_user.get("roles", [])
    if "super-admin" not in roles:
        raise HTTPException(status_code=403, detail="Acesso negado: Requer privilégios de super-admin")
    return current_user