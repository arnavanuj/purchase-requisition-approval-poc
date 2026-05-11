from datetime import date, timedelta
from decimal import Decimal

from database import Base, engine, SessionLocal
from crud import (
    APPROVER_1_EMAIL,
    APPROVER_2_EMAIL,
    LEVEL_1,
    LEVEL_2,
    LEVEL_CLOSED,
    REQUESTER_EMAIL,
    STATUS_PENDING_L1,
    STATUS_PENDING_L2,
    STATUS_REJECTED,
    create_approval_history,
    create_notification,
    create_seed_user,
)
from models import PurchaseRequisition


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        requester = create_seed_user(db, REQUESTER_EMAIL, "password123", "requester")
        create_seed_user(db, APPROVER_1_EMAIL, "password123", "approver1")
        create_seed_user(db, APPROVER_2_EMAIL, "password123", "approver2")

        if db.query(PurchaseRequisition).count() > 0:
            return

        sample_prs = [
            PurchaseRequisition(
                pr_number="PR-2026-0001",
                title="Laptops for New Joiners",
                department="IT",
                requested_by="Demo Requester",
                item_name="Business Laptop",
                item_description="Procurement of two laptops for onboarding.",
                quantity=2,
                estimated_cost=Decimal("3200.00"),
                business_justification="Support onboarding for two new employees.",
                required_date=date.today() + timedelta(days=10),
                priority="High",
                status=STATUS_PENDING_L1,
                current_approval_level=LEVEL_1,
                created_by_user_id=requester.id,
            ),
            PurchaseRequisition(
                pr_number="PR-2026-0002",
                title="Cloud Testing Subscription",
                department="QA",
                requested_by="Demo Requester",
                item_name="Testing Platform License",
                item_description="Annual subscription for browser and device testing.",
                quantity=1,
                estimated_cost=Decimal("1800.00"),
                business_justification="Required for regression coverage before release.",
                required_date=date.today() + timedelta(days=15),
                priority="Medium",
                status=STATUS_PENDING_L2,
                current_approval_level=LEVEL_2,
                created_by_user_id=requester.id,
            ),
            PurchaseRequisition(
                pr_number="PR-2026-0003",
                title="Office Pantry Restock",
                department="Admin",
                requested_by="Demo Requester",
                item_name="Pantry Supplies",
                item_description="Monthly pantry supplies replenishment.",
                quantity=10,
                estimated_cost=Decimal("450.00"),
                business_justification="Keeps office pantry stocked for staff.",
                required_date=date.today() + timedelta(days=5),
                priority="Low",
                status=STATUS_REJECTED,
                current_approval_level=LEVEL_CLOSED,
                created_by_user_id=requester.id,
            ),
        ]
        db.add_all(sample_prs)
        db.flush()

        create_notification(
            db,
            sample_prs[0].id,
            APPROVER_1_EMAIL,
            f"Notification email sent to Approver 1: {APPROVER_1_EMAIL}\nPR Number: {sample_prs[0].pr_number}",
        )
        create_approval_history(
            db,
            sample_prs[1].id,
            APPROVER_1_EMAIL,
            LEVEL_1,
            "Approved",
            "Approved for next level in demo seed data.",
        )
        create_notification(
            db,
            sample_prs[1].id,
            APPROVER_2_EMAIL,
            f"Notification email sent to Approver 2: {APPROVER_2_EMAIL}\nPR Number: {sample_prs[1].pr_number}",
        )
        create_approval_history(
            db,
            sample_prs[2].id,
            APPROVER_1_EMAIL,
            LEVEL_1,
            "Rejected",
            "Insufficient need for this month.",
        )
        create_notification(
            db,
            sample_prs[2].id,
            REQUESTER_EMAIL,
            f"Notification email sent to Requester: {REQUESTER_EMAIL}\nPR Number: {sample_prs[2].pr_number}\nStatus: Rejected",
        )
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
