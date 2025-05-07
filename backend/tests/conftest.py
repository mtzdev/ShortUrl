from pytest import fixture
from fastapi.testclient import TestClient
from src.app import app
from src.db.models import table_registry
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import Session
from src.db.database import get_db

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
