"""Utility functions for generating unique IDs"""

from datetime import datetime
import random
import string


def generate_customer_id() -> str:
    """Generate unique customer ID: CUS-YYYYMMDD-XXXX"""
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = ''.join(random.choices(string.digits, k=4))
    return f"CUS-{date_part}-{random_part}"


def generate_job_number() -> str:
    """Generate unique job number: JOB-YYYYMMDD-XXXX"""
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = ''.join(random.choices(string.digits, k=4))
    return f"JOB-{date_part}-{random_part}"


def generate_parts_request_number() -> str:
    """Generate unique parts request number: PR-YYYYMMDD-XXXX"""
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = ''.join(random.choices(string.digits, k=4))
    return f"PR-{date_part}-{random_part}"


def generate_engineer_estimate_number() -> str:
    """Generate unique engineer estimate number: EE-YYYYMMDD-XXXX"""
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = ''.join(random.choices(string.digits, k=4))
    return f"EE-{date_part}-{random_part}"


def generate_customer_estimate_number() -> str:
    """Generate unique customer estimate number: CE-YYYYMMDD-XXXX"""
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = ''.join(random.choices(string.digits, k=4))
    return f"CE-{date_part}-{random_part}"


def generate_otp(length: int = 6) -> str:
    """Generate OTP code"""
    return ''.join(random.choices(string.digits, k=length))
