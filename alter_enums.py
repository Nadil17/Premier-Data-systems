from sqlalchemy import create_engine, text
password = 'nadil44NNG1'
url = f'mysql+pymysql://admin:{password}@premier-db.cfqwowscgil6.eu-north-1.rds.amazonaws.com:3306/premier_db'
engine = create_engine(url)

queries = [
    "ALTER TABLE users MODIFY COLUMN role ENUM('admin','manager','front_desk','engineer','storekeeper','accountant') NOT NULL",
    "ALTER TABLE jobs MODIFY COLUMN job_type ENUM('in_house','field') NOT NULL",
    "ALTER TABLE jobs MODIFY COLUMN job_category ENUM('warranty','chargeable','agreement') NOT NULL",
    "ALTER TABLE jobs MODIFY COLUMN status ENUM('unassigned','assigned','in_progress','waiting_for_parts','waiting_for_estimate_approval','estimate_approved','estimate_rejected','repair_in_progress','repair_in_progress_handovered','completed','waiting_for_accountant_review','ready_for_delivery','delivered','cancelled') NOT NULL",
    "ALTER TABLE parts_handovers MODIFY COLUMN status ENUM('pending','transferred','received','returned_to_store') NOT NULL"
]

try:
    with engine.connect() as conn:
        for q in queries:
            print('Executing:', q)
            conn.execute(text(q))
        conn.commit()
        print('All enums successfully changed to lowercase!')
except Exception as e:
    print('Failed:', e)
