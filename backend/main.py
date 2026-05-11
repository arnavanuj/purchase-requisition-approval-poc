from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from auth import create_token, get_current_user, verify_password
from crud import (
    create_purchase_requisition,
    get_purchase_requisition_by_id,
    list_notifications,
    list_purchase_requisitions,
    reject_purchase_requisition,
    validate_pr_access,
    approve_purchase_requisition,
)
from database import get_db
from models import User
from schemas import (
    ActionResponse,
    ApprovalActionRequest,
    LoginRequest,
    LoginResponse,
    NotificationListResponse,
    PurchaseRequisitionCreate,
    PurchaseRequisitionDetail,
    PurchaseRequisitionSummary,
)
from seed import seed_database


app = FastAPI(title="Purchase Requisition Approval System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    seed_database()


def map_pr_detail(pr) -> PurchaseRequisitionDetail:
    return PurchaseRequisitionDetail(
        id=pr.id,
        pr_number=pr.pr_number,
        title=pr.title,
        department=pr.department,
        requested_by=pr.requested_by,
        item_name=pr.item_name,
        item_description=pr.item_description,
        quantity=pr.quantity,
        estimated_cost=pr.estimated_cost,
        business_justification=pr.business_justification,
        required_date=pr.required_date,
        priority=pr.priority,
        status=pr.status,
        current_approval_level=pr.current_approval_level,
        created_at=pr.created_at,
        updated_at=pr.updated_at,
        creator_email=pr.creator.email,
        approval_history=pr.approval_history,
        notifications=pr.notifications,
    )


@app.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password):
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    return LoginResponse(token=create_token(user.email, user.role), email=user.email, role=user.role)


@app.post("/purchase-requisitions", response_model=ActionResponse)
def create_pr(
    payload: PurchaseRequisitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pr, notification = create_purchase_requisition(db, payload, current_user)
    return ActionResponse(
        pr=map_pr_detail(pr),
        toast_message=f"Notification email sent to Approver 1: {notification.recipient_email} | PR Number: {pr.pr_number}",
        notification=notification,
    )


@app.get("/purchase-requisitions", response_model=list[PurchaseRequisitionSummary])
def list_prs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_purchase_requisitions(db, current_user)


@app.get("/purchase-requisitions/{pr_id}", response_model=PurchaseRequisitionDetail)
def get_pr(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pr = get_purchase_requisition_by_id(db, pr_id)
    validate_pr_access(pr, current_user)
    return map_pr_detail(pr)


@app.post("/purchase-requisitions/{pr_id}/approve", response_model=ActionResponse)
def approve_pr(
    pr_id: int,
    payload: ApprovalActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pr = get_purchase_requisition_by_id(db, pr_id)
    result_pr, notification, toast_message = approve_purchase_requisition(db, pr, current_user, payload.comments)
    return ActionResponse(pr=map_pr_detail(result_pr), toast_message=toast_message, notification=notification)


@app.post("/purchase-requisitions/{pr_id}/reject", response_model=ActionResponse)
def reject_pr(
    pr_id: int,
    payload: ApprovalActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pr = get_purchase_requisition_by_id(db, pr_id)
    result_pr, notification, toast_message = reject_purchase_requisition(db, pr, current_user, payload.comments)
    return ActionResponse(pr=map_pr_detail(result_pr), toast_message=toast_message, notification=notification)


@app.get("/notifications", response_model=NotificationListResponse)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return NotificationListResponse(notifications=list_notifications(db, current_user))


@app.get("/health")
def health_check():
    return {"status": "ok"}
