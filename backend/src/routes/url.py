from fastapi import APIRouter, Depends, HTTPException, Header, Request, Response
from src.db.models import Link
from src.db.database import get_db
from sqlalchemy import or_
from sqlalchemy.orm import Session
from src.schemas import LinkCreateSchema, LinkCreateResponseSchema, LinkPublicSchema, LinkStatsSchema, UserLinksResponseSchema, LinkUpdateSchema, LinkPasswordUpdateSchema, LinkExpirationUpdateSchema
from src.utils import validate_short_url, limiter
from src.security import generate_password_hash, verify_password, get_user
from src.db.database import SessionLocal
from datetime import datetime, timedelta, timezone

router = APIRouter()

def clean_expired_links():
    db: Session = SessionLocal()
    try:
        expired_links = db.query(Link).filter(Link.expires_at.isnot(None), Link.expires_at < datetime.now(timezone.utc)).all()

        if expired_links:
            for link in expired_links:
                db.delete(link)
            db.commit()
    except Exception as e:
        print('Erro ao limpar links expirados:', e)
    finally:
        db.close()

@router.get('/short/{short_id}', response_model=LinkPublicSchema)
@limiter.shared_limit("30/hour;80/day", scope='get_url')
def get_url(short_id: str, request: Request, password: str = Header(default=None), db: Session = Depends(get_db)):
    link = db.query(Link).filter(Link.short_url == short_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    if link.expires_at and link.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
        db.delete(link)
        db.commit()
        raise HTTPException(status_code=404, detail="Link not found")

    if link.password and not password:
        raise HTTPException(status_code=401, detail="Link is password protected")
    if link.password and not verify_password(password, link.password):
        raise HTTPException(status_code=401, detail="Invalid password")

    return {'original_url': link.original_url, 'clicks': link.clicks, 'created_at': link.created_at}

@router.post('/click/{short_id}')
@limiter.shared_limit("30/hour;80/day", scope='click_url')
def click_url(short_id: str, request: Request, db: Session = Depends(get_db)):
    link = db.query(Link).filter(Link.short_url == short_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    link.clicks += 1
    db.commit()
    db.refresh(link)
    return {'message': 'Link clicked successfully'}

@router.post('/short', response_model=LinkCreateResponseSchema)
@limiter.limit("6/minute;35/day")
def create_url(url: LinkCreateSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    validated_short = validate_short_url(url.short_url, db)
    if not validated_short:
        raise HTTPException(status_code=400, detail="Invalid short URL")

    if url.password and len(url.password.strip()) < 3:
        raise HTTPException(status_code=400, detail="Password must be at least 3 characters long")

    url.short_url = validated_short

    if db.query(Link).filter(Link.short_url == url.short_url).first():
        raise HTTPException(status_code=400, detail="Short URL already exists")

    if url.password:
        url.password = generate_password_hash(url.password)

    link = Link(**url.model_dump(mode='json'))
    if user:
        link.user_id = user['id']

    if url.expires_at:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        expiration_date = url.expires_at.replace(tzinfo=None)

        if expiration_date <= now + timedelta(minutes=5):
            raise HTTPException(status_code=400, detail="Expiration date must be at least 5 minutes in the future")

        if expiration_date.year > 2999 or expiration_date.year < now.year:
            raise HTTPException(status_code=400, detail="Invalid expiration date")

        link.expires_at = expiration_date

    db.add(link)
    db.commit()
    db.refresh(link)
    return link

@router.get('/stats/{short_id}', response_model=LinkStatsSchema)
@limiter.shared_limit("50/day", scope='get_stats')
def get_stats(short_id: str, request: Request, db: Session = Depends(get_db)):
    link = db.query(Link).filter(Link.short_url == short_id, or_(Link.expires_at.is_(None), Link.expires_at > datetime.now(timezone.utc))).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    if link.password:  # Links com senha só o usuário que criou pode ver as estatísticas
        raise HTTPException(status_code=401, detail="Link is password protected")

    return {'original_url': link.original_url, 'short_url': link.short_url, 'clicks': link.clicks, 'created_at': link.created_at}

@router.get('/user/links', response_model=UserLinksResponseSchema)
@limiter.limit("80/day")
def get_user_links(request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        raise HTTPException(status_code=401, detail="You must be logged in to access this resource")

    links = db.query(Link).filter(Link.user_id == user['id'], or_(Link.expires_at.is_(None), Link.expires_at > datetime.now(timezone.utc))).all()
    for link in links:
        link.has_password = bool(link.password)

    return {'links': links}

@router.patch('/short/{short_id}')
@limiter.shared_limit("50/day", scope='update_short_url')
def update_short_url(short_id: str, new_url: LinkUpdateSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        raise HTTPException(status_code=401, detail="You must be logged in to access this resource")

    if not validate_short_url(new_url.short_url, db, auto_generate=False):
        raise HTTPException(status_code=400, detail="Invalid short URL")

    link = db.query(Link).filter(Link.short_url == short_id, Link.user_id == user['id']).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    if link.short_url == new_url.short_url or db.query(Link).filter(Link.short_url == new_url.short_url).first():
        raise HTTPException(status_code=400, detail="Short URL already exists")

    link.short_url = new_url.short_url
    db.commit()
    db.refresh(link)
    return {'message': 'Short URL updated successfully', 'short_url': link.short_url}

@router.patch('/short/{short_id}/password')
@limiter.shared_limit("50/day", scope='update_link_password')
def update_link_password(short_id: str, password: LinkPasswordUpdateSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        raise HTTPException(status_code=401, detail="You must be logged in to access this resource")

    if len(password.password.strip()) < 3:
        raise HTTPException(status_code=400, detail="Password must be at least 3 characters long")

    link = db.query(Link).filter(Link.short_url == short_id, Link.user_id == user['id']).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    link.password = generate_password_hash(password.password)
    db.commit()
    return {'message': 'Password updated successfully'}

@router.patch('/short/{short_id}/expiration')
@limiter.shared_limit('50/day', scope='update_link_expiration')
def update_link_expiration(short_id: str, expiration: LinkExpirationUpdateSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        raise HTTPException(status_code=401, detail="You must be logged in to access this resource")

    if expiration.expires_at:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        expiration_date = expiration.expires_at.replace(tzinfo=None)

        if expiration_date <= now + timedelta(minutes=5):
            raise HTTPException(status_code=400, detail="Expiration date must be at least 5 minutes in the future")

        if expiration_date.year > 2999 or expiration_date.year < now.year:
            raise HTTPException(status_code=400, detail="Invalid expiration date")

    link = db.query(Link).filter(Link.short_url == short_id, Link.user_id == user['id']).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    link.expires_at = expiration.expires_at.replace(tzinfo=None) if expiration.expires_at else None
    db.commit()
    return {'message': 'Expiration updated successfully'}

@router.delete('/short/{short_id}')
@limiter.shared_limit("8/hour;30/day", scope='delete_short_url')
def delete_short_url(short_id: str, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        raise HTTPException(status_code=401, detail="You must be logged in to access this resource")

    link = db.query(Link).filter(Link.short_url == short_id, Link.user_id == user['id']).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    db.delete(link)
    db.commit()
    return {'message': 'URL deleted successfully'}
