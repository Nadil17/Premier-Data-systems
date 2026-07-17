import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TEST_DB_PATH = Path(__file__).parent / "test_app.db"

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["DEBUG"] = "false"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["FRONTEND_URL"] = "http://localhost:5173"
os.environ["ULTRAMSG_INSTANCE_ID"] = ""
os.environ["ULTRAMSG_TOKEN"] = ""

from main import app
from app.core.database import Base, SessionLocal, engine
from app.core.security import create_access_token, get_password_hash
from app.models.user import User, UserRole


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def create_user(db_session):
    def _create_user(
        username: str,
        role: UserRole = UserRole.ADMIN,
        password: str = "password123",
        email: str | None = None,
    ) -> User:
        user = User(
            username=username,
            email=email or f"{username}@example.com",
            hashed_password=get_password_hash(password),
            full_name=username.replace("_", " ").title(),
            role=role,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _create_user


@pytest.fixture
def auth_headers():
    def _auth_headers(user: User) -> dict[str, str]:
        token = create_access_token(data={"sub": str(user.id)})
        return {"Authorization": f"Bearer {token}"}

    return _auth_headers
