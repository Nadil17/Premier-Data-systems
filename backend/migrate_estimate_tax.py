"""
Migration script to add subtotal, include_tax, tax_rate, and tax_amount to customer_estimates table.
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
            result = conn.execute(text("SHOW COLUMNS FROM customer_estimates"))
            columns = {row[0] for row in result}
        except Exception:
            # SQLite fallback
            result = conn.execute(text("PRAGMA table_info(customer_estimates)"))
            columns = {row[1] for row in result}

        print(f"Existing columns in customer_estimates: {columns}")
        changes_made = False

        if "subtotal" not in columns:
            conn.execute(text("ALTER TABLE customer_estimates ADD COLUMN subtotal FLOAT DEFAULT 0.0"))
            print("Added 'subtotal' column")
            changes_made = True

        if "include_tax" not in columns:
            conn.execute(text("ALTER TABLE customer_estimates ADD COLUMN include_tax BOOLEAN DEFAULT FALSE"))
            print("Added 'include_tax' column")
            changes_made = True

        if "tax_rate" not in columns:
            conn.execute(text("ALTER TABLE customer_estimates ADD COLUMN tax_rate FLOAT DEFAULT 0.0"))
            print("Added 'tax_rate' column")
            changes_made = True

        if "tax_amount" not in columns:
            conn.execute(text("ALTER TABLE customer_estimates ADD COLUMN tax_amount FLOAT DEFAULT 0.0"))
            print("Added 'tax_amount' column")
            changes_made = True

        # Backfill subtotal for existing rows where subtotal is 0 and total_amount > 0
        conn.execute(text("UPDATE customer_estimates SET subtotal = total_amount WHERE (subtotal IS NULL OR subtotal = 0.0) AND total_amount > 0"))

        conn.commit()

        if changes_made:
            print("\nMigration completed successfully!")
        else:
            print("\nNo changes needed - database is already up to date.")


if __name__ == "__main__":
    migrate()
