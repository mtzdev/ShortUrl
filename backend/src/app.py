from fastapi import FastAPI
from src.routes import url
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(redoc_url=None)
app.include_router(url.router, prefix='/api')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
