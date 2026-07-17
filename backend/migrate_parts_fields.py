"""
Migration script to add brand, model fields and update category column on parts table.
Converts category from enum to plain string to support dynamic categories.
Works with MySQL or SQLite based on DATABASE_URL in .env
"""

import os
import sys

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.core.database import engine


def migrate():
    with engine.connect() as conn:
        # Check existing columns
        # Works for both MySQL and SQLite
        try:
            # MySQL
            result = conn.execute(text("SHOW COLUMNS FROM parts"))
            columns = {row[0] for row in result}
        except Exception:
            # SQLite fallback
            result = conn.execute(text("PRAGMA table_info(parts)"))
            columns = {row[1] for row in result}

        print(f"Existing columns: {columns}")
        changes_made = False

        # Add brand column if missing
        if "brand" not in columns:
            conn.execute(text("ALTER TABLE parts ADD COLUMN brand VARCHAR(255)"))
            print("Added 'brand' column")
            changes_made = True
        else:
            print("'brand' column already exists")

        # Add model column if missing
        if "model" not in columns:
            conn.execute(text("ALTER TABLE parts ADD COLUMN model VARCHAR(255)"))
            print("Added 'model' column")
            changes_made = True
        else:
            print("'model' column already exists")

        # Migrate old category enum values to new values
        old_categories = ["hardware", "software", "accessory", "consumable"]
        for old_cat in old_categories:
            result = conn.execute(
                text("UPDATE parts SET category = 'other' WHERE category = :old_cat"),
                {"old_cat": old_cat}
            )
            if result.rowcount > 0:
                print(f"Migrated {result.rowcount} parts from category '{old_cat}' to 'other'")
                changes_made = True

        # Modify category column from ENUM to VARCHAR if MySQL
        try:
            conn.execute(text("ALTER TABLE parts MODIFY COLUMN category VARCHAR(50) NOT NULL DEFAULT 'other'"))
            print("Changed 'category' column from ENUM to VARCHAR(50)")
            changes_made = True
        except Exception as e:
            print(f"Category column type change skipped: {e}")

        conn.commit()

        if changes_made:
            print("\nMigration completed successfully!")
        else:
            print("\nNo changes needed - database is already up to date.")


if __name__ == "__main__":
    migrate()
