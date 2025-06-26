from fastapi import HTTPException, Request, Depends, Response
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
from jwt import encode, decode, InvalidAlgorithmError, InvalidSignatureError, InvalidTokenError, ExpiredSignatureError
from sqlalchemy.orm import Session
from src.db.database import get_db
from src.db.models import User
from src.settings import JWT_SECRET_KEY, JWT_EXPIRATION_TIME

pwd_context = CryptContext(schemes=['argon2'], deprecated='auto')
ALGORITHM = 'HS256'

def generate_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)

def generate_jwt_token(user_id: int, username: str, response: Response, remember: bool = False):
    payload = {
        'sub': str(user_id),
        'username': username,
        'iat': datetime.now(timezone.utc),
        'type': 'access',
        'exp': datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION_TIME)
    }
    refresh_payload = {
        'sub': str(user_id),
        'username': username,
        'iat': datetime.now(timezone.utc),
        'type': 'refresh',
        'exp': datetime.now(timezone.utc) + timedelta(days=30) if remember else datetime.now(timezone.utc) + timedelta(days=1)
    }
    jwt = encode(payload, JWT_SECRET_KEY, algorithm='HS256')
    refresh_token = encode(refresh_payload, JWT_SECRET_KEY, algorithm='HS256')

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
    return {'access_token': jwt, 'refresh_token': refresh_token, 'token_type': 'Bearer'}

def decode_jwt_token(token: str):
    try:
        jwt = decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except (InvalidAlgorithmError, InvalidSignatureError, InvalidTokenError):
        raise HTTPException(status_code=401, detail='Invalid token')

    return jwt

def get_user(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get('access_token')
    refresh_token = request.cookies.get('refresh_token')
    use_refresh = False

    if not token and not refresh_token:
        return None

    try:
        payload = decode_jwt_token(token)
    except Exception:
        use_refresh = True

    if use_refresh:
        try:
            payload = decode_jwt_token(refresh_token)
            if payload.get('type') != 'refresh':
                clear_auth_cookie(response)
                return None
        except Exception:
            clear_auth_cookie(response)
            return None

    user_id = int(payload.get('sub'))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    if use_refresh:
        generate_jwt_token(user_id, user.username, response)

    return {
        'id': user.id,
        'username': user.username,
        'email': user.email
    }

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
