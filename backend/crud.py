from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from auth import hash_password
from models import ApprovalHistory, Notification, PurchaseOrder, PurchaseRequisition, User


REQUESTER_EMAIL = "requester@test.com"
APPROVER_1_EMAIL = "avi.anuj1@gmail.com"
APPROVER_2_EMAIL = "arnav.anuj@gmail.com"

STATUS_PENDING_L1 = "Pending Level 1 Approval"
STATUS_PENDING_L2 = "Pending Level 2 Approval"
STATUS_APPROVED = "Fully Approved"
STATUS_REJECTED = "Rejected"
STATUS_SUBMITTED = "Submitted"
STATUS_CREATED = "Created"
STATUS_DRAFT = "Draft"

PO_STATUS_GENERATED = "Generated"
PO_STATUS_GOODS_RECEIVED = "Goods Received"

LEVEL_1 = "Approver 1"
LEVEL_2 = "Approver 2"
LEVEL_COMPLETED = "Completed"
LEVEL_CLOSED = "Closed"
LEVEL_REQUESTER = "Requester"


def create_seed_user(db: Session, email: str, password: str, role: str) -> User:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return existing
    user = User(email=email, password=hash_password(password), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def generate_pr_number(db: Session) -> str:
    current_year = datetime.utcnow().year
    prefix = f"PR-{current_year}-"
    count = db.query(PurchaseRequisition).filter(PurchaseRequisition.pr_number.like(f"{prefix}%")).count()
    return f"{prefix}{count + 1:04d}"


def generate_po_number(db: Session) -> str:
    current_year = datetime.utcnow().year
    prefix = f"PO-{current_year}-"
    count = db.query(PurchaseOrder).filter(PurchaseOrder.po_number.like(f"{prefix}%")).count()
    return f"{prefix}{count + 1:04d}"


def create_notification(db: Session, pr_id: int, recipient_email: str, message: str) -> Notification:
    notification = Notification(pr_id=pr_id, recipient_email=recipient_email, message=message)
    db.add(notification)
    db.flush()
    return notification


def create_approval_history(
    db: Session,
    pr_id: int,
    approver_email: str,
    approval_level: str,
    action: str,
    comments: str,
) -> ApprovalHistory:
    history = ApprovalHistory(
        pr_id=pr_id,
        approver_email=approver_email,
        approval_level=approval_level,
        action=action,
        comments=comments,
    )
    db.add(history)
    db.flush()
    return history


def get_pr_query(db: Session):
    return db.query(PurchaseRequisition).options(
        joinedload(PurchaseRequisition.creator),
        joinedload(PurchaseRequisition.approval_history),
        joinedload(PurchaseRequisition.notifications),
        joinedload(PurchaseRequisition.purchase_order),
    )


def get_po_query(db: Session):
    return db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.purchase_requisition).joinedload(PurchaseRequisition.creator),
        joinedload(PurchaseOrder.purchase_requisition).joinedload(PurchaseRequisition.approval_history),
        joinedload(PurchaseOrder.purchase_requisition).joinedload(PurchaseRequisition.notifications),
    )


def generate_purchase_order_for_pr(db: Session, pr: PurchaseRequisition):
    existing = db.query(PurchaseOrder).filter(PurchaseOrder.pr_id == pr.id).first()
    if existing:
        return existing

    purchase_order = PurchaseOrder(
        po_number=generate_po_number(db),
        pr_id=pr.id,
        pr_number=pr.pr_number,
        supplier_name=pr.supplier_name,
        item_name=pr.item_name,
        item_description=pr.item_description,
        quantity=pr.quantity,
        amount=pr.estimated_cost,
        created_by=pr.creator.email,
        status=PO_STATUS_GENERATED,
    )
    db.add(purchase_order)
    db.flush()
    return purchase_order


def create_purchase_requisition(db: Session, payload, current_user: User):
    if current_user.role != "requester":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only requester can create PR.")

    pr = PurchaseRequisition(
        pr_number=generate_pr_number(db),
        title=payload.title.strip(),
        department=payload.department.strip(),
        requested_by=payload.requested_by.strip(),
        supplier_name=payload.supplier_name.strip(),
        item_name=payload.item_name.strip(),
        item_description=payload.item_description.strip(),
        quantity=payload.quantity,
        estimated_cost=payload.estimated_cost,
        business_justification=payload.business_justification.strip(),
        required_date=payload.required_date,
        priority=payload.priority,
        status=STATUS_PENDING_L1,
        current_approval_level=LEVEL_1,
        created_by_user_id=current_user.id,
    )
    db.add(pr)
    db.flush()

    notification = create_notification(
        db,
        pr.id,
        APPROVER_1_EMAIL,
        f"Notification email sent to Approver 1: {APPROVER_1_EMAIL}\nPR Number: {pr.pr_number}",
    )

    db.commit()
    return get_purchase_requisition_by_id(db, pr.id), notification


def update_purchase_requisition(db: Session, pr: PurchaseRequisition, payload, current_user: User):
    validate_requester_pr_ownership(pr, current_user)
    if pr.status == STATUS_APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fully Approved PR cannot be edited.")

    pr.title = payload.title.strip()
    pr.department = payload.department.strip()
    pr.requested_by = payload.requested_by.strip()
    pr.supplier_name = payload.supplier_name.strip()
    pr.item_name = payload.item_name.strip()
    pr.item_description = payload.item_description.strip()
    pr.quantity = payload.quantity
    pr.estimated_cost = payload.estimated_cost
    pr.business_justification = payload.business_justification.strip()
    pr.required_date = payload.required_date
    pr.priority = payload.priority

    if pr.status in {
        STATUS_PENDING_L1,
        STATUS_PENDING_L2,
        STATUS_REJECTED,
        STATUS_SUBMITTED,
        STATUS_CREATED,
        STATUS_DRAFT,
    }:
        pr.status = STATUS_PENDING_L1
        pr.current_approval_level = LEVEL_1

    create_approval_history(
        db,
        pr.id,
        current_user.email,
        LEVEL_REQUESTER,
        "Edited and Resubmitted",
        "Requester updated the PR details and resubmitted it for approval.",
    )
    notification = create_notification(
        db,
        pr.id,
        APPROVER_1_EMAIL,
        f"Notification email sent to Approver 1: {APPROVER_1_EMAIL}\nPR Number: {pr.pr_number}",
    )
    db.commit()
    toast_message = f"Notification email sent to Approver 1: {APPROVER_1_EMAIL}"
    return get_purchase_requisition_by_id(db, pr.id), notification, toast_message


def copy_purchase_requisition(db: Session, pr: PurchaseRequisition, current_user: User):
    validate_requester_pr_ownership(pr, current_user)

    copied_pr = PurchaseRequisition(
        pr_number=generate_pr_number(db),
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
        status=STATUS_PENDING_L1,
        current_approval_level=LEVEL_1,
        created_by_user_id=current_user.id,
    )
    db.add(copied_pr)
    db.flush()

    notification = create_notification(
        db,
        copied_pr.id,
        APPROVER_1_EMAIL,
        f"Notification email sent to Approver 1: {APPROVER_1_EMAIL}\nPR Number: {copied_pr.pr_number}",
    )
    db.commit()
    toast_message = f"Copied PR created successfully. Notification email sent to Approver 1: {APPROVER_1_EMAIL}"
    return get_purchase_requisition_by_id(db, copied_pr.id), notification, toast_message


def delete_purchase_requisition(db: Session, pr: PurchaseRequisition, current_user: User):
    validate_requester_pr_ownership(pr, current_user)
    if pr.status == STATUS_APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fully Approved PR cannot be deleted.")

    db.delete(pr)
    db.commit()
    return "Purchase requisition deleted.", "PR deleted successfully"


def list_purchase_requisitions(db: Session, current_user: User):
    query = get_pr_query(db)
    if current_user.role == "requester":
        return (
            query.filter(PurchaseRequisition.created_by_user_id == current_user.id)
            .order_by(PurchaseRequisition.created_at.desc())
            .all()
        )
    if current_user.role == "approver1":
        return query.filter(PurchaseRequisition.status == STATUS_PENDING_L1).order_by(PurchaseRequisition.created_at.desc()).all()
    if current_user.role == "approver2":
        return query.filter(PurchaseRequisition.status == STATUS_PENDING_L2).order_by(PurchaseRequisition.created_at.desc()).all()
    return []


def get_purchase_requisition_by_id(db: Session, pr_id: int):
    pr = get_pr_query(db).filter(PurchaseRequisition.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase requisition not found.")
    return pr


def validate_pr_access(pr: PurchaseRequisition, current_user: User):
    if current_user.role == "requester" and pr.created_by_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own PRs.")


def validate_requester_pr_ownership(pr: PurchaseRequisition, current_user: User):
    if current_user.role != "requester":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only requester can edit, copy, or delete PRs.",
        )
    if pr.created_by_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage your own PRs.",
        )


def approve_purchase_requisition(db: Session, pr: PurchaseRequisition, current_user: User, comments: str):
    if current_user.role == "requester":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requester cannot approve PR.")

    if current_user.role == "approver1":
        if pr.status != STATUS_PENDING_L1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This PR is not pending Level 1 approval.")
        create_approval_history(db, pr.id, current_user.email, LEVEL_1, "Approved", comments)
        pr.status = STATUS_PENDING_L2
        pr.current_approval_level = LEVEL_2
        notification = create_notification(
            db,
            pr.id,
            APPROVER_2_EMAIL,
            f"Notification email sent to Approver 2: {APPROVER_2_EMAIL}\nPR Number: {pr.pr_number}",
        )
        toast_message = f"Notification email sent to Approver 2: {APPROVER_2_EMAIL} | PR Number: {pr.pr_number}"
    elif current_user.role == "approver2":
        if pr.status != STATUS_PENDING_L2:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This PR is not pending Level 2 approval.")
        create_approval_history(db, pr.id, current_user.email, LEVEL_2, "Approved", comments)
        pr.status = STATUS_APPROVED
        pr.current_approval_level = LEVEL_COMPLETED
        generate_purchase_order_for_pr(db, pr)
        notification = create_notification(
            db,
            pr.id,
            REQUESTER_EMAIL,
            f"Notification email sent to Requester: {REQUESTER_EMAIL}\nPR Number: {pr.pr_number}\nStatus: Fully Approved",
        )
        toast_message = f"Notification email sent to Requester: {REQUESTER_EMAIL} | PR Number: {pr.pr_number} | Status: Fully Approved"
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unsupported role.")

    db.commit()
    return get_purchase_requisition_by_id(db, pr.id), notification, toast_message


def reject_purchase_requisition(db: Session, pr: PurchaseRequisition, current_user: User, comments: str):
    if current_user.role == "requester":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Requester cannot reject PR.")

    if current_user.role == "approver1" and pr.status != STATUS_PENDING_L1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This PR is not pending Level 1 approval.")
    if current_user.role == "approver2" and pr.status != STATUS_PENDING_L2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This PR is not pending Level 2 approval.")

    level = LEVEL_1 if current_user.role == "approver1" else LEVEL_2
    create_approval_history(db, pr.id, current_user.email, level, "Rejected", comments)
    pr.status = STATUS_REJECTED
    pr.current_approval_level = LEVEL_CLOSED
    notification = create_notification(
        db,
        pr.id,
        REQUESTER_EMAIL,
        f"Notification email sent to Requester: {REQUESTER_EMAIL}\nPR Number: {pr.pr_number}\nStatus: Rejected",
    )
    db.commit()
    toast_message = f"Notification email sent to Requester: {REQUESTER_EMAIL} | PR Number: {pr.pr_number} | Status: Rejected"
    return get_purchase_requisition_by_id(db, pr.id), notification, toast_message


def list_notifications(db: Session, current_user: User):
    if current_user.role == "requester":
        return (
            db.query(Notification)
            .join(PurchaseRequisition, PurchaseRequisition.id == Notification.pr_id)
            .filter(PurchaseRequisition.created_by_user_id == current_user.id)
            .order_by(Notification.created_at.desc())
            .all()
        )
    return (
        db.query(Notification)
        .filter(Notification.recipient_email == current_user.email)
        .order_by(Notification.created_at.desc())
        .all()
    )


def list_purchase_orders(db: Session, current_user: User):
    query = get_po_query(db)
    if current_user.role == "requester":
        return (
            query.join(PurchaseRequisition, PurchaseRequisition.id == PurchaseOrder.pr_id)
            .filter(PurchaseRequisition.created_by_user_id == current_user.id)
            .order_by(PurchaseOrder.created_at.desc())
            .all()
        )
    return query.order_by(PurchaseOrder.created_at.desc()).all()


def get_purchase_order_by_id(db: Session, po_id: int):
    purchase_order = get_po_query(db).filter(PurchaseOrder.id == po_id).first()
    if not purchase_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found.")
    return purchase_order


def validate_purchase_order_access(purchase_order: PurchaseOrder, current_user: User):
    if current_user.role == "requester" and purchase_order.purchase_requisition.created_by_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own purchase orders.")


def mark_purchase_order_goods_received(db: Session, purchase_order: PurchaseOrder, current_user: User):
    validate_purchase_order_access(purchase_order, current_user)
    if current_user.role != "requester":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only requester can complete goods receipt.")
    if purchase_order.purchase_requisition.created_by_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your own purchase orders.")
    if purchase_order.status == PO_STATUS_GOODS_RECEIVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Goods receipt is already completed for this PO.")

    purchase_order.status = PO_STATUS_GOODS_RECEIVED
    db.commit()
    toast_message = f"Goods receipt completed for PO {purchase_order.po_number}"
    return get_purchase_order_by_id(db, purchase_order.id), toast_message


def build_purchase_order_pdf_preview(purchase_order: PurchaseOrder):
    approval_history = purchase_order.purchase_requisition.approval_history
    approver_1_details = [item for item in approval_history if item.approval_level == LEVEL_1]
    approver_2_details = [item for item in approval_history if item.approval_level == LEVEL_2]
    return {
        "po_number": purchase_order.po_number,
        "pr_number": purchase_order.pr_number,
        "supplier_name": purchase_order.supplier_name,
        "created_by": purchase_order.created_by,
        "created_at": purchase_order.created_at,
        "item_name": purchase_order.item_name,
        "item_description": purchase_order.item_description,
        "quantity": purchase_order.quantity,
        "amount": purchase_order.amount,
        "business_justification": purchase_order.purchase_requisition.business_justification,
        "required_date": purchase_order.purchase_requisition.required_date,
        "approval_status": purchase_order.purchase_requisition.status,
        "approver_1_details": approver_1_details,
        "approver_2_details": approver_2_details,
    }


def ensure_purchase_orders_for_approved_prs(db: Session):
    approved_prs = (
        get_pr_query(db)
        .filter(PurchaseRequisition.status == STATUS_APPROVED)
        .all()
    )
    created_any = False
    for pr in approved_prs:
        existing = db.query(PurchaseOrder).filter(PurchaseOrder.pr_id == pr.id).first()
        if not existing:
            generate_purchase_order_for_pr(db, pr)
            created_any = True
    if created_any:
        db.commit()
