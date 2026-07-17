"""
Add RETURN_REQUESTED status to parts_request_items table enum
"""

import pymysql

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'root',
    'database': 'repair_center_db'
}

def update_enum():
    connection = None
    try:
        # Connect to database
        connection = pymysql.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("Connected to database successfully")
        
        # Modify the enum to add RETURN_REQUESTED status
        alter_query = """
        ALTER TABLE parts_request_items 
        MODIFY COLUMN status ENUM(
            'PENDING', 
            'APPROVED', 
            'REJECTED', 
            'ISSUED', 
            'USED', 
            'RETURN_REQUESTED',
            'RETURNED',
            'ALTERNATIVE_PROVIDED'
        ) NOT NULL DEFAULT 'PENDING'
        """
        
        print("Altering parts_request_items table to add RETURN_REQUESTED status...")
        cursor.execute(alter_query)
        connection.commit()
        
        print("✅ Successfully added RETURN_REQUESTED status to enum!")
        
        # Verify the change
        cursor.execute("SHOW COLUMNS FROM parts_request_items LIKE 'status'")
        result = cursor.fetchone()
        print("\nVerification - Current status column definition:")
        print(result)
        
        cursor.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if connection:
            connection.rollback()
    finally:
        if connection:
            connection.close()
            print("\nDatabase connection closed")

if __name__ == "__main__":
    print("=" * 60)
    print("Adding RETURN_REQUESTED status to parts_request_items enum")
    print("=" * 60)
    update_enum()
