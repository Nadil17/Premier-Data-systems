from app.core.database import engine
from sqlalchemy import text

with engine.begin() as conn:
    res = conn.execute(text("SELECT id, status FROM jobs"))
    for row in res:
        print(row)
