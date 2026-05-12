from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from auth import create_token, get_current_user, verify_password
from crud import (
    approve_purchase_requisition,
    build_purchase_order_pdf_preview,
    copy_purchase_requisition,
    create_purchase_requisition,
    delete_purchase_requisition,
    get_purchase_order_by_id,
    get_purchase_requisition_by_id,
    list_notifications,
    list_purchase_orders,
    list_purchase_requisitions,
    mark_purchase_order_goods_received,
    reject_purchase_requisition,
    update_purchase_requisition,
    validate_pr_access,
    validate_purchase_order_access,
)
from database import get_db
from models import User
from schemas import (
    ActionResponse,
    ApprovalActionRequest,
    DeleteResponse,
    LoginRequest,
    LoginResponse,
    NotificationListResponse,
    PurchaseOrderDetail,
    PurchaseOrderPdfPreview,
    PurchaseOrderResponse,
    PurchaseOrderSummary,
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
        supplier_name=pr.supplier_name,
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


def map_po_detail(purchase_order) -> PurchaseOrderDetail:
    return PurchaseOrderDetail(
        id=purchase_order.id,
        po_number=purchase_order.po_number,
        pr_id=purchase_order.pr_id,
        pr_number=purchase_order.pr_number,
        supplier_name=purchase_order.supplier_name,
        item_name=purchase_order.item_name,
        item_description=purchase_order.item_description,
        quantity=purchase_order.quantity,
        amount=purchase_order.amount,
        created_by=purchase_order.created_by,
        created_at=purchase_order.created_at,
        status=purchase_order.status,
        purchase_requisition=map_pr_detail(purchase_order.purchase_requisition),
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


@app.put("/purchase-requisitions/{pr_id}", response_model=ActionResponse)
def update_pr(
    pr_id: int,
    payload: PurchaseRequisitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pr = get_purchase_requisition_by_id(db, pr_id)
    result_pr, notification, toast_message = update_purchase_requisition(db, pr, payload, current_user)
    return ActionResponse(pr=map_pr_detail(result_pr), toast_message=toast_message, notification=notification)


@app.post("/purchase-requisitions/{pr_id}/copy", response_model=ActionResponse)
def copy_pr(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pr = get_purchase_requisition_by_id(db, pr_id)
    result_pr, notification, toast_message = copy_purchase_requisition(db, pr, current_user)
    return ActionResponse(pr=map_pr_detail(result_pr), toast_message=toast_message, notification=notification)


@app.delete("/purchase-requisitions/{pr_id}", response_model=DeleteResponse)
def delete_pr(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pr = get_purchase_requisition_by_id(db, pr_id)
    message, toast_message = delete_purchase_requisition(db, pr, current_user)
    return DeleteResponse(message=message, toast_message=toast_message)


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


@app.get("/purchase-orders", response_model=list[PurchaseOrderSummary])
def get_purchase_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    purchase_orders = list_purchase_orders(db, current_user)
    return [
        PurchaseOrderSummary.model_validate(purchase_order, from_attributes=True)
        for purchase_order in purchase_orders
    ]


@app.get("/purchase-orders/{po_id}", response_model=PurchaseOrderDetail)
def get_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    purchase_order = get_purchase_order_by_id(db, po_id)
    validate_purchase_order_access(purchase_order, current_user)
    return map_po_detail(purchase_order)


@app.post("/purchase-orders/{po_id}/goods-receipt", response_model=PurchaseOrderResponse)
def mark_goods_receipt(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    purchase_order = get_purchase_order_by_id(db, po_id)
    result_po, toast_message = mark_purchase_order_goods_received(db, purchase_order, current_user)
    return PurchaseOrderResponse(purchase_order=map_po_detail(result_po), toast_message=toast_message)


@app.get("/purchase-orders/{po_id}/pdf-preview", response_model=PurchaseOrderPdfPreview)
def get_purchase_order_pdf_preview(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    purchase_order = get_purchase_order_by_id(db, po_id)
    validate_purchase_order_access(purchase_order, current_user)
    return PurchaseOrderPdfPreview(**build_purchase_order_pdf_preview(purchase_order))


@app.get("/notifications", response_model=NotificationListResponse)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return NotificationListResponse(notifications=list_notifications(db, current_user))


@app.get("/health")
def health_check():
    return {"status": "ok"}
