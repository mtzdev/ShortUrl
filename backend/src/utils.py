import re
import string
from random import choices
from fastapi import Request
from src.db.models import Link
from slowapi import Limiter

def get_user_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.headers.get('cf-connecting-ip')

def get_user_agent(request: Request) -> str:
    return request.headers.get('User-Agent', 'Unknown')

limiter = Limiter(key_func=get_user_ip)

def validate_short_url(short_url: str | None, db = None, auto_generate = True):
    if not short_url or short_url.strip() == "":
        if auto_generate:
            return generate_short_url(db)
        else:
            return False

    blacklist = ['links', 'auth', 'perfil', 'api', 'admin']
    if short_url in blacklist:
        return False

    if not re.fullmatch(r"^[a-zA-Z0-9_-]{3,16}$", short_url):
        return False

    return short_url

def generate_short_url(db):
    chars = string.ascii_letters + string.digits
    while True:
        short_url = ''.join(choices(chars, k=8))

        if not db.query(Link).filter(Link.short_url == short_url).first():
            db.close()
            return short_url

def validate_username(username: str) -> bool:
    if len(username) < 3 or len(username) > 16:
        return False

    if not re.match(r'^[a-zA-Z0-9_-]{3,16}$', username):
        return False

    return True

def validate_email(email: str) -> bool:
    if not email or len(email) > 254:
        return False

    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    if not re.match(pattern, email):
        return False

    if '..' in email:
        return False

    return True

def validate_password(password: str) -> bool:
    if len(password) < 8:
        return False

    if not re.search(r'[a-zA-Z]', password):
        return False

    if not re.search(r'[0-9]', password):
        return False

    return True