from sqlalchemy import create_engine, text
password = 'nadil44NNG1'
url = f'mysql+pymysql://admin:{password}@premier-db.cfqwowscgil6.eu-north-1.rds.amazonaws.com:3306/premier_db'
engine = create_engine(url)

# Step 1: Show all current ENUM columns and their data
check_queries = [
    ("users roles", "SELECT DISTINCT role FROM users"),
    ("jobs status", "SELECT DISTINCT status FROM jobs"),
    ("jobs job_type", "SELECT DISTINCT job_type FROM jobs"),
    ("jobs job_category", "SELECT DISTINCT job_category FROM jobs"),
    ("notifications type", "SELECT DISTINCT notification_type FROM notifications"),
    ("notifications channel", "SELECT DISTINCT channel FROM notifications"),
    ("parts_requests status", "SELECT DISTINCT status FROM parts_requests"),
    ("parts_request_items status", "SELECT DISTINCT status FROM parts_request_items"),
]

with engine.connect() as conn:
    for label, q in check_queries:
        try:
            res = conn.execute(text(q))
            vals = [str(row[0]) for row in res]
            print(f"{label}: {vals}")
        except Exception as e:
            print(f"{label}: ERROR - {e}")

    # Show ENUM definitions for all tables with ENUMs
    tables_to_check = ['users', 'jobs', 'notifications', 'parts_requests', 'parts_request_items', 
                       'engineer_estimates', 'customer_estimates', 'parts_handovers']
    print("\n--- ENUM COLUMN DEFINITIONS ---")
    for table in tables_to_check:
        try:
            res = conn.execute(text(f"SHOW CREATE TABLE {table}"))
            for row in res:
                # Extract just ENUM lines
                for line in str(row[1]).split('\n'):
                    if 'enum' in line.lower():
                        print(f"  {table}: {line.strip()}")
        except Exception as e:
            print(f"  {table}: ERROR - {e}")
