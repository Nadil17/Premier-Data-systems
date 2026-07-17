import pymysql

conn = pymysql.connect(host='localhost', user='root', password='root', database='repair_center_db')
c = conn.cursor()
try:
    c.execute("UPDATE users SET role = LOWER(role)")
    conn.commit()
    print("Roles updated successfully")
except Exception as e:
    print("Error:", e)
finally:
    conn.close()
