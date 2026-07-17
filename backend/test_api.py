"""
API Testing Examples
Run these in Python shell or as a script
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

class APITester:
    def __init__(self):
        self.token = None
        self.customer_id = None
        self.job_id = None
    
    def login(self, username="admin", password="admin123"):
        """Login and get token"""
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data={"username": username, "password": password}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data["access_token"]
            print(f"✓ Logged in as {data['user']['full_name']}")
            return True
        else:
            print(f"✗ Login failed: {response.text}")
            return False
    
    def get_headers(self):
        """Get authorization headers"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def create_customer(self):
        """Create a test customer"""
        customer_data = {
            "name": "Test Customer",
            "company_name": "Test Company Ltd",
            "phone_1": "+1234567890",
            "phone_2": "+1234567891",
            "email": "test@example.com",
            "address": "123 Test Street, Test City",
            "category": "company",
            "vat_number": "VAT123456",
            "remarks": "Test customer for API testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/customers",
            headers=self.get_headers(),
            json=customer_data
        )
        
        if response.status_code == 201:
            data = response.json()
            self.customer_id = data["id"]
            print(f"✓ Customer created: {data['customer_id']} - {data['name']}")
            return data
        else:
            print(f"✗ Customer creation failed: {response.text}")
            return None
    
    def search_customers(self, query="Test"):
        """Search for customers"""
        response = requests.get(
            f"{BASE_URL}/customers/search",
            headers=self.get_headers(),
            params={"query": query}
        )
        
        if response.status_code == 200:
            customers = response.json()
            print(f"✓ Found {len(customers)} customer(s)")
            for customer in customers:
                print(f"  - {customer['customer_id']}: {customer['name']}")
            return customers
        else:
            print(f"✗ Search failed: {response.text}")
            return []
    
    def create_job(self):
        """Create a test job"""
        if not self.customer_id:
            print("✗ No customer ID available. Create customer first.")
            return None
        
        job_data = {
            "customer_id": self.customer_id,
            "reported_by": "Test Reporter",
            "additional_phone": "+1234567892",
            "machine_model": "HP EliteBook 840 G5",
            "serial_number": "TEST123456789",
            "fault_description": "Screen not displaying, making beeping sounds",
            "items_charger": True,
            "items_usb_cable": False,
            "items_printer_cable": False,
            "items_toner": False,
            "items_other": "Laptop bag",
            "job_type": "in_house",
            "job_category": "chargeable",
            "remarks": "Customer needs urgent repair"
        }
        
        response = requests.post(
            f"{BASE_URL}/jobs",
            headers=self.get_headers(),
            json=job_data
        )
        
        if response.status_code == 201:
            data = response.json()
            self.job_id = data["id"]
            print(f"✓ Job created: {data['job_number']}")
            print(f"  Machine: {data['machine_model']}")
            print(f"  Status: {data['status']}")
            return data
        else:
            print(f"✗ Job creation failed: {response.text}")
            return None
    
    def get_unassigned_jobs(self):
        """Get unassigned jobs"""
        response = requests.get(
            f"{BASE_URL}/jobs/unassigned",
            headers=self.get_headers()
        )
        
        if response.status_code == 200:
            jobs = response.json()
            print(f"✓ Found {len(jobs)} unassigned job(s)")
            for job in jobs:
                print(f"  - {job['job_number']}: {job['machine_model']}")
            return jobs
        else:
            print(f"✗ Failed to get jobs: {response.text}")
            return []
    
    def get_inventory(self):
        """Get parts inventory"""
        response = requests.get(
            f"{BASE_URL}/parts/inventory",
            headers=self.get_headers()
        )
        
        if response.status_code == 200:
            parts = response.json()
            print(f"✓ Found {len(parts)} part(s) in inventory")
            for part in parts[:5]:  # Show first 5
                print(f"  - {part['part_number']}: {part['name']} (Stock: {part['quantity_in_stock']})")
            return parts
        else:
            print(f"✗ Failed to get inventory: {response.text}")
            return []
    
    def get_engineer_dashboard(self):
        """Get engineer dashboard (need to login as engineer)"""
        # Login as engineer
        self.login("engineer1", "engineer123")
        
        response = requests.get(
            f"{BASE_URL}/dashboards/engineer",
            headers=self.get_headers()
        )
        
        if response.status_code == 200:
            dashboard = response.json()
            print("✓ Engineer Dashboard:")
            print(f"  Total Assigned Jobs: {dashboard['total_assigned_jobs']}")
            print(f"  Pending Jobs: {dashboard['pending_jobs']}")
            print(f"  Completed Jobs: {dashboard['completed_jobs']}")
            return dashboard
        else:
            print(f"✗ Failed to get dashboard: {response.text}")
            return None
    
    def run_all_tests(self):
        """Run all tests"""
        print("\n" + "="*60)
        print("REPAIR CENTER API TESTING")
        print("="*60 + "\n")
        
        # Login
        if not self.login():
            return
        
        print("\n--- Customer Management ---")
        self.create_customer()
        self.search_customers()
        
        print("\n--- Job Management ---")
        self.create_job()
        self.get_unassigned_jobs()
        
        print("\n--- Parts Inventory ---")
        self.get_inventory()
        
        print("\n--- Engineer Dashboard ---")
        self.get_engineer_dashboard()
        
        print("\n" + "="*60)
        print("TESTING COMPLETE")
        print("="*60 + "\n")


if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()
