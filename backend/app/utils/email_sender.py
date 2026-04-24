import smtplib
from email.message import EmailMessage
from app.core.config import SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASSWORD

def send_banco_horas_alert(to_email: str, username: str, dias_restantes: int, saldo: str):
    """
    Envia alerta por email avisando que o prazo de validade das horas extras está próximo do fim.
    """
    if not SMTP_PASSWORD:
        # Se não houver senha, simula o envio no console (útil para desenvolvimento)
        print(f"[Simulação de Email] Para: {to_email}")
        print(f"Assunto: Alerta do Banco de Horas - {dias_restantes} dias para expiração")
        print(f"Corpo: Olá {username}, faltam {dias_restantes} dias para expirar o saldo de {saldo} do Banco de Horas.")
        return False
        
    msg = EmailMessage()
    msg['Subject'] = f"Alerta do Banco de Horas: {dias_restantes} dias para expiração"
    msg['From'] = SMTP_USER
    msg['To'] = to_email

    conteudo = f"""
Olá {username},
    
Este é um alerta automático de que o seu saldo no Banco de Horas ({saldo} disponíveis) 
expirará em {dias_restantes} dias. 
    
Por favor, acesse o Portal IPAJM para consultar os detalhes e programar suas folgas com a chefia.

--
Este é um email automatico gerado pelo Portal IPAJM - Central de Gerenciamento.
"""
    msg.set_content(conteudo)

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            # Se o servidor suportar TLS, descomente a linha abaixo:
            # server.starttls() 
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Erro ao enviar email para {to_email}: {e}")
        return False