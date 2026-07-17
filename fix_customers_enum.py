from sqlalchemy import create_engine, text
password = 'nadil44NNG1'
url = f'mysql+pymysql://admin:{password}@premier-db.cfqwowscgil6.eu-north-1.rds.amazonaws.com:3306/premier_db'
engine = create_engine(url)

# Fix customers table ENUM too
operations = [
    ("ALTER customers.category to include lowercase",
     """ALTER TABLE customers MODIFY COLUMN category 
        ENUM('INDIVIDUAL','COMPANY','DEALER','individual','company','dealer') NOT NULL"""),
    ("UPDATE customers.category to lowercase",
     "UPDATE customers SET category = LOWER(category)"),
    ("ALTER customers.category to lowercase only",
     """ALTER TABLE customers MODIFY COLUMN category 
        ENUM('individual','company','dealer') NOT NULL"""),
]

try:
    with engine.connect() as conn:
        for label, sql in operations:
            print(f"  {label}...")
            conn.execute(text(sql))
        conn.commit()
        print("\nCustomers ENUM fixed!")
except Exception as e:
    print(f"\nFailed: {e}")
