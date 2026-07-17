import pymysql

conn = pymysql.connect(host='localhost', user='root', password='root', database='repair_center_db')
c = conn.cursor()
try:
    c.execute("ALTER TABLE users MODIFY COLUMN role enum('admin','manager','front_desk','engineer','storekeeper','accountant') NOT NULL")
    conn.commit()
    print("Altered")
except Exception as e:
    print("Error:", e)
finally:
    conn.close()
