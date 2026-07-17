from sqlalchemy import text
from app.core.database import engine

# Check BINARY comparison to see actual case
with engine.connect() as conn:
    result = conn.execute(text("SELECT id, status, BINARY status as binary_status FROM parts_request_items LIMIT 10"))
    for row in result:
        print(f"ID: {row[0]}, Status: '{row[1]}', Binary: {row[2]}")
