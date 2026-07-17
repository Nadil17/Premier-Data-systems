"""
Migration script: Convert Job brand/model/machine_category from string columns to FK columns.

This script:
1. Drops the old string columns (brand, model, machine_category)
2. Adds new FK integer columns (brand_id, model_id, machine_category_id)
3. Adds foreign key constraints referencing brands, models, categories tables

Run: python migrate_job_lookups.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from sqlalchemy import text


def migrate():
    with engine.connect() as conn:
        # Check which columns currently exist
        result = conn.execute(text("DESCRIBE jobs"))
        existing_columns = {row[0] for row in result.fetchall()}
        print(f"Existing columns: {existing_columns}")

        # Step 1: Drop old string columns if they exist
        for col in ['brand', 'model', 'machine_category']:
            if col in existing_columns:
                print(f"  Dropping column '{col}'...")
                conn.execute(text(f"ALTER TABLE jobs DROP COLUMN `{col}`"))
                print(f"  ✓ Dropped '{col}'")
            else:
                print(f"  Column '{col}' does not exist, skipping drop.")

        # Step 2: Add new FK columns if they don't exist
        fk_columns = {
            'brand_id': ('INT', 'brands', 'id', 'fk_jobs_brand_id'),
            'model_id': ('INT', 'models', 'id', 'fk_jobs_model_id'),
            'machine_category_id': ('INT', 'categories', 'id', 'fk_jobs_machine_category_id'),
        }

        for col_name, (col_type, ref_table, ref_col, fk_name) in fk_columns.items():
            if col_name not in existing_columns:
                print(f"  Adding column '{col_name}'...")
                conn.execute(text(
                    f"ALTER TABLE jobs ADD COLUMN `{col_name}` {col_type} NULL"
                ))
                print(f"  ✓ Added '{col_name}'")

                # Add foreign key constraint
                try:
                    conn.execute(text(
                        f"ALTER TABLE jobs ADD CONSTRAINT `{fk_name}` "
                        f"FOREIGN KEY (`{col_name}`) REFERENCES `{ref_table}`(`{ref_col}`)"
                    ))
                    print(f"  ✓ Added FK constraint '{fk_name}'")
                except Exception as e:
                    print(f"  ⚠ FK constraint '{fk_name}' may already exist: {e}")
            else:
                print(f"  Column '{col_name}' already exists, skipping add.")

        conn.commit()
        print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    migrate()
