import sqlite3

def migrate():
    # Production database
    db_paths = ['premier_data.db']
    
    for db_path in db_paths:
        print(f"Migrating {db_path}...")
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("ALTER TABLE customer_estimate_items ADD COLUMN approved_quantity INTEGER;")
            conn.commit()
            print(f"Successfully added approved_quantity to {db_path}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column already exists in {db_path}")
            else:
                print(f"Error migrating {db_path}: {e}")
        finally:
            if 'conn' in locals():
                conn.close()

if __name__ == "__main__":
    migrate()
