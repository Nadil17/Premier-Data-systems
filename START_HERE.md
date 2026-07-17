# 🚀 START HERE - Setup Instructions

## Welcome to the Repair Center Management System!

This document will get you up and running in **5 minutes**.

---

## ✅ Prerequisites Check

Before starting, ensure you have:
- [ ] Python 3.9 or higher installed
- [ ] MySQL 8.0 or higher installed and running
- [ ] PowerShell (Windows) or Terminal access
- [ ] Internet connection (for package downloads)

---

## 📋 Step-by-Step Setup

### Step 1: Open PowerShell in Backend Directory
```powershell
cd "C:\Users\user\Desktop\Premier Data Systems\backend"
```

### Step 2: Create Virtual Environment
```powershell
python -m venv venv
```

### Step 3: Activate Virtual Environment
```powershell
.\venv\Scripts\Activate.ps1
```

You should see `(venv)` in your terminal prompt.

### Step 4: Install Dependencies
```powershell
pip install -r requirements.txt
```

This will take 2-3 minutes. Wait for it to complete.

### Step 5: Create MySQL Database

Open MySQL command line or MySQL Workbench and run:
```sql
CREATE DATABASE repair_center_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or using MySQL command line:
```powershell
mysql -u root -p -e "CREATE DATABASE repair_center_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Step 6: Configure Environment

Copy the example environment file:
```powershell
Copy-Item .env.example .env
```

Open `.env` in a text editor and update:

**REQUIRED CHANGES:**
```ini
# Update with your MySQL credentials
DATABASE_URL=mysql+pymysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/repair_center_db

# Generate a new secret key
# Run: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=PASTE_YOUR_GENERATED_SECRET_KEY_HERE
```

To generate secret key, run:
```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```
Copy the output and paste it as your SECRET_KEY.

**OPTIONAL (for WhatsApp):**
```ini
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Step 7: Initialize Database
```powershell
python init_db.py
```

You should see:
```
✓ Database tables created successfully
✓ Initial users created successfully
✓ Sample parts created successfully

DATABASE INITIALIZATION COMPLETE
```

### Step 8: Start the Server
```powershell
python main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### Step 9: Open API Documentation
Open your browser and go to:
**http://localhost:8000/api/docs**

You should see the Swagger UI with all API endpoints!

---

## 🎯 Quick Test

### Test 1: Login via Swagger UI

1. Go to http://localhost:8000/api/docs
2. Click on `POST /api/v1/auth/login`
3. Click "Try it out"
4. Enter:
   - username: `admin`
   - password: `admin123`
5. Click "Execute"
6. You should get a response with `access_token`

### Test 2: Use the Token

1. Copy the `access_token` from the login response
2. Click the "Authorize" button at the top of the page
3. Paste the token in the format: `Bearer YOUR_TOKEN`
4. Click "Authorize"
5. Now you can test all authenticated endpoints!

### Test 3: Run Automated Tests
```powershell
python test_api.py
```

You should see:
```
✓ Logged in as System Administrator
✓ Customer created: CUS-XXXXXXXX-XXXX
✓ Job created: JOB-XXXXXXXX-XXXX
✓ Found X part(s) in inventory
```

---

## 🔐 Default Login Credentials

| Role | Username | Password | Use Case |
|------|----------|----------|----------|
| Admin | admin | admin123 | Full access |
| Manager | manager | manager123 | Job assignment |
| Front Desk | frontdesk | frontdesk123 | Customer registration |
| Engineer | engineer1 | engineer123 | Repair work |
| Storekeeper | storekeeper | store123 | Parts management |
| Accountant | accountant | account123 | Estimates |

**⚠️ IMPORTANT: Change these passwords before production use!**

---

## 🎮 Try These Actions

### As Front Desk (Create Customer)
1. Login as `frontdesk`
2. POST `/api/v1/customers`
3. Create a test customer

### As Front Desk (Create Job)
1. Use the customer ID from above
2. POST `/api/v1/jobs`
3. Create a repair job

### As Manager (Assign Job)
1. Login as `manager`
2. GET `/api/v1/jobs/unassigned`
3. POST `/api/v1/jobs/{job_id}/assign`
4. Assign to engineer1

### As Engineer (View Jobs)
1. Login as `engineer1`
2. GET `/api/v1/dashboards/engineer`
3. See your assigned jobs

---

## 📚 Next Steps

1. ✅ **Backend is ready!**
2. ⏳ Read `IMPLEMENTATION_COMPLETE.md` for full feature list
3. ⏳ Explore all endpoints in Swagger UI
4. ⏳ Start building your frontend
5. ⏳ Configure Twilio for WhatsApp notifications

---

## ❓ Troubleshooting

### Error: "Access denied for user"
- Check MySQL username and password in `.env`
- Ensure MySQL is running

### Error: "Unknown database 'repair_center_db'"
- Run the CREATE DATABASE command again

### Error: "Port 8000 already in use"
```powershell
# Use a different port
uvicorn main:app --port 8001
```

### Error: "ModuleNotFoundError"
```powershell
# Reinstall dependencies
pip install -r requirements.txt --upgrade
```

### Virtual Environment Issues
```powershell
# Deactivate and reactivate
deactivate
.\venv\Scripts\Activate.ps1
```

---

## 🆘 Need Help?

1. Check `README.md` for detailed documentation
2. Check `QUICKSTART.md` for common tasks
3. Check `IMPLEMENTATION_COMPLETE.md` for feature reference
4. Use Swagger UI to test APIs interactively

---

## 🎉 Success!

If you can see the Swagger UI and login successfully, **congratulations!** 

Your Repair Center Management System backend is fully operational and ready to use.

**Happy coding! 🚀**
