import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), "premier_data.db")
    if not os.path.exists(db_path):
        print("Database not found, skipping migration.")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Add has_pending_handover to jobs
        cursor.execute("ALTER TABLE jobs ADD COLUMN has_pending_handover BOOLEAN NOT NULL DEFAULT 0")
        print("Added has_pending_handover column to jobs table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("has_pending_handover column already exists.")
        else:
            print(f"Error altering jobs table: {e}")

    try:
        # Create parts_handovers table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS parts_handovers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER NOT NULL,
                previous_engineer_id INTEGER NOT NULL,
                new_engineer_id INTEGER NOT NULL,
                part_id INTEGER NOT NULL,
                request_item_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                transferred_at DATETIME,
                received_at DATETIME,
                FOREIGN KEY(job_id) REFERENCES jobs(id),
                FOREIGN KEY(previous_engineer_id) REFERENCES users(id),
                FOREIGN KEY(new_engineer_id) REFERENCES users(id),
                FOREIGN KEY(part_id) REFERENCES parts(id),
                FOREIGN KEY(request_item_id) REFERENCES parts_request_items(id)
            )
        """)
        print("Created parts_handovers table.")
    except Exception as e:
        print(f"Error creating parts_handovers table: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
