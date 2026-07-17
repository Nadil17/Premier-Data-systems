from sqlalchemy import text
from app.core.database import engine

# Check parts_request_items status values
with engine.connect() as conn:
    result = conn.execute(text("SELECT id, status FROM parts_request_items LIMIT 10"))
    for row in result:
        print(f"ID: {row[0]}, Status: '{row[1]}'")
