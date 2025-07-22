from fastapi import APIRouter, Depends, HTTPException, Header, Request, Response
from src.db.models import Link
from src.db.database import get_db
from sqlalchemy import or_
from sqlalchemy.orm import Session
from src.schemas import LinkCreateSchema, LinkCreateResponseSchema, LinkPublicSchema, LinkStatsSchema, UserLinksResponseSchema, LinkUpdateSchema, LinkPasswordUpdateSchema, LinkExpirationUpdateSchema
from src.utils import validate_short_url, limiter, get_user_ip
from src.security import generate_password_hash, verify_password, get_user
from src.db.database import SessionLocal
from datetime import datetime, timedelta, timezone
from src.logger import logger

router = APIRouter()

def clean_expired_links():
    db: Session = SessionLocal()
    try:
        expired_links = db.query(Link).filter(Link.expires_at.isnot(None), Link.expires_at < datetime.now(timezone.utc)).all()

        if expired_links:
            for link in expired_links:
                db.delete(link)
            db.commit()
            logger.info(f"`clean_expired_links`: {len(expired_links)} links expirados removidos com sucesso!")
    except Exception as e:
        logger.error(f"`clean_expired_links`: Erro ao limpar links expirados\n```{e}```")
    finally:
        db.close()

@router.get('/short/{short_id}', response_model=LinkPublicSchema)
@limiter.shared_limit("30/hour;80/day", scope='get_url')
def get_url(short_id: str, request: Request, password: str = Header(default=None), db: Session = Depends(get_db)):
    link = db.query(Link).filter(Link.short_url == short_id).first()
    if not link:
        logger.warning(f"`GET /short/{short_id}`: Link não encontrado\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        raise HTTPException(status_code=404, detail="Link not found")

    if link.expires_at and link.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
        logger.warning(f"`GET /short/{short_id}`: Link expirado\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        db.delete(link)
        db.commit()
        raise HTTPException(status_code=404, detail="Link not found")

    if link.password and not password:
        raise HTTPException(status_code=401, detail="Link is password protected")
    if link.password and not verify_password(password, link.password):
        logger.warning(f"`GET /short/{short_id}`: Senha do link inválida\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        raise HTTPException(status_code=401, detail="Invalid password")

    logger.info(f"`GET /short/{short_id}`: Link encontrado\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
    return {'original_url': link.original_url, 'clicks': link.clicks, 'created_at': link.created_at}

@router.post('/click/{short_id}')
@limiter.shared_limit("30/hour;80/day", scope='click_url')
def click_url(short_id: str, request: Request, db: Session = Depends(get_db)):
    link = db.query(Link).filter(Link.short_url == short_id).first()
    if not link:
        logger.warning(f"`/click/{short_id}`: Link não encontrado\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        raise HTTPException(status_code=404, detail="Link not found")

    link.clicks += 1
    db.commit()
    db.refresh(link)
    logger.info(f"`/click/{short_id}`: Adicionado clique ao link\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
    return {'message': 'Link clicked successfully'}

@router.post('/short', response_model=LinkCreateResponseSchema)
@limiter.limit("6/minute;35/day")
def create_url(url: LinkCreateSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    validated_short = validate_short_url(url.short_url, db)
    if not validated_short:
        logger.warning(f"`POST /short`: ShortURL inválida\n```URL: {url.original_url}\nShort URL: {url.short_url} - User ID: {user['id'] if user else 'N/A'}\nIP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        raise HTTPException(status_code=400, detail="Invalid short URL")

    if url.password and len(url.password.strip()) < 3:
        raise HTTPException(status_code=400, detail="Password must be at least 3 characters long")

    url.short_url = validated_short

    if db.query(Link).filter(Link.short_url == url.short_url).first():
        logger.warning(f"`POST /short`: ShortURL já existe\n```URL: {url.original_url}\nShort URL: {url.short_url} - User ID: {user['id'] if user else 'N/A'}\nIP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
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
    logger.info(f"`POST /short`: Link criado com sucesso\n```URL: {url.original_url}\nShort URL: {url.short_url} - Password: {'Sim' if url.password else 'Não'} - Expira em: {url.expires_at if url.expires_at else 'Nunca'}\nUser ID: {user['id'] if user else 'N/A'} - Session ID: {request.cookies.get('session_id')}\nIP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
    return link

@router.get('/stats/{short_id}', response_model=LinkStatsSchema)
@limiter.shared_limit("50/day", scope='get_stats')
def get_stats(short_id: str, request: Request, db: Session = Depends(get_db)):
    link = db.query(Link).filter(Link.short_url == short_id, or_(Link.expires_at.is_(None), Link.expires_at > datetime.now(timezone.utc))).first()
    if not link:
        logger.warning(f"`/stats/{short_id}`: Link não encontrado\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        raise HTTPException(status_code=404, detail="Link not found")

    if link.password:  # Links com senha só o usuário que criou pode ver as estatísticas
        raise HTTPException(status_code=401, detail="Link is password protected")

    logger.info(f"`/stats/{short_id}`: Estatísticas do link\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
    return {'original_url': link.original_url, 'short_url': link.short_url, 'clicks': link.clicks, 'created_at': link.created_at}

@router.get('/user/links', response_model=UserLinksResponseSchema)
@limiter.limit("80/day")
def get_user_links(request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        logger.warning(f"`/user/links`: Tentativa com token inválido\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        raise HTTPException(status_code=401, detail="You must be logged in to access this resource")

    links = db.query(Link).filter(Link.user_id == user['id'], or_(Link.expires_at.is_(None), Link.expires_at > datetime.now(timezone.utc))).all()
    for link in links:
        link.has_password = bool(link.password)

    logger.info(f"`/user/links`: Todos os links do usuário\n```User ID: {user['id']}\nIP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
    return {'links': links}

@router.patch('/short/{short_id}')
@limiter.shared_limit("50/day", scope='update_short_url')
def update_short_url(short_id: str, new_url: LinkUpdateSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        logger.warning(f"`PATCH /short/{short_id}`: Tentativa com token inválido\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        raise HTTPException(status_code=401, detail="You must be logged in to access this resource")

    if not validate_short_url(new_url.short_url, db, auto_generate=False):
        logger.warning(f"`PATCH /short/{short_id}`: Shorturl inválida\n```URL: {new_url.short_url} - User ID: {user['id']}\nIP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        raise HTTPException(status_code=400, detail="Invalid short URL")

    link = db.query(Link).filter(Link.short_url == short_id, Link.user_id == user['id']).first()
    if not link:
        logger.warning(f"`PATCH /short/{short_id}`: Link não encontrado\n```URL: {new_url.short_url} - User ID: {user['id']}\nIP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        raise HTTPException(status_code=404, detail="Link not found")

    if link.short_url == new_url.short_url or db.query(Link).filter(Link.short_url == new_url.short_url).first():
        raise HTTPException(status_code=400, detail="Short URL already exists")

    link.short_url = new_url.short_url
    db.commit()
    db.refresh(link)
    logger.info(f"`PATCH /short/{short_id}`: ShortURL atualizada\n```Nova Shorturl: {new_url.short_url}\nUser ID: {user['id']} - Session ID: {request.cookies.get('session_id')}\nIP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
    return {'message': 'Short URL updated successfully', 'short_url': link.short_url}

@router.patch('/short/{short_id}/password')
@limiter.shared_limit("50/day", scope='update_link_password')
def update_link_password(short_id: str, password: LinkPasswordUpdateSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        logger.warning(f"`PATCH /short/{short_id}/password`: Tentativa com token inválido\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        raise HTTPException(status_code=401, detail="You must be logged in to access this resource")

    if len(password.password.strip()) < 3:
        raise HTTPException(status_code=400, detail="Password must be at least 3 characters long")

    link = db.query(Link).filter(Link.short_url == short_id, Link.user_id == user['id']).first()
    if not link:
        logger.warning(f"`PATCH /short/{short_id}/password`: Link não encontrado\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        raise HTTPException(status_code=404, detail="Link not found")

    link.password = generate_password_hash(password.password)
    db.commit()
    logger.info(f"`PATCH /short/{short_id}/password`: Senha atualizada\n```User ID: {user['id']} - Session ID: {request.cookies.get('session_id')}\nIP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
    return {'message': 'Password updated successfully'}

@router.patch('/short/{short_id}/expiration')
@limiter.shared_limit('50/day', scope='update_link_expiration')
def update_link_expiration(short_id: str, expiration: LinkExpirationUpdateSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        logger.warning(f"`PATCH /short/{short_id}/expiration`: Tentativa com token inválido\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
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
        logger.warning(f"`PATCH /short/{short_id}/expiration`: Link não encontrado\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        raise HTTPException(status_code=404, detail="Link not found")

    link.expires_at = expiration.expires_at.replace(tzinfo=None) if expiration.expires_at else None
    db.commit()
    logger.info(f"`PATCH /short/{short_id}/expiration`: Expiração atualizada\n```Expira em: {expiration.expires_at if expiration.expires_at else 'Nunca'}\nUser ID: {user['id']} - Session ID: {request.cookies.get('session_id')}\nIP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
    return {'message': 'Expiration updated successfully'}

@router.delete('/short/{short_id}')
@limiter.shared_limit("8/hour;30/day", scope='delete_short_url')
def delete_short_url(short_id: str, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        logger.warning(f"`DELETE /short/{short_id}`: Tentativa com token inválido\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        raise HTTPException(status_code=401, detail="You must be logged in to access this resource")

    link = db.query(Link).filter(Link.short_url == short_id, Link.user_id == user['id']).first()
    if not link:
        logger.warning(f"`DELETE /short/{short_id}`: Link não encontrado\n```IP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
        raise HTTPException(status_code=404, detail="Link not found")

    db.delete(link)
    db.commit()
    logger.info(f"`DELETE /short/{short_id}`: Link deletado\n```Link original: {link.original_url}\nUser ID: {user['id']} - Session ID: {request.cookies.get('session_id')}\nIP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
    return {'message': 'URL deleted successfully'}
