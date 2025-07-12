from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from src.db.database import get_db
from src.db.models import User, RefreshToken
from src.security import get_user, verify_password, generate_password_hash, generate_jwt_token, clear_auth_cookie, generate_session_id, invalidate_all_sessions
from src.schemas import LoginRequestSchema, RegisterRequestSchema, LoginResponseSchema, UsernameUpdateSchema, EmailUpdateSchema, PasswordUpdateSchema
from src.utils import limiter
from sqlalchemy.orm import Session

router = APIRouter()

@router.post('/login', response_model=LoginResponseSchema)
@limiter.limit("5/minute;25/day")
def login(login: LoginRequestSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login.email).first()
    if not user:
        raise HTTPException(status_code=401, detail='E-mail ou senha estão inválidos. Por favor, tente novamente.')

    if not verify_password(login.password, user.password):
        raise HTTPException(status_code=401, detail='E-mail ou senha estão inválidos. Por favor, tente novamente.')

    session_id = generate_session_id(response)
    token = generate_jwt_token(user.id, user.username, session_id, request, response, login.remember, db)
    return {
        'access_token': token['access_token'],
        'refresh_token': token['refresh_token'],
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    }

@router.post('/register', response_model=LoginResponseSchema)
@limiter.limit("3/minute;15/day")
def register(register: RegisterRequestSchema, request: Request, response: Response, db: Session = Depends(get_db)):
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

    session_id = generate_session_id(response)
    token = generate_jwt_token(user.id, user.username, session_id, request, response, True, db)
    return {
        'access_token': token['access_token'],
        'refresh_token': token['refresh_token'],
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    }

@router.post('/logout')
def logout(response: Response, request: Request, db: Session = Depends(get_db)):
    session_id = request.cookies.get('session_id')
    if session_id:
        db.query(RefreshToken).filter(RefreshToken.session_id == session_id).update({'is_active': False})
        db.commit()

    clear_auth_cookie(response)
    return {'message': 'Successfully logged out'}

@router.get('/me')
def get_current_user(request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        return JSONResponse(status_code=401, content={'detail': 'Invalid token or user not found'}, headers=response.headers)
    return user

@router.patch('/me/username')
@limiter.limit("5/day")
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
@limiter.limit("3/day")
def update_email(new: EmailUpdateSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        raise HTTPException(status_code=401, detail='Invalid token or user not found')

    if db.query(User).filter(User.email == new.email).first():
        raise HTTPException(status_code=409, detail='E-mail already registered. Please try another e-mail')

    user_db = db.query(User).filter(User.id == user['id']).first()
    user_db.email = new.email
    db.commit()
    invalidate_all_sessions(user['id'], request.cookies.get('session_id'), True, db)
    return {'message': 'E-mail updated successfully'}

@router.patch('/me/password')
@limiter.limit("3/day")
def update_password(new: PasswordUpdateSchema, request: Request, response: Response, db: Session = Depends(get_db)):
    user = get_user(request, response, db)
    if not user:
        raise HTTPException(status_code=401, detail='Invalid token or user not found')

    user_db = db.query(User).filter(User.id == user['id']).first()
    if verify_password(new.password, user_db.password):
        raise HTTPException(status_code=401, detail='The new password cannot be the same as the old password')

    user_db.password = generate_password_hash(new.password)
    db.commit()
    invalidate_all_sessions(user['id'], request.cookies.get('session_id'), True, db)
    return {'message': 'Password updated successfully'}
