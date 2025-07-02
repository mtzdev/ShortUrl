from pytest import fixture
from fastapi import Response, Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import Session
from src.app import app
from src.db.models import table_registry
from src.db.database import get_db
from src.db.models import Link, User
from src.security import generate_password_hash, generate_jwt_token, generate_session_id
from unittest.mock import MagicMock

@fixture()
def client(db_session: Session):
    def get_db_override():
        return db_session

    with TestClient(app) as client:
        app.dependency_overrides[get_db] = get_db_override
        yield client

    app.dependency_overrides.clear()

@fixture()
def client_with_invalid_user(client):
    client.cookies.update({
        'access_token': 'invalid_token',
        'session_id': 'invalid_session_id'
    })
    return client

@fixture()
def logged_client(client, user):
    client.cookies.update({
        'access_token': user.token_jwt,
        'session_id': user.session_id
    })
    return client

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
def url_with_user(db_session: Session, user: User):
    url = Link(original_url='https://www.google.com/', short_url='abcde', user_id=user.id)
    db_session.add(url)
    db_session.commit()
    db_session.refresh(url)

    return url

@fixture()
def user(db_session: Session, request_mock: Request):
    clean_password = 'password123'
    user = User(username='User', email='user@test.com', password=generate_password_hash(clean_password))

    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    user.session_id = generate_session_id(Response())
    jwt = generate_jwt_token(user.id, user.username, user.session_id, request_mock, Response(), False, db_session)

    user.clean_password = clean_password
    user.token_jwt = jwt['access_token']
    user.token_refresh = jwt['refresh_token']
    return user

@fixture()
def request_mock():
    mock_request = MagicMock(spec=Request)
    mock_request.cookies = {}
    mock_request.headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'X-Forwarded-For': '127.0.0.1'}
    mock_request.url = "http://localhost:5173/"

    return mock_request

