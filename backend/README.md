# Repair Center Management System - Backend API

Complete backend API for a comprehensive Repair Center Management System built with **FastAPI** and **MySQL**.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [User Roles](#user-roles)
- [Workflow Overview](#workflow-overview)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)

## ✨ Features

### Core Functionality
- **Customer Management**: Registration, search, profile management with job history
- **Job Management**: Create, assign, track, and complete repair jobs
- **Parts Inventory**: Manage parts stock, requests, approvals, and returns
- **Engineer Estimates**: Internal technical estimates for repairs
- **Customer Estimates**: Customer-facing estimates with OTP verification
- **WhatsApp Integration**: Automated notifications via Twilio
- **Role-Based Access Control**: 6 user roles with specific permissions
- **Real-time Dashboards**: Role-specific dashboards for all users
- **Notification System**: In-app and WhatsApp notifications
- **Job History Tracking**: Complete repair history by serial number

### User Roles
1. **Admin**: Full system access
2. **Manager**: Job assignment and oversight
3. **Front Desk**: Customer and job registration
4. **Engineer**: Job execution and parts requests
5. **Storekeeper**: Inventory and parts management
6. **Accountant**: Estimate creation and review

## 🛠 Tech Stack

- **Framework**: FastAPI 0.104+
- **Database**: MySQL with SQLAlchemy ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: Bcrypt
- **Validation**: Pydantic
- **WhatsApp**: Twilio API
- **Server**: Uvicorn ASGI server

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py           # API router
│   │       ├── auth.py               # Authentication endpoints
│   │       ├── customers.py          # Customer management
│   │       ├── jobs.py               # Job management
│   │       ├── parts.py              # Parts & inventory
│   │       ├── estimates.py          # Estimates management
│   │       ├── dashboards.py         # Dashboard endpoints
│   │       └── notifications.py      # Notifications
│   ├── core/
│   │   ├── config.py                 # App configuration
│   │   ├── database.py               # Database connection
│   │   └── security.py               # Auth & security
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py                   # User model
│   │   ├── customer.py               # Customer model
│   │   ├── job.py                    # Job model
│   │   ├── parts.py                  # Parts models
│   │   ├── estimate.py               # Estimate models
│   │   └── notification.py           # Notification model
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py                   # User schemas
│   │   ├── customer.py               # Customer schemas
│   │   ├── job.py                    # Job schemas
│   │   ├── parts.py                  # Parts schemas
│   │   ├── estimate.py               # Estimate schemas
│   │   ├── notification.py           # Notification schemas
│   │   └── dashboard.py              # Dashboard schemas
│   ├── services/
│   │   ├── whatsapp.py               # WhatsApp service
│   │   └── notification.py           # Notification service
│   └── utils/
│       └── id_generator.py           # ID generation utilities
├── main.py                           # Application entry point
├── requirements.txt                  # Python dependencies
├── .env.example                      # Environment variables template
└── .gitignore                        # Git ignore rules
```

## 🚀 Installation

### Prerequisites
- Python 3.9+
- MySQL 8.0+
- pip (Python package manager)

### Step 1: Clone or Navigate to Project
```powershell
cd "C:\Users\user\Desktop\Premier Data Systems\backend"
```

### Step 2: Create Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Step 3: Install Dependencies
```powershell
pip install -r requirements.txt
```

## ⚙️ Configuration

### Step 1: Create Environment File
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

### Step 2: Configure Environment Variables
Edit `.env` file with your settings:

```ini
# Database Configuration
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/repair_center_db

# Security (Generate strong secret key)
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Twilio Configuration (Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Application Settings
APP_NAME=Repair Center Management System
APP_VERSION=1.0.0
DEBUG=True

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# OTP Configuration
OTP_EXPIRY_MINUTES=10
```

### Generating Secret Key
```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 🗄️ Database Setup

### Step 1: Create MySQL Database
```sql
CREATE DATABASE repair_center_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2: Create Database User (Optional)
```sql
CREATE USER 'repair_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON repair_center_db.* TO 'repair_user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 3: Initialize Database Tables
The application will automatically create all tables on first run using SQLAlchemy.

Alternatively, you can use Alembic for migrations:
```powershell
# Initialize Alembic (first time only)
alembic init alembic

# Generate migration
alembic revision --autogenerate -m "Initial migration"

# Apply migration
alembic upgrade head
```

## 🏃 Running the Application

### Development Mode
```powershell
python main.py
```

Or using uvicorn directly:
```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode
```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at: `http://localhost:8000`

## 📚 API Documentation

Once the application is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **OpenAPI JSON**: http://localhost:8000/api/openapi.json

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, user management |
| **Manager** | Job assignment, oversight, analytics |
| **Front Desk** | Customer registration, job creation, delivery |
| **Engineer** | Job execution, parts requests, estimates |
| **Storekeeper** | Inventory management, parts approval |
| **Accountant** | Estimate creation, financial review |

## 🔄 Workflow Overview

### 1. Customer Arrives (Front Desk)
- Search for existing customer or register new
- View customer's past job history

### 2. Job Creation (Front Desk)
- Create repair job with machine details
- Record items taken from customer
- Check serial number for previous repairs

### 3. Job Assignment (Manager)
- Assign job to available engineer
- Engineer receives notification

### 4. Engineer Diagnosis
- Review job details
- Request parts from storekeeper

### 5. Parts Management (Storekeeper)
- Review parts requests
- Approve/reject/provide alternatives
- Track inventory levels

### 6. Engineer Estimate
- Create internal technical estimate
- Send to accountant for review

### 7. Customer Estimate (Accountant)
- Create customer-facing estimate with prices
- Send to customer via WhatsApp with OTP

### 8. Customer Approval
- Customer receives link and OTP
- Reviews and approves/rejects estimate

### 9. Repair Completion (Engineer)
- Complete repair work
- Mark parts as used
- Return unused parts
- Document work done

### 10. Delivery (Front Desk)
- Verify items returned to customer
- Mark job as delivered

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout user

### Customers
- `POST /api/v1/customers` - Create customer
- `GET /api/v1/customers/search` - Search customers
- `GET /api/v1/customers/{customer_id}` - Get customer with history
- `PUT /api/v1/customers/{customer_id}` - Update customer
- `DELETE /api/v1/customers/{customer_id}` - Delete customer

### Jobs
- `POST /api/v1/jobs` - Create job
- `GET /api/v1/jobs` - List jobs (with filters)
- `GET /api/v1/jobs/{job_id}` - Get job details
- `PUT /api/v1/jobs/{job_id}` - Update job
- `GET /api/v1/jobs/unassigned` - Get unassigned jobs
- `POST /api/v1/jobs/{job_id}/assign` - Assign to engineer
- `POST /api/v1/jobs/{job_id}/complete` - Complete job
- `POST /api/v1/jobs/{job_id}/deliver` - Deliver to customer
- `GET /api/v1/jobs/history/{serial_number}` - Job history

### Parts & Inventory
- `POST /api/v1/parts/inventory` - Create part
- `GET /api/v1/parts/inventory` - List parts
- `GET /api/v1/parts/inventory/summary` - Inventory summary
- `PUT /api/v1/parts/inventory/{part_id}` - Update part
- `POST /api/v1/parts/requests` - Create parts request
- `GET /api/v1/parts/requests` - List parts requests
- `GET /api/v1/parts/requests/{request_id}` - Get request details
- `POST /api/v1/parts/requests/{request_id}/approve` - Approve request
- `POST /api/v1/parts/requests/items/{item_id}/mark-used` - Mark as used
- `POST /api/v1/parts/requests/items/{item_id}/return` - Return parts

### Estimates
- `POST /api/v1/estimates/engineer` - Create engineer estimate
- `GET /api/v1/estimates/engineer/{estimate_id}` - Get engineer estimate
- `POST /api/v1/estimates/customer` - Create customer estimate
- `GET /api/v1/estimates/customer/{estimate_id}` - Get customer estimate
- `POST /api/v1/estimates/customer/{estimate_id}/send-to-customer` - Send to customer
- `POST /api/v1/estimates/customer/verify-otp` - Verify OTP
- `POST /api/v1/estimates/customer/{estimate_number}/approve` - Approve estimate

### Dashboards
- `GET /api/v1/dashboards/engineer` - Engineer dashboard
- `GET /api/v1/dashboards/storekeeper` - Storekeeper dashboard
- `GET /api/v1/dashboards/accountant` - Accountant dashboard
- `GET /api/v1/dashboards/manager` - Manager dashboard
- `GET /api/v1/dashboards/front-desk` - Front desk dashboard

### Notifications
- `GET /api/v1/notifications` - List notifications
- `GET /api/v1/notifications/summary` - Notification summary
- `POST /api/v1/notifications/mark-read` - Mark as read
- `DELETE /api/v1/notifications/{notification_id}` - Delete notification

## 🧪 Testing

### Create Test User
```python
# Run Python shell
python

# Create admin user
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

db = SessionLocal()
admin = User(
    username="admin",
    email="admin@repaircenter.com",
    hashed_password=get_password_hash("admin123"),
    full_name="System Administrator",
    role=UserRole.ADMIN
)
db.add(admin)
db.commit()
```

### Test API with cURL
```powershell
# Login
curl -X POST "http://localhost:8000/api/v1/auth/login" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "username=admin&password=admin123"

# Get current user (replace TOKEN)
curl -X GET "http://localhost:8000/api/v1/auth/me" `
  -H "Authorization: Bearer TOKEN"
```

## 🔐 Security Best Practices

1. **Change default SECRET_KEY** in production
2. **Use strong passwords** for database and users
3. **Enable HTTPS** in production
4. **Rotate JWT tokens** regularly
5. **Implement rate limiting** for API endpoints
6. **Keep dependencies updated**
7. **Use environment variables** for sensitive data
8. **Enable database backups**

## 🚀 Deployment

### Docker Deployment (Optional)
Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```powershell
docker build -t repair-center-api .
docker run -p 8000:8000 --env-file .env repair-center-api
```

## 📞 Support & Contact

For issues, questions, or contributions, please contact the development team.

## 📄 License

Copyright © 2025 Premier Data Systems. All rights reserved.

---

**Built with ❤️ using FastAPI and MySQL**
