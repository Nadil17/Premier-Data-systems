from sqlalchemy import text
from app.core.database import engine

# Check table structure
with engine.connect() as conn:
    result = conn.execute(text("SHOW CREATE TABLE parts_request_items"))
    for row in result:
        print(row[1])
