# Purchase Requisition Approval System POC

## Project overview

This project is an end-to-end demo Purchase Requisition Approval System built for POC and interview walkthrough purposes. It mimics a real procurement workflow where a requester creates a purchase requisition, Approver 1 reviews it, and then Approver 2 gives the final decision. Real emails are not sent. Instead, the application shows toast notifications and stores fake notification logs in the database.

## Tech stack

- Frontend: React with Vite
- Backend: Python
- API Framework: FastAPI
- Database: PostgreSQL
- ORM: SQLAlchemy
- Authentication: Simple signed token with role-based access
- Styling: Clean custom CSS
- Containerization: Docker Compose

## Project structure

```text
purchase-requisition-poc/
├── backend/
├── frontend/
├── docker-compose.yml
└── README.md
```

## Default login credentials

- Requester
  - Email: `requester@test.com`
  - Password: `password123`
  - Role: `requester`
- Approver 1
  - Email: `avi.anuj1@gmail.com`
  - Password: `password123`
  - Role: `approver1`
- Approver 2
  - Email: `arnav.anuj@gmail.com`
  - Password: `password123`
  - Role: `approver2`

## Database tables

### `users`

- `id`
- `email`
- `password`
- `role`
- `created_at`

### `purchase_requisitions`

- `id`
- `pr_number`
- `title`
- `department`
- `requested_by`
- `item_name`
- `item_description`
- `quantity`
- `estimated_cost`
- `business_justification`
- `required_date`
- `priority`
- `status`
- `current_approval_level`
- `created_by_user_id`
- `created_at`
- `updated_at`

### `approval_history`

- `id`
- `pr_id`
- `approver_email`
- `approval_level`
- `action`
- `comments`
- `action_date`

### `notifications`

- `id`
- `pr_id`
- `recipient_email`
- `message`
- `created_at`

## PR status workflow

1. Requester creates a PR.
2. PR is saved with status `Pending Level 1 Approval`.
3. Fake notification is logged and shown for Approver 1.
4. Approver 1 approves and PR moves to `Pending Level 2 Approval`.
5. Fake notification is logged and shown for Approver 2.
6. Approver 2 approves and PR becomes `Fully Approved`.
7. Fake notification is logged and shown for requester.
8. If either approver rejects, PR becomes `Rejected` and requester is notified.

## API endpoint details

### Auth

- `POST /login`

### Purchase requisitions

- `POST /purchase-requisitions`
- `GET /purchase-requisitions`
- `GET /purchase-requisitions/{id}`

### Approval

- `POST /purchase-requisitions/{id}/approve`
- `POST /purchase-requisitions/{id}/reject`

### Notifications

- `GET /notifications`

### Utility

- `GET /health`

## Validation rules

- Quantity must be greater than 0
- Estimated cost must be greater than 0
- Required date is mandatory
- Business justification is mandatory
- Only requester can create PR
- Only Approver 1 can approve Level 1 PRs
- Only Approver 2 can approve Level 2 PRs
- Requester cannot approve or reject PRs
- Approvers cannot edit PR details

## How to run locally with Docker

```bash
cd purchase-requisition-poc
docker compose up --build
```

Application URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- FastAPI docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

To stop:

```bash
docker compose down
```

To stop and remove database volume:

```bash
docker compose down -v
```

## How to run without Docker

### Backend

```bash
cd backend
pip install -r requirements.txt
python seed.py
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set backend URL if needed:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

## Demo flow

1. Login as requester and create a purchase requisition.
2. Confirm the toast says fake notification email was sent to `avi.anuj1@gmail.com`.
3. Logout and login as Approver 1.
4. Open the pending PR, add comments, and approve it.
5. Confirm the toast says fake notification email was sent to `arnav.anuj@gmail.com`.
6. Logout and login as Approver 2.
7. Open the pending PR, add comments, and approve it.
8. Confirm the toast says fake notification email was sent to `requester@test.com`.
9. Open PR details to review approval history and notification history.

## Notes for interview explanation

- The project intentionally uses a lightweight auth approach because this is a POC.
- Fake notifications are stored in the `notifications` table so the workflow can still be audited.
- Approval history is captured separately to make the approval trail visible and easy to explain.
- Seed data includes default users and sample PRs so the demo is ready immediately after startup.
