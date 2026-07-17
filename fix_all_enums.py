from sqlalchemy import create_engine, text
password = 'nadil44NNG1'
url = f'mysql+pymysql://admin:{password}@premier-db.cfqwowscgil6.eu-north-1.rds.amazonaws.com:3306/premier_db'
engine = create_engine(url)

# All the ALTER + UPDATE statements needed to convert everything to lowercase
# For each table: first ALTER the ENUM definition to include BOTH cases, then UPDATE data, then ALTER again to lowercase only

operations = [
    # --- notifications table ---
    # notification_type: convert ENUM to lowercase
    ("ALTER notifications.notification_type to include lowercase",
     """ALTER TABLE notifications MODIFY COLUMN notification_type 
        ENUM('JOB_ASSIGNED','PARTS_REQUEST_SUBMITTED','PARTS_REQUEST_APPROVED','PARTS_REQUEST_REJECTED',
             'ENGINEER_ESTIMATE_CREATED','CUSTOMER_ESTIMATE_SENT','ESTIMATE_APPROVED','ESTIMATE_REJECTED',
             'JOB_COMPLETED','JOB_READY_FOR_DELIVERY','GENERAL',
             'job_assigned','parts_request_submitted','parts_request_approved','parts_request_rejected',
             'engineer_estimate_created','customer_estimate_sent','estimate_approved','estimate_rejected',
             'job_completed','job_ready_for_delivery','general') NOT NULL"""),
    ("UPDATE notifications.notification_type to lowercase",
     "UPDATE notifications SET notification_type = LOWER(notification_type)"),
    ("ALTER notifications.notification_type to lowercase only",
     """ALTER TABLE notifications MODIFY COLUMN notification_type 
        ENUM('job_assigned','parts_request_submitted','parts_request_approved','parts_request_rejected',
             'engineer_estimate_created','customer_estimate_sent','estimate_approved','estimate_rejected',
             'job_completed','job_ready_for_delivery','general') NOT NULL"""),

    # channel: convert ENUM to lowercase
    ("ALTER notifications.channel to include lowercase",
     """ALTER TABLE notifications MODIFY COLUMN channel 
        ENUM('IN_APP','WHATSAPP','EMAIL','in_app','whatsapp','email') DEFAULT NULL"""),
    ("UPDATE notifications.channel to lowercase",
     "UPDATE notifications SET channel = LOWER(channel)"),
    ("ALTER notifications.channel to lowercase only",
     """ALTER TABLE notifications MODIFY COLUMN channel 
        ENUM('in_app','whatsapp','email') DEFAULT NULL"""),

    # --- parts_requests table ---
    ("ALTER parts_requests.status to include lowercase",
     """ALTER TABLE parts_requests MODIFY COLUMN status 
        ENUM('PENDING','APPROVED','PARTIALLY_APPROVED','REJECTED',
             'pending','approved','partially_approved','rejected') NOT NULL"""),
    ("UPDATE parts_requests.status to lowercase",
     "UPDATE parts_requests SET status = LOWER(status)"),
    ("ALTER parts_requests.status to lowercase only",
     """ALTER TABLE parts_requests MODIFY COLUMN status 
        ENUM('pending','approved','partially_approved','rejected') NOT NULL"""),

    # --- parts_request_items table ---
    ("ALTER parts_request_items.status to include lowercase",
     """ALTER TABLE parts_request_items MODIFY COLUMN status 
        ENUM('PENDING','APPROVED','REJECTED','ALTERNATIVE_PROVIDED','ISSUED','USED','RETURN_REQUESTED','RETURNED',
             'pending','approved','rejected','alternative_provided','issued','used','return_requested','returned') NOT NULL"""),
    ("UPDATE parts_request_items.status to lowercase",
     "UPDATE parts_request_items SET status = LOWER(status)"),
    ("ALTER parts_request_items.status to lowercase only",
     """ALTER TABLE parts_request_items MODIFY COLUMN status 
        ENUM('pending','approved','rejected','alternative_provided','issued','used','return_requested','returned') NOT NULL"""),

    # --- customer_estimates table ---
    ("ALTER customer_estimates.approval_status to include lowercase",
     """ALTER TABLE customer_estimates MODIFY COLUMN approval_status 
        ENUM('PENDING','APPROVED','REJECTED','PARTIALLY_APPROVED',
             'pending','approved','rejected','partially_approved') NOT NULL"""),
    ("UPDATE customer_estimates.approval_status to lowercase",
     "UPDATE customer_estimates SET approval_status = LOWER(approval_status)"),
    ("ALTER customer_estimates.approval_status to lowercase only",
     """ALTER TABLE customer_estimates MODIFY COLUMN approval_status 
        ENUM('pending','approved','rejected','partially_approved') NOT NULL"""),

    # --- customer_estimate_items table ---
    ("ALTER customer_estimate_items.approval_status to include lowercase",
     """ALTER TABLE customer_estimate_items MODIFY COLUMN approval_status 
        ENUM('PENDING','APPROVED','REJECTED','pending','approved','rejected') DEFAULT NULL"""),
    ("UPDATE customer_estimate_items.approval_status to lowercase",
     "UPDATE customer_estimate_items SET approval_status = LOWER(approval_status)"),
    ("ALTER customer_estimate_items.approval_status to lowercase only",
     """ALTER TABLE customer_estimate_items MODIFY COLUMN approval_status 
        ENUM('pending','approved','rejected') DEFAULT NULL"""),

    # --- engineer_estimate_items table (item_type) ---
    ("ALTER engineer_estimate_items.item_type to include lowercase",
     """ALTER TABLE engineer_estimate_items MODIFY COLUMN item_type 
        ENUM('PART','SERVICE','part','service') NOT NULL"""),
    ("UPDATE engineer_estimate_items.item_type to lowercase",
     "UPDATE engineer_estimate_items SET item_type = LOWER(item_type)"),
    ("ALTER engineer_estimate_items.item_type to lowercase only",
     """ALTER TABLE engineer_estimate_items MODIFY COLUMN item_type 
        ENUM('part','service') NOT NULL"""),

    # --- customer_estimate_items table (item_type) ---
    ("ALTER customer_estimate_items.item_type to include lowercase",
     """ALTER TABLE customer_estimate_items MODIFY COLUMN item_type 
        ENUM('PART','SERVICE','part','service') NOT NULL"""),
    ("UPDATE customer_estimate_items.item_type to lowercase",
     "UPDATE customer_estimate_items SET item_type = LOWER(item_type)"),
    ("ALTER customer_estimate_items.item_type to lowercase only",
     """ALTER TABLE customer_estimate_items MODIFY COLUMN item_type 
        ENUM('part','service') NOT NULL"""),
]

try:
    with engine.connect() as conn:
        for label, sql in operations:
            print(f"  {label}...")
            conn.execute(text(sql))
        conn.commit()
        print("\nAll ENUM columns successfully converted to lowercase!")
except Exception as e:
    print(f"\nFailed: {e}")
