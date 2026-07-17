from app.core.database import engine
from sqlalchemy import text

def run():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE jobs MODIFY COLUMN status ENUM('unassigned', 'assigned', 'in_progress', 'waiting_for_parts', 'waiting_for_estimate_approval', 'estimate_approved', 'estimate_rejected', 'repair_in_progress', 'repair_in_progress_handovered', 'completed', 'waiting_for_accountant_review', 'ready_for_delivery', 'delivered', 'cancelled') NOT NULL DEFAULT 'unassigned'"))
            print('Updated enum in jobs table')
        except Exception as e:
            print('Error altering jobs:', e)
run()
