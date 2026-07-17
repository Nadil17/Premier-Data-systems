import sqlalchemy
import os
from dotenv import load_dotenv

def run():
    load_dotenv()
    url = os.getenv("DATABASE_URL")
    if not url:
        print("No DATABASE_URL found")
        return
        
    print(f"Connecting to {url}...")
    engine = sqlalchemy.create_engine(url)
    with engine.connect() as conn:
        try:
            conn.execute(sqlalchemy.text("ALTER TABLE customer_estimate_items ADD COLUMN approved_quantity INT;"))
            conn.commit()
            print("Successfully added approved_quantity")
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    run()
