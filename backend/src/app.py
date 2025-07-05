from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Request
from src.routes import url, auth
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from src.utils import limiter
import uvicorn

app = FastAPI(docs_url=None, redoc_url=None)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.include_router(url.router, prefix='/api', tags=['url'])
app.include_router(auth.router, prefix='/api/auth', tags=['auth'])

app.add_middleware(
    CORSMiddleware,
    allow_origins=['https://encurtar.vercel.app'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.exception_handler(RateLimitExceeded)
async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Você atingiu o limite de requisições. Por favor, tente novamente mais tarde."}
    )

scheduler = BackgroundScheduler()
scheduler.add_job(url.clean_expired_links, 'cron', hour=0, minute=0)
scheduler.start()

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=80, reload=False)