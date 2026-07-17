"""
Create job_items table for dynamic items tracking
Replaces hard-coded boolean fields (items_charger, items_usb_cable, etc.)
"""
import mysql.connector
from mysql.connector import Error

def create_job_items_table():
    """Create job_items table with foreign key to jobs table"""
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='repair_center_db',
            user='root',
            password='root'
        )

        if connection.is_connected():
            cursor = connection.cursor()
            
            # Create job_items table
            create_table_query = """
            CREATE TABLE IF NOT EXISTS job_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                job_id INT NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                quantity INT DEFAULT 1,
                returned BOOLEAN DEFAULT FALSE,
                notes VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
                INDEX idx_job_id (job_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            
            cursor.execute(create_table_query)
            connection.commit()
            
            print("✅ Successfully created job_items table")
            print("Table structure:")
            print("  - id (INT, PK, AUTO_INCREMENT)")
            print("  - job_id (INT, FK to jobs.id, ON DELETE CASCADE)")
            print("  - item_name (VARCHAR(255), NOT NULL)")
            print("  - quantity (INT, DEFAULT 1)")
            print("  - returned (BOOLEAN, DEFAULT FALSE)")
            print("  - notes (VARCHAR(500))")
            print("  - created_at (TIMESTAMP)")
            print("  - updated_at (TIMESTAMP)")
            
            cursor.close()

    except Error as e:
        print(f"❌ Error creating job_items table: {e}")
        raise

    finally:
        if connection and connection.is_connected():
            connection.close()
            print("\n✅ Database connection closed")

if __name__ == "__main__":
    print("Creating job_items table...")
    print("-" * 60)
    create_job_items_table()
    print("-" * 60)
    print("Migration complete!")
