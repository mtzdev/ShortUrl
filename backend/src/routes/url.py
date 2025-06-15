from fastapi import APIRouter, Depends, HTTPException, Header
from src.db.models import Link
from src.db.database import get_db
from sqlalchemy.orm import Session
from src.schemas import LinkCreateSchema, LinkCreateResponseSchema, LinkPublicSchema, LinkStatsSchema, UserLinksResponseSchema, LinkUpdateSchema
from src.utils import validate_short_url
from src.security import generate_password_hash, verify_password, get_user

router = APIRouter()

@router.get('/short/{short_id}', response_model=LinkPublicSchema)
def get_url(short_id: str, password: str = Header(default=None), db: Session = Depends(get_db)):
    link = db.query(Link).filter(Link.short_url == short_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    if link.password and not password:
        raise HTTPException(status_code=401, detail="Link is password protected")
    if link.password and not verify_password(password, link.password):
        raise HTTPException(status_code=401, detail="Invalid password")

    return {'original_url': link.original_url, 'clicks': link.clicks, 'created_at': link.created_at}

@router.post('/click/{short_id}')
def click_url(short_id: str, db: Session = Depends(get_db)):
    link = db.query(Link).filter(Link.short_url == short_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    link.clicks += 1
    db.commit()
    db.refresh(link)
    return {'message': 'Link clicked successfully'}

@router.post('/short', response_model=LinkCreateResponseSchema)
def create_url(url: LinkCreateSchema, db: Session = Depends(get_db)):
    validated_short = validate_short_url(url.short_url, db)
    if not validated_short:
        raise HTTPException(status_code=400, detail="Invalid short URL")

    url.short_url = validated_short

    if db.query(Link).filter(Link.short_url == url.short_url).first():
        raise HTTPException(status_code=400, detail="Short URL already exists")

    if url.password:
        url.password = generate_password_hash(url.password)

    link = Link(**url.model_dump(mode='json'))
    db.add(link)
    db.commit()
    db.refresh(link)
    return link

@router.get('/stats/{short_id}', response_model=LinkStatsSchema)
def get_stats(short_id: str, db: Session = Depends(get_db)):  # TODO: Validar se o short_id é um link ou slug, se for link, obter apenas o slug
    link = db.query(Link).filter(Link.short_url == short_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    if link.password:  # Links com senha só o usuário que criou pode ver as estatísticas
        raise HTTPException(status_code=401, detail="Link is password protected")

    return {'original_url': link.original_url, 'short_url': link.short_url, 'clicks': link.clicks, 'created_at': link.created_at}

@router.get('/user/links', response_model=UserLinksResponseSchema)
def get_user_links(user: dict = Depends(get_user), db: Session = Depends(get_db)):
    if not user:
        raise HTTPException(status_code=401, detail="You must be logged in to access this resource")

    links = db.query(Link).filter(Link.user_id == user['id']).all()
    return {'links': links}

@router.patch('/short/{short_id}')
def update_short_url(short_id: str, new_url: LinkUpdateSchema, user: dict = Depends(get_user), db: Session = Depends(get_db)):
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

@router.delete('/short/{short_id}')
def delete_short_url(short_id: str, user: dict = Depends(get_user), db: Session = Depends(get_db)):
    if not user:
        raise HTTPException(status_code=401, detail="You must be logged in to access this resource")

    link = db.query(Link).filter(Link.short_url == short_id, Link.user_id == user['id']).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    db.delete(link)
    db.commit()
    return {'message': 'URL deleted successfully'}
