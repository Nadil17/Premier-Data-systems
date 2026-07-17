"""
Remove old hard-coded item columns from jobs table
These are being replaced by the job_items table
"""
import mysql.connector
from mysql.connector import Error

def remove_old_item_columns():
    """Remove hard-coded item columns from jobs table"""
    try:
        connection = mysql.connector.connect(
            host='localhost',
            database='repair_center_db',
            user='root',
            password='root'
        )

        if connection.is_connected():
            cursor = connection.cursor()
            
            columns_to_remove = [
                'items_charger',
                'items_usb_cable',
                'items_printer_cable',
                'items_toner',
                'items_other',
                'items_returned_charger',
                'items_returned_usb_cable',
                'items_returned_printer_cable',
                'items_returned_toner',
                'items_returned_other'
            ]
            
            print("Removing old item columns from jobs table...")
            print("-" * 60)
            
            for column in columns_to_remove:
                try:
                    alter_query = f"ALTER TABLE jobs DROP COLUMN {column};"
                    cursor.execute(alter_query)
                    print(f"✅ Dropped column: {column}")
                except Error as e:
                    if "Can't DROP" in str(e):
                        print(f"⚠️  Column {column} doesn't exist, skipping...")
                    else:
                        raise
            
            connection.commit()
            print("-" * 60)
            print("✅ Successfully removed old item columns")
            print("\nNew structure uses job_items table for flexible item tracking")
            
            cursor.close()

    except Error as e:
        print(f"❌ Error removing columns: {e}")
        raise

    finally:
        if connection and connection.is_connected():
            connection.close()
            print("\n✅ Database connection closed")

if __name__ == "__main__":
    print("Removing old hard-coded item columns from jobs table...")
    print("=" * 60)
    remove_old_item_columns()
    print("=" * 60)
    print("Migration complete!")
