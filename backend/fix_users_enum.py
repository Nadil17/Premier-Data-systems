import pymysql

conn = pymysql.connect(host='localhost', user='root', password='root', database='repair_center_db')
c = conn.cursor()

try:
    print("Altering enum to accept uppercase...")
    c.execute("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'manager', 'front_desk', 'engineer', 'storekeeper', 'accountant', 'ADMIN', 'MANAGER', 'FRONT_DESK', 'ENGINEER', 'STOREKEEPER', 'ACCOUNTANT')")
    
    print("Converting roles to lowercase...")
    c.execute("UPDATE users SET role = LOWER(role)")
    
    print("Reverting enum to lowercase only...")
    c.execute("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'manager', 'front_desk', 'engineer', 'storekeeper', 'accountant')")
    
    conn.commit()
    print("Success!")
except Exception as e:
    print("Error:", e)
    conn.rollback()
finally:
    conn.close()
