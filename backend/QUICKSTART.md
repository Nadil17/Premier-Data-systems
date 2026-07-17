# Quick Start Guide

## Initial Setup

### 1. Install Dependencies
```powershell
# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt
```

### 2. Configure Database
Create MySQL database:
```sql
CREATE DATABASE repair_center_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Set Environment Variables
Copy `.env.example` to `.env` and update:
```ini
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/repair_center_db
SECRET_KEY=your-generated-secret-key
```

Generate secret key:
```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4. Initialize Database
```powershell
python init_db.py
```

This creates all tables and default users.

### 5. Start Server
```powershell
python main.py
```

## Access API Documentation

Once running, visit: http://localhost:8000/api/docs

## Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Manager | manager | manager123 |
| Front Desk | frontdesk | frontdesk123 |
| Engineer | engineer1 | engineer123 |
| Storekeeper | storekeeper | store123 |
| Accountant | accountant | account123 |

**⚠️ IMPORTANT: Change these passwords in production!**

## Testing the API

### 1. Login
```powershell
# PowerShell
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" `
  -Method POST `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "username=admin&password=admin123"

$token = $response.access_token
```

### 2. Get Current User
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/me" `
  -Method GET `
  -Headers @{ "Authorization" = "Bearer $token" }
```

### 3. Create Customer
```powershell
$customer = @{
  name = "John Doe"
  phone_1 = "+1234567890"
  email = "john@example.com"
  category = "individual"
  address = "123 Main St"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/customers" `
  -Method POST `
  -Headers @{ 
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body $customer
```

## Common Tasks

### View All Customers
http://localhost:8000/api/v1/customers/search

### View Unassigned Jobs
http://localhost:8000/api/v1/jobs/unassigned

### Check Inventory
http://localhost:8000/api/v1/parts/inventory

### View Dashboard (Engineer)
http://localhost:8000/api/v1/dashboards/engineer

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check DATABASE_URL in .env
- Ensure database exists

### Import Errors
```powershell
pip install -r requirements.txt --upgrade
```

### Port Already in Use
```powershell
# Use different port
uvicorn main:app --port 8001
```

## Next Steps

1. Change default passwords
2. Configure Twilio for WhatsApp (optional)
3. Set up frontend application
4. Configure production deployment
5. Set up database backups

## Support

For detailed documentation, see README.md
