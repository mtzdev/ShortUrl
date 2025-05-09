from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['argon2'], deprecated='auto')

def generate_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)
