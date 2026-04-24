import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

load_dotenv()

LDAP_SERVER = os.getenv("LDAP_SERVER", "prev20.previdencia.local")
LDAP_PORT = int(os.getenv("LDAP_PORT", "389"))
LDAP_DOMAIN = os.getenv("LDAP_DOMAIN", "previdencia.local")
LDAP_BASE_DN = os.getenv("LDAP_BASE_DN", "DC=previdencia,DC=local")

MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_DB = os.getenv("MYSQL_DB", "portal_ipajm")

# Usa MySQL se as credenciais estiverem definidas via env; caso contrário usa SQLite local
_mysql_url = f"mysql+pymysql://{MYSQL_USER}:{quote_plus(MYSQL_PASSWORD)}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
_sqlite_url = "sqlite:///./portal_ipajm.db"
_default_db = _mysql_url if os.getenv("MYSQL_USER") or os.getenv("DATABASE_URL") else _sqlite_url

DATABASE_URL = os.getenv("DATABASE_URL", _default_db)

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.servidor.com.br")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "[EMAIL_ADDRESS]")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
