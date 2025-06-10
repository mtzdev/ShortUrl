from fastapi import HTTPException, Request, Depends
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

def generate_jwt_token(user_id: int, username):
    payload = {
        'sub': str(user_id),
        'username': username,
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION_TIME)
    }
    jwt = encode(payload, JWT_SECRET_KEY, algorithm='HS256')
    return {'access_token': jwt, 'token_type': 'Bearer'}

def decode_jwt_token(token: str):
    try:
        jwt = decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except (InvalidAlgorithmError, InvalidSignatureError, InvalidTokenError):
        raise HTTPException(status_code=401, detail='Invalid token')

    return jwt

def get_token_from_header(request: Request):
    authorization = request.headers.get('Authorization')
    if not authorization:
        return None

    try:
        scheme, token = authorization.split(' ')
        if scheme.lower() != 'bearer':
            return None
        return token
    except ValueError:
        return None

def get_user(request: Request, db: Session = Depends(get_db)):
    token = get_token_from_header(request)
    if not token:
        return None

    try:
        payload = decode_jwt_token(token)
        user_id = int(payload.get('sub'))
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        return {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    except Exception:
        return None
