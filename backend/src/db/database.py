from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.settings import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}) # TODO: remover quando migrar pra Postgre
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():  # pragma: no cover
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()