# 🔗 Encurtador de Links

Um encurtador de links completo, independente e fácil de usar, desenvolvido com **FastAPI** no backend e **React** no frontend. <br>
🌐 **Acesse agora**: [encurtar.vercel.app](https://encurtar.vercel.app) – Totalmente gratuito!

---

⚙️ O objetivo deste projeto foi aprimorar minhas habilidades em **desenvolvimento backend**, com foco especial em construção de **APIs**.  
🎨 O frontend foi gerado com auxílio de IA, para obter uma melhor interface.

> A API foi desenvolvida do zero para este projeto, sem necessidade de utilizar serviços ou APIs de terceiros.

## ✨ Funcionalidades

- 🔐 **Sistema de usuários** - Cadastro, login e sistema de perfil
- 🔗 **URLs personalizadas** - Crie links curtos customizados
- 🔒 **Proteção por senha** - Links privados com acesso controlado por senha
- 🕒 **Expiração de links** - Links com data de expiração
- 📊 **Estatísticas** - Contagem de cliques em cada link encurtado 
- 🎨 **Interface moderna** - Design responsivo com tema escuro/claro
- 🛡️ **Segurança** - Uso de criptografia, tokens JWT e rate limit na API

### Funcionalidades do sistema de perfil
- Criar links protegidos com senha
- Criar links com data de expiração
- Modificar o link encurtado ou a senha de um link protegido.
- Deletar links criados
- Visualizar estatísticas de cada link de forma fácil
- Modificar nome de usuário, email ou senha.

## 🚀 Tecnologias Utilizadas
**Backend:** Python, FastAPI, SQLAlchemy, SQLite e Alembic <br>
**Frontend:** React, TypeScript, Tailwind CSS e Vite <br>
**Deploy:** Vercel (Frontend), Squarecloud (Backend) <br>

## 📋 Como Usar
1. **Acesse o site**: [encurtar.vercel.app](https://encurtar.vercel.app)
2. **Cole sua URL** no campo principal
3. **Personalize** o link curto (opcional)
4. **Clique em "Encurtar"** e pronto!

## 🔧 Instalação Local

### Pré-requisitos
- Python 3.13+
- Node.js 18+

### Backend
```bash
cd backend
pip install poetry # Instala o Poetry
poetry install # Instala as dependências
poetry run alembic upgrade head # Aplica as migrações e cria o banco de dados
poetry run python src/app.py # Inicia a API
```
> **OBS**: Lembre-se de editar o app.py para mudar a configuração do CORS permitindo o domínio do seu site.

### Frontend
```bash
cd frontend
npm install # Instala as dependências
npm run dev # Inicia o frontend
```

> **OBS**: Renomeie o arquivo .env-example para .env em ambas as pastas e mude os valores conforme sua necessidade.

## 🤝 Contribuindo
Sinta-se a vontade para contribuir com o projeto! Se você encontrar bugs ou tiver sugestões, abra uma issue ou faça um pull request!