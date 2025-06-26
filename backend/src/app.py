from fastapi import FastAPI
from src.routes import url, auth
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(redoc_url=None)
app.include_router(url.router, prefix='/api', tags=['url'])
app.include_router(auth.router, prefix='/api/auth', tags=['auth'])

app.add_middleware(
    CORSMiddleware,
    allow_origins=['https://encurtar.vercel.app/'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
