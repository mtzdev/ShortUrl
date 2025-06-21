from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from src.db.database import get_db
from src.db.models import User
from src.security import get_user, verify_password, generate_password_hash, generate_jwt_token, clear_auth_cookie
from sqlalchemy.orm import Session
from src.schemas import LoginRequestSchema, RegisterRequestSchema, LoginResponseSchema, UsernameUpdateSchema, EmailUpdateSchema, PasswordUpdateSchema

router = APIRouter()

@router.post('/login', response_model=LoginResponseSchema)
def login(login: LoginRequestSchema, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login.email).first()
    if not user:
        raise HTTPException(status_code=401, detail='E-mail ou senha estão inválidos. Por favor, tente novamente.')

    if not verify_password(login.password, user.password):
        raise HTTPException(status_code=401, detail='E-mail ou senha estão inválidos. Por favor, tente novamente.')

    return generate_jwt_token(user.id, user.username, response)

@router.post('/register', response_model=LoginResponseSchema)
def register(register: RegisterRequestSchema, response: Response, db: Session = Depends(get_db)):
    if register.password != register.confirm_password:
        raise HTTPException(status_code=400, detail='As senhas não coincidem. Verifique se as senhas estão iguais.')

    if db.query(User).filter(User.username == register.username).first():
        raise HTTPException(status_code=409, detail='Nome de usuário já registrado. Por favor, tente outro nome de usuário.')

    if db.query(User).filter(User.email == register.email).first():
        raise HTTPException(status_code=409, detail='E-mail já registrado. Por favor, tente outro e-mail.')


    user = User(username=register.username, email=register.email, password=generate_password_hash(register.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    return generate_jwt_token(user.id, user.username, response)

@router.post('/logout')
def logout(response: Response):
    clear_auth_cookie(response)
    return {'message': 'Successfully logged out'}

@router.get('/me')
def get_current_user(request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        clear_auth_cookie(response)
        return JSONResponse(status_code=401, content={'detail': 'Invalid token or user not found'}, headers=response.headers)
    return user

@router.patch('/me/username')
def update_username(new: UsernameUpdateSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        raise HTTPException(status_code=401, detail='Invalid token or user not found')

    if db.query(User).filter(User.username == new.username).first():
        raise HTTPException(status_code=409, detail='Username already registered. Please try another username.')

    user_db = db.query(User).filter(User.id == user['id']).first()
    user_db.username = new.username
    db.commit()
    return {'message': 'Username updated successfully'}

@router.patch('/me/email')
def update_email(new: EmailUpdateSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        raise HTTPException(status_code=401, detail='Invalid token or user not found')

    if db.query(User).filter(User.email == new.email).first():
        raise HTTPException(status_code=409, detail='E-mail already registered. Please try another e-mail')

    user_db = db.query(User).filter(User.id == user['id']).first()
    user_db.email = new.email
    db.commit()
    return {'message': 'E-mail updated successfully'}

@router.patch('/me/password')
def update_password(new: PasswordUpdateSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        raise HTTPException(status_code=401, detail='Invalid token or user not found')

    user_db = db.query(User).filter(User.id == user['id']).first()
    if verify_password(new.password, user_db.password):
        raise HTTPException(status_code=401, detail='The new password cannot be the same as the old password')

    user_db.password = generate_password_hash(new.password)
    db.commit()
    return {'message': 'Password updated successfully'}