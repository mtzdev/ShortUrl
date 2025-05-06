from fastapi import FastAPI
from src.routes import url
# TODO: Cors

app = FastAPI(redoc_url=None)
app.include_router(url.router, prefix='/api')
