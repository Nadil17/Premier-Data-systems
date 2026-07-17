"""
Fix all uppercase enum columns by:
1. Temporarily converting to VARCHAR
2. Lowercasing all data
3. Converting back to lowercase enum
"""
import pymysql

conn = pymysql.connect(host='localhost', user='root', password='root', database='repair_center_db')
c = conn.cursor()

# Get all enum columns per table
c.execute("""
    SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'repair_center_db'
    AND DATA_TYPE = 'enum'
    ORDER BY TABLE_NAME, COLUMN_NAME
""")

enum_columns = c.fetchall()
print(f"Found {len(enum_columns)} enum columns:\n")

for table, column, col_type, nullable, default in enum_columns:
    # Parse enum values
    vals_str = col_type[5:-1]  # strip 'enum(' and ')'
    vals = [v.strip("'") for v in vals_str.split(",")]
    
    # Check if there are any uppercase values
    has_upper = any(v != v.lower() for v in vals)
    if not has_upper:
        print(f"SKIP {table}.{column} (already lowercase)")
        continue

    print(f"FIX  {table}.{column}: {vals}")
    lower_vals = list(dict.fromkeys(v.lower() for v in vals))  # deduplicated lowercase
    lower_vals_sql = ",".join(f"'{v}'" for v in lower_vals)
    null_clause = "NULL" if nullable == "YES" else "NOT NULL"
    
    try:
        # Step 1: Change to VARCHAR to bypass enum restriction
        c.execute(f"ALTER TABLE `{table}` MODIFY COLUMN `{column}` VARCHAR(100) {null_clause}")
        conn.commit()
        
        # Step 2: Lowercase all values
        c.execute(f"UPDATE `{table}` SET `{column}` = LOWER(`{column}`)")
        conn.commit()
        
        # Step 3: Convert back to lowercase enum
        c.execute(f"ALTER TABLE `{table}` MODIFY COLUMN `{column}` ENUM({lower_vals_sql}) {null_clause}")
        conn.commit()
        
        print(f"     -> Done! New values: {lower_vals}")

    except Exception as e:
        print(f"     -> ERROR: {e}")
        conn.rollback()

conn.close()
print("\n=== All done ===")
