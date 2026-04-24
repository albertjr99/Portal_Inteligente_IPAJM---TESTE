from ldap3 import Server, Connection, ALL
from app.core.config import LDAP_SERVER, LDAP_DOMAIN, LDAP_BASE_DN
import uuid
import unicodedata

def authenticate_user(username: str, password: str):

    user = f"PREVIDENCIA\\{username}"

    print("Tentando login com:", user)

    server = Server(LDAP_SERVER, get_info=ALL)

    try:
        conn = Connection(server, user=user, password=password)

        if not conn.bind():
            print("Falha no bind LDAP")
            return None

        print("Bind LDAP OK")

        # Busca o usuário e atributos pelo LDAP
        conn.search(
            LDAP_BASE_DN,
            f"(sAMAccountName={username})",
            attributes=["objectGUID", "displayName", "givenName", "mail", "description", "physicalDeliveryOfficeName"]
        )

        print("Resultado busca:", conn.entries)

        if conn.entries:

            entry = conn.entries[0]

            # Transformar objectGUID de bytes para string legível
            guid_value = entry.objectGUID.value
            # Garante que value seja bytes e tenha o tamanho correto para GUID
            if isinstance(guid_value, bytes) and len(guid_value) == 16:
                guid_str = str(uuid.UUID(bytes_le=guid_value))
            else:
                guid_str = str(guid_value)

            # Normalizar texto recebido de description
            def normalize(text):
                if not text:
                    return ""
                return unicodedata.normalize('NFD', text)\
                .encode('ascii', 'ignore')\
                .decode('utf-8')\
                .lower()
                    
            # Monta os dados do usuário
            user_data = {
                "id": guid_str,
                "username": username,
                "fullName": str(entry.displayName),
                "firstName": str(entry.givenName),
                "email": str(entry.mail),
                "sector": str(entry.description) if entry.description else "",
                "department": str(entry.physicalDeliveryOfficeName),
            }

            conn.unbind()

            return user_data

        conn.unbind()

        return None

    except Exception as e:
        print("Erro LDAP:", e)
        return None