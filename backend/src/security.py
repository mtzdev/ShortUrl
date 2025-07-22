from fastapi import HTTPException, Request, Depends, Response
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
from jwt import encode, decode, InvalidAlgorithmError, InvalidSignatureError, InvalidTokenError, ExpiredSignatureError
from sqlalchemy.orm import Session
from src.db.database import get_db
from src.db.models import User, RefreshToken
from src.settings import JWT_SECRET_KEY, JWT_EXPIRATION_TIME
from src.utils import get_user_agent, get_user_ip
from src.logger import logger
import hashlib
import secrets
import uuid

pwd_context = CryptContext(schemes=['argon2'], deprecated='auto')
ALGORITHM = 'HS256'

def generate_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)

def generate_jwt_token(user_id: int, username: str, session_id: str,
        request: Request, response: Response, remember: bool = False, db: Session = Depends(get_db)):

    payload = {
        'sub': str(user_id),
        'username': username,
        'iat': datetime.now(timezone.utc),
        'type': 'access',
        'exp': datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION_TIME)
    }

    jwt = encode(payload, JWT_SECRET_KEY, algorithm='HS256')
    refresh_token = generate_refresh_token(user_id, session_id, request, remember, db)

    response.set_cookie(
        key='access_token',
        value=jwt,
        max_age=JWT_EXPIRATION_TIME * 60,
        httponly=True,
        secure=True,
        samesite='none'
    )

    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        max_age=60 * 60 * 24 * 30 if remember else None,
        httponly=True,
        secure=True,
        samesite='none'
    )
    logger.info(f"`generate_jwt_token`: Token JWT gerado com sucesso\n```User ID: {user_id} - Username: {username} - Session ID: {session_id}\nIP: {get_user_ip(request)} | User-Agent: {request.headers.get('User-Agent')}```")
    return {'access_token': jwt, 'refresh_token': refresh_token}

def generate_refresh_token(user_id: int, session_id: str, request: Request, remember: bool, db: Session):
    token = hashlib.sha256(secrets.token_urlsafe(32).encode()).hexdigest()
    user_agent = get_user_agent(request)
    user_ip = get_user_ip(request)
    expires = datetime.now(timezone.utc) + timedelta(days=30) if remember else datetime.now(timezone.utc) + timedelta(days=1)

    token_db = RefreshToken(user_id, session_id, token, user_agent, user_ip, expires, remember)
    db.add(token_db)
    db.commit()

    return token

def generate_session_id(response: Response):
    token = str(uuid.uuid4())
    response.set_cookie(
        key='session_id',
        value=token,
        max_age=60 * 60 * 24 * 30,
        httponly=True,
        secure=True,
        samesite='none'
    )
    return token

def decode_jwt_token(token: str):
    try:
        jwt = decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except (InvalidAlgorithmError, InvalidSignatureError, InvalidTokenError):
        logger.error(f"`decode_jwt_token`: Token JWT inválido\n```Token: {token}```")
        raise HTTPException(status_code=401, detail='Invalid token')

    return jwt

def get_user(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get('access_token')
    refresh_token = request.cookies.get('refresh_token')
    session_id = request.cookies.get('session_id')

    if (not token and not refresh_token) or not session_id:
        clear_auth_cookie(response)
        return False

    try:  # Verifica access token apenas
        payload = decode_jwt_token(token)
        user_id = int(payload.get('sub'))
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
    except Exception as e:
        logger.error(f"`get_user`: Erro ao decodificar token JWT\n```Token: {token}\nError: {e}```")
        pass

    if not refresh_token:
        clear_auth_cookie(response)
        return False

    refresh_token_db = db.query(RefreshToken).filter(
        RefreshToken.refresh_token == refresh_token, RefreshToken.session_id == session_id,
        RefreshToken.is_active.is_(True)).first()

    if refresh_token_db:
        if (
            refresh_token_db.expires_at < datetime.now(timezone.utc).replace(tzinfo=None) or  # link expirado
            refresh_token_db.user_agent != get_user_agent(request) or  # user agent diferente
            refresh_token_db.ip_address != get_user_ip(request)  # ip diferente
        ):

            refresh_token_db.is_active = False
            db.commit()
            clear_auth_cookie(response)
            return False

        refresh_token_db.last_used_at = datetime.now(timezone.utc)
        refresh_token_db.is_active = False
        db.commit()

        user = db.query(User).filter(User.id == refresh_token_db.user_id).first()
        if not user:
            clear_auth_cookie(response)
            return False

        session_id = generate_session_id(response)
        generate_jwt_token(user.id, user.username, session_id, request, response, refresh_token_db.remember, db)
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }

    clear_auth_cookie(response)
    return False

def invalidate_all_sessions(user_id: int, session_id: str, keep_current_session: bool, db: Session):
    query = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.is_active.is_(True)
    )

    if keep_current_session:
        query = query.filter(RefreshToken.session_id != session_id)

    query.update({'is_active': False})
    db.commit()

def clear_auth_cookie(response: Response):
    response.set_cookie(
        key='access_token',
        value='',
        max_age=0,
        expires=0,
        httponly=True,
        secure=True,
        samesite='none'
    )

    response.set_cookie(
        key='refresh_token',
        value='',
        max_age=0,
        expires=0,
        httponly=True,
        secure=True,
        samesite='none'
    )

    response.set_cookie(
        key='session_id',
        value='',
        max_age=0,
        expires=0,
        httponly=True,
        secure=True,
        samesite='none'
    )