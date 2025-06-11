from fastapi import APIRouter, Depends, HTTPException, Request
from src.db.database import get_db
from src.db.models import User
from src.security import get_user, verify_password, generate_password_hash, generate_jwt_token
from sqlalchemy.orm import Session
from src.utils import validate_email
from src.schemas import LoginRequestSchema, RegisterRequestSchema, LoginResponseSchema

router = APIRouter()

@router.post('/login', response_model=LoginResponseSchema)
def login(login: LoginRequestSchema, db: Session = Depends(get_db)):
    if not validate_email(login.email):
        raise HTTPException(status_code=400, detail='Invalid e-mail')

    user = db.query(User).filter(User.email == login.email).first()
    if not user:
        raise HTTPException(status_code=401, detail='Invalid credentials')

    if not verify_password(login.password, user.password):
        raise HTTPException(status_code=401, detail='Invalid credentials')

    return generate_jwt_token(user.id, user.username)

@router.post('/register', response_model=LoginResponseSchema)
def register(register: RegisterRequestSchema, db: Session = Depends(get_db)):  # TODO: sanitizar inputs
    if not validate_email(register.email):
        raise HTTPException(status_code=400, detail='Invalid e-mail')

    # TODO: Adicionar validate password

    if register.password != register.confirm_password:
        raise HTTPException(status_code=400, detail='Passwords do not match')

    if db.query(User).filter(User.email == register.email).first():
        raise HTTPException(status_code=409, detail='E-mail already registered')

    user = User(username=register.username, email=register.email, password=generate_password_hash(register.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    return generate_jwt_token(user.id, user.username)

@router.get('/me')
def get_current_user(request: Request, db: Session = Depends(get_db)):
    user = get_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail='Invalid token or user not found')
    return user
