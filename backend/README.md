# Backend

FastAPI backend for the Purchase Requisition Approval System POC.

## Features

- Simple role-based login using a signed token
- Purchase requisition creation for requester
- Two-level approval workflow
- Approval history tracking
- Fake email notification logging
- Seeded demo users and sample PR data

## Run locally

```bash
pip install -r requirements.txt
python seed.py
uvicorn main:app --reload
```

## Environment variables

- `DATABASE_URL`
- `SECRET_KEY`
