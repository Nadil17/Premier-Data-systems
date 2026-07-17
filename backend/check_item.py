from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.parts import PartsRequestItem

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

item = db.query(PartsRequestItem).filter(PartsRequestItem.id == 67).first()
if item:
    print(f"Item 67: Status={item.status}, Issued={item.quantity_issued}, Used={item.quantity_used}, Returned={item.quantity_returned}, PendingReturn={item.quantity_pending_return}")
else:
    print("Item 67 not found")
