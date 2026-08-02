import pymysql

def alter_table():
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
            ALTER TABLE job_used_part_details 
            ADD COLUMN warranty_start_date DATE NULL,
            ADD COLUMN warranty_end_date DATE NULL;
            """
            cursor.execute(sql)
        connection.commit()
        print("Successfully added date columns to job_used_part_details table")
    except Exception as e:
        print(f"Error altering table: {e}")
    finally:
        if 'connection' in locals() and connection:
            connection.close()

if __name__ == '__main__':
    alter_table()
