"""Database configuration and session management"""

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from typing import Generator

from app.core.config import settings

engine_kwargs = {
    "pool_pre_ping": True,
    "echo": settings.DEBUG,
}

if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_recycle"] = 3600

# Create SQLAlchemy engine
engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
