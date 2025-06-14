from pytest import fixture
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import Session
from src.app import app
from src.db.models import table_registry
from src.db.database import get_db
from src.db.models import Link, User
from src.security import generate_password_hash

@fixture()
def client(db_session: Session):
    def get_db_override():
        return db_session

    with TestClient(app) as client:
        app.dependency_overrides[get_db] = get_db_override
        yield client

    app.dependency_overrides.clear()

@fixture()
def db_session():
    engine = create_engine('sqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    table_registry.metadata.create_all(engine)
    session = Session(engine)

    try:
        yield session
    finally:
        session.close()
        table_registry.metadata.drop_all(engine)

@fixture()
def simple_url(db_session: Session):
    url = Link(original_url='https://www.google.com/', short_url='abcde', user_id=None)
    db_session.add(url)
    db_session.commit()
    db_session.refresh(url)

    return url

@fixture()
def protected_url(db_session: Session):
    clean_password = '123456'
    url = Link(original_url='https://www.google.com/', short_url='google', user_id=None, password=generate_password_hash(clean_password))
    db_session.add(url)
    db_session.commit()
    db_session.refresh(url)

    url.clean_password = clean_password
    return url

@fixture()
def user(db_session: Session):
    clean_password = 'password123'
    user = User(username='User', email='user@test.com', password=generate_password_hash(clean_password))

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    user.clean_password = clean_password
    return user