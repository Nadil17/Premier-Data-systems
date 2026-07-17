# Repair Center Management System - Complete Project

## 🎯 Project Overview

A comprehensive, production-ready Repair Center Management System built with **FastAPI** (Python) backend and **MySQL** database. This system manages the complete workflow from customer registration to repair completion and delivery.

---

## ✅ PROJECT STATUS: BACKEND COMPLETE

**The complete backend API has been successfully implemented** in the `backend/` directory with all features from the workflow below.

### 📦 What's Been Built

✅ **Complete Database Schema** - 7 main models with relationships
✅ **Authentication & Authorization** - JWT-based with 6 user roles
✅ **Customer Management** - Registration, search, history tracking
✅ **Job Management** - Full lifecycle from creation to delivery
✅ **Parts & Inventory** - Request, approval, tracking, returns
✅ **Estimate System** - Engineer and customer estimates with OTP
✅ **WhatsApp Integration** - Automated notifications via Twilio
✅ **Dashboard APIs** - Role-specific dashboards for all users
✅ **Notification System** - In-app and external notifications
✅ **Complete Documentation** - README, QuickStart, API testing

### 🚀 Quick Start

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Configure .env file
python init_db.py
python main.py
```

Visit: http://localhost:8000/api/docs

---

## 📋 ORIGINAL WORKFLOW SPECIFICATION

🔵 SCENARIO START
1. Customer Arrives at the Repair Center
A customer walks into your shop with a computer or printer that needs repair.

If the customer is NEW
The front-desk employee opens the Customer Registration Form and enters:

Customer Name

Company Name

Address

2–3 Telephone Numbers

Email Address

Customer Category (Individual, Company, Dealer)

VAT Number

Website (if any)

Remarks

After submission, the system creates a Customer Profile with a unique Customer ID.

If the customer already exists
The employee searches by phone number/name and selects the existing profile.
Past job history is also viewable.

2. Job Creation
Once the customer is selected, the employee creates a Job for the repair.

The Job Create Form includes:

Select Customer

Reported By (customer or company staff name)

Additional Phone Number (optional)

Machine Model

Serial Number

If this serial number was previously repaired, the system shows the previous job history

Fault Description (customer’s complaint)

Items Taken

Charger

USB cable

Printer cable

Toner

Any other accessories

Remarks

Job Type: In-house / Field

Job Category: Warranty / Chargeable / Agreement

After saving, the system generates a unique Job Number.

The job now moves to the Unassigned Jobs list.

3. Assigning Job to Engineer
The manager or front-desk assigns the job to a specific engineer.

Once assigned, the job appears on the Engineer’s Dashboard, showing:

Total assigned jobs

Pending jobs

Completed jobs

Jobs waiting for customer approval

Jobs waiting for parts

Engineer views Job Summary
When the engineer clicks the job, they see:

Job Number

Customer Name

Customer Telephone

Machine Model

Serial Number

Fault Description

Items taken from customer

4. Engineer Requests Parts
During diagnosis, the engineer identifies which parts are required.

Inside the system, they create a Parts Request, including:

Part name

Quantity

Reason

This request goes to the Storekeeper Dashboard.

Storekeeper actions
The storekeeper sees:

Job Number

Engineer Name

Requested Parts List

They can:

Approve

Reject

Partially approve

Provide alternatives

Allow restocking of unused items later

When approved, the engineer collects the parts from the store.
Stock quantity is automatically updated.

5. Engineer Creates Internal Estimate
After diagnosing the machine:

The engineer prepares the Engineer Estimate, including:

Parts needed

Services needed

Quantity

Technical descriptions

Additional notes

This estimate is not shown to the customer.
It is sent to the Accountant Dashboard.

6. Accountant Prepares Customer Estimate
The accountant opens the engineer’s estimate and builds the final customer estimate.

They can:

Add prices for each part

Add prices for each service

Edit item descriptions (for printing clarity)

Add additional items

Add comments for individual items

Add special notes for the customer

Once completed, the system generates a Customer Estimate.

Sending to Customer
The system sends:

WhatsApp message

Secure link

One-time password (OTP)

The customer clicks the link → enters OTP → sees the estimate.

7. Customer Approves or Rejects Estimate
The customer has options:

Approve

Reject

Approve partially

Add comments

Once submitted, the system notifies:

Engineer

Accountant

(Notification through WhatsApp + system alert)

The job status updates accordingly.

8. Engineer Completes Repair
After the customer approves:

The engineer begins repair work.

System Rules Before Completing Job
The engineer cannot mark the job as completed unless:

All unused parts are returned to the store

Storekeeper approves the returned items

All used parts are marked as “Used”

Required repair notes are entered

Completion Steps
The engineer records:

Work done

Tests performed

Used parts (confirmed)

Service notes

Warranty details (if applicable)

Job status becomes:
“Completed – Waiting for Accountant Review”

9. Accountant Review of Completed Jobs
The accountant has access to a dedicated dashboard displaying all jobs marked as completed. From this dashboard, the accountant can open any completed job and review all associated information, including:

Job Number

Customer Details

Parts Used

Services Performed

Notes and Descriptions

Total Repair Cost

Completion Date

Note:
As per the requirements, invoice generation is not part of this system. The accountant's role is strictly to review completed jobs and verify the recorded information.

10. Delivery to Customer
Before the repaired machine is handed back to the customer, the responsible employee must verify that all items originally taken in have been returned. This includes:

Charger

Printer cable

Toner

Any additional special items

The system displays a comparison of Items Taken vs. Items Returned, allowing the employee to confirm everything has been returned correctly.

Once all items are verified and confirmed, the system marks the job as officially closed.

🔵 SCENARIO END