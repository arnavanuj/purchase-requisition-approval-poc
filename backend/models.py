from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    purchase_requisitions = relationship("PurchaseRequisition", back_populates="creator")


class PurchaseRequisition(Base):
    __tablename__ = "purchase_requisitions"

    id = Column(Integer, primary_key=True, index=True)
    pr_number = Column(String(20), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    department = Column(String(255), nullable=False)
    requested_by = Column(String(255), nullable=False)
    supplier_name = Column(String(255), nullable=False, server_default="Unknown Supplier")
    item_name = Column(String(255), nullable=False)
    item_description = Column(Text, nullable=False)
    quantity = Column(Integer, nullable=False)
    estimated_cost = Column(Numeric(12, 2), nullable=False)
    business_justification = Column(Text, nullable=False)
    required_date = Column(Date, nullable=False)
    priority = Column(String(20), nullable=False)
    status = Column(String(50), nullable=False, index=True)
    current_approval_level = Column(String(50), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    creator = relationship("User", back_populates="purchase_requisitions")
    approval_history = relationship(
        "ApprovalHistory",
        back_populates="purchase_requisition",
        cascade="all, delete-orphan",
        order_by="ApprovalHistory.action_date",
    )
    notifications = relationship(
        "Notification",
        back_populates="purchase_requisition",
        cascade="all, delete-orphan",
        order_by="Notification.created_at",
    )
    purchase_order = relationship(
        "PurchaseOrder",
        back_populates="purchase_requisition",
        cascade="all, delete-orphan",
        uselist=False,
    )


class ApprovalHistory(Base):
    __tablename__ = "approval_history"

    id = Column(Integer, primary_key=True, index=True)
    pr_id = Column(Integer, ForeignKey("purchase_requisitions.id"), nullable=False, index=True)
    approver_email = Column(String(255), nullable=False)
    approval_level = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    comments = Column(Text, nullable=False)
    action_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    purchase_requisition = relationship("PurchaseRequisition", back_populates="approval_history")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    pr_id = Column(Integer, ForeignKey("purchase_requisitions.id"), nullable=False, index=True)
    recipient_email = Column(String(255), nullable=False, index=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    purchase_requisition = relationship("PurchaseRequisition", back_populates="notifications")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(20), unique=True, nullable=False, index=True)
    pr_id = Column(Integer, ForeignKey("purchase_requisitions.id"), nullable=False, unique=True, index=True)
    pr_number = Column(String(20), nullable=False, index=True)
    supplier_name = Column(String(255), nullable=False)
    item_name = Column(String(255), nullable=False)
    item_description = Column(Text, nullable=False)
    quantity = Column(Integer, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    created_by = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(String(50), nullable=False, index=True)

    purchase_requisition = relationship("PurchaseRequisition", back_populates="purchase_order")
