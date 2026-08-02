import pymysql

def create_table():
    try:
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='root',
            database='repair_center_db',
            cursorclass=pymysql.cursors.DictCursor
        )
        with connection.cursor() as cursor:
            sql = """
            CREATE TABLE IF NOT EXISTS job_used_part_details (
                id INT AUTO_INCREMENT PRIMARY KEY,
                job_id INT NOT NULL,
                part_id INT NOT NULL,
                serial_number VARCHAR(255) NOT NULL,
                warranty_period VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
                FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
                INDEX idx_job_id (job_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            cursor.execute(sql)
        connection.commit()
        print("? Successfully created job_used_part_details table")
    except Exception as e:
        print(f"? Error creating table: {e}")
    finally:
        if 'connection' in locals() and connection:
            connection.close()

if __name__ == '__main__':
    create_table()
