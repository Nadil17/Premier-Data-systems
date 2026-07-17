
import sys
import os
import logging
from fastapi.testclient import TestClient
from jose import jwt

# Disable logging
logging.basicConfig(level=logging.CRITICAL)
logging.getLogger("sqlalchemy.engine").setLevel(logging.CRITICAL)
logging.getLogger("uvicorn").setLevel(logging.CRITICAL)
logging.getLogger("fastapi").setLevel(logging.CRITICAL)

# Add current directory to path so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app
from app.core.config import settings

client = TestClient(app)

def debug_auth():
    print(f"SECRET_KEY: {settings.SECRET_KEY}")
    print(f"ALGORITHM: {settings.ALGORITHM}")
    
    # 1. Login
    print("\n1. Logging in...")
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    response = client.post("/api/v1/auth/login", data=login_data)
    
    if response.status_code != 200:
        print(f"Login failed: {response.status_code} {response.text}")
        return
        
    token_data = response.json()
    access_token = token_data["access_token"]
    print(f"Login successful. Token: {access_token[:20]}...")
    
    # 2. Decode Token manually
    print("\n2. Decoding token manually...")
    try:
        payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        print(f"Decoded payload: {payload}")
        sub = payload.get('sub')
        print(f"sub: {sub}")
        print(f"sub type: {type(sub)}")
    except Exception as e:
        print(f"Failed to decode token: {e}")
        
    # 3. Access Manager Dashboard
    print("\n3. Accessing Manager Dashboard...")
    headers = {"Authorization": f"Bearer {access_token}"}
    response = client.get("/api/v1/dashboards/manager", headers=headers)
    
    if response.status_code == 200:
        print("Dashboard access successful!")
    else:
        print(f"Dashboard access failed: {response.status_code} {response.text}")

if __name__ == "__main__":
    debug_auth()
