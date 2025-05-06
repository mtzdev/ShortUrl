from fastapi import APIRouter, Depends, HTTPException
from src.db.models import Link
from src.db.database import get_db
from sqlalchemy.orm import Session
from src.schemas import LinkCreateSchema, LinkCreateResponseSchema, LinkPublicSchema
from src.utils import validate_short_url

router = APIRouter()

@router.get('/short/{short_id}', response_model=LinkPublicSchema)
def get_url(short_id: str, db: Session = Depends(get_db)):
    link = db.query(Link).filter(Link.short_url == short_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    if link.password:
        raise HTTPException(status_code=401, detail="Link is password protected")

    link.clicks += 1
    db.commit()
    db.refresh(link)

    return {'original_url': link.original_url}

@router.post('/short', response_model=LinkCreateResponseSchema)
def create_url(url: LinkCreateSchema, db: Session = Depends(get_db)):
    validated_short = validate_short_url(url.short_url)
    if not validated_short:
        raise HTTPException(status_code=400, detail="Invalid short URL")

    url.short_url = validated_short

    if db.query(Link).filter(Link.short_url == url.short_url).first():
        raise HTTPException(status_code=400, detail="Short URL already exists")

    link = Link(**url.model_dump(mode='json'))
    db.add(link)
    db.commit()
    db.refresh(link)
    return link