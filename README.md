# Portal IPAJM

Este é um pacote de código para o Portal IPAJM. O projeto original estará disponível em breve.

## Executando o código

### Pré-requisitos
- Node.js instalado
- Python 3 instalado
- pip instalado

### Frontend

Entrar na pasta: `cd portal_ipajm/frontend/`

Instalar as dependências: `npm install`

Rodar em desenvolvimento: `npm run dev`

Rodar na rede local: `npm run dev -- --host`

### Backend

Entrar na pasta: `cd portal_ipajm/backend/`

Criar ambiente virtual: `python -m venv venv`

Ativar ambiente: `source venv/Scripts/activate`

Instalar dependências: `pip install -r requirements.txt`

Rodar o servidor: `uvicorn app.main:app --reload`

## Acesso
- Frontend: `http://localhost:5173`
- Backend (docs): `http://localhost:8000/docs`

## Deploy na VM

Entre na pasta: `cd portal_ipajm/frontend/`

Rode: `npm run build`

Dê push para a main do Github remoto

Abra o Putty

Rode: `/opt/deploy/portal-deploy.sh`

Caso ocorra erro de permissão:
Rode: `sudo chown -R $USER:www-data /var/www/portal`
E: `sudo chmod -R 775 /var/www/portal`

## Observações
Verifique em `frontend/src/contexts/AuthContext.tsx` se API está para testes ou produção antes de rodar o código.

SEMPRE verifique estar dentro da pasta (frontend ou backend) para rodar cada código.

## Acesso ao Banco de dados
Estrutura do arquivo .env na pasta backend/

env
`MYSQL_USER=usuario_do_banco`(usuario do banco de dados)
`MYSQL_PASSWORD=senha_do_banco`(senha do banco de dados)
`MYSQL_HOST=ip`(servidor de banco de dados)
`MYSQL_PORT=3306`(porta do banco de dados)
`MYSQL_DB=portal`(nome do banco de dados)