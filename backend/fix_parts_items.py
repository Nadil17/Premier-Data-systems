from sqlalchemy import text
from app.core.database import engine

# Update parts_request_items status to uppercase
with engine.connect() as conn:
    result = conn.execute(text("UPDATE parts_request_items SET status = UPPER(status)"))
    conn.commit()
    print(f"Updated {result.rowcount} rows in parts_request_items status column")

print("Database update complete!")
