from sqlalchemy import text
from app.core.database import engine

# Directly alter the enum to use uppercase values
# MySQL will automatically convert existing data
with engine.connect() as conn:
    conn.execute(text("""
        ALTER TABLE parts_request_items 
        MODIFY COLUMN status ENUM(
            'PENDING','APPROVED','REJECTED','ALTERNATIVE_PROVIDED','ISSUED','USED','RETURNED','RETURN_REQUESTED'
        ) NOT NULL DEFAULT 'PENDING'
    """))
    conn.commit()
    print("Updated parts_request_items status column to use uppercase enum values")

print("Database schema update complete!")
