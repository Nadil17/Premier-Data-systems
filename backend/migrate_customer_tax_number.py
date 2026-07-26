"""
Migration script to add tax_number to customers table.
Works with MySQL or SQLite based on DATABASE_URL in .env
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.core.database import engine


def migrate():
    with engine.connect() as conn:
        try:
            # MySQL
            result = conn.execute(text("SHOW COLUMNS FROM customers"))
            columns = {row[0] for row in result}
        except Exception:
            # SQLite fallback
            result = conn.execute(text("PRAGMA table_info(customers)"))
            columns = {row[1] for row in result}

        print(f"Existing columns in customers: {columns}")
        changes_made = False

        if "tax_number" not in columns:
            conn.execute(text("ALTER TABLE customers ADD COLUMN tax_number VARCHAR(50)"))
            print("Added 'tax_number' column")
            changes_made = True

            # If vat_number exists, populate tax_number from vat_number where tax_number is NULL
            if "vat_number" in columns:
                conn.execute(text("UPDATE customers SET tax_number = vat_number WHERE tax_number IS NULL AND vat_number IS NOT NULL AND vat_number != ''"))
                print("Populated 'tax_number' from existing 'vat_number' values")

        conn.commit()

        if changes_made:
            print("\nMigration completed successfully!")
        else:
            print("\nNo changes needed - database is already up to date.")


if __name__ == "__main__":
    migrate()
