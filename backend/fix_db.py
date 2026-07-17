from app.core.database import engine, Base
from sqlalchemy import text
import app.models  # Import all models to ensure they're registered

def run():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN has_pending_handover BOOLEAN NOT NULL DEFAULT 0"))
            print("Added has_pending_handover to jobs")
        except Exception as e:
            print("Error altering jobs:", e)
            
    try:
        Base.metadata.create_all(engine)
        print("Ensured all tables exist via create_all")
    except Exception as e:
        print("Error in create_all:", e)

if __name__ == "__main__":
    run()
