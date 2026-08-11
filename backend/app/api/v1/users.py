from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.core.security import get_password_hash
from app.core.time import utc_now

router = APIRouter(prefix="/users", tags=["Users"])


def require_admin(current_user: User = Depends(get_current_user)):
    """Allow ADMIN, FRONT_DESK, and ACCOUNTANT (admin-equivalent) roles."""
    if current_user.role not in (UserRole.ADMIN, UserRole.FRONT_DESK, UserRole.ACCOUNTANT):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access this resource"
        )
    return current_user


@router.get("", response_model=List[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get list of all users. Only accessible by admins.
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new user. Only accessible by admins.
    """
    # Check if username exists
    user_exists = db.query(User).filter(User.username == user_in.username).first()
    if user_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
        
    # Check if email exists
    email_exists = db.query(User).filter(User.email == user_in.email).first()
    if email_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash the password
    hashed_password = get_password_hash(user_in.password)
    
    # Create user object
    db_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        phone=user_in.phone,
        role=user_in.role,
        hashed_password=hashed_password,
        is_active=True,
        created_at=utc_now()
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user
