import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URI")
if not DATABASE_URL:
    DATABASE_URL = "mysql+pymysql://root:root@localhost/repair_center_db"
    
engine = create_engine(DATABASE_URL)

def alter_table():
    try:
        with engine.connect() as connection:
            sql = text("""
            ALTER TABLE job_used_part_details 
            ADD COLUMN warranty_start_date DATE NULL,
            ADD COLUMN warranty_end_date DATE NULL;
            """)
            connection.execute(sql)
            connection.commit()
        print("Successfully added date columns to job_used_part_details table")
    except Exception as e:
        print(f"Error altering table: {e}")

if __name__ == '__main__':
    alter_table()
