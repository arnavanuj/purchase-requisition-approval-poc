from datetime import date, datetime
from decimal import Decimal
from typing import List

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=3)


class LoginResponse(BaseModel):
    token: str
    email: EmailStr
    role: str


class PurchaseRequisitionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    department: str = Field(min_length=1, max_length=255)
    requested_by: str = Field(min_length=1, max_length=255)
    supplier_name: str = Field(min_length=1, max_length=255)
    item_name: str = Field(min_length=1, max_length=255)
    item_description: str = Field(min_length=1)
    quantity: int
    estimated_cost: Decimal
    business_justification: str = Field(min_length=1)
    required_date: date
    priority: str

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("Quantity should be greater than 0.")
        return value

    @field_validator("estimated_cost")
    @classmethod
    def validate_estimated_cost(cls, value: Decimal) -> Decimal:
        if value <= 0:
            raise ValueError("Estimated cost should be greater than 0.")
        return value

    @field_validator("business_justification", "supplier_name")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("This field should not be empty.")
        return value.strip()

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        allowed = {"Low", "Medium", "High"}
        if value not in allowed:
            raise ValueError("Priority must be Low, Medium, or High.")
        return value


class ApprovalActionRequest(BaseModel):
    comments: str = Field(min_length=1)

    @field_validator("comments")
    @classmethod
    def validate_comments(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Comments are required.")
        return value.strip()


class ApprovalHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    approver_email: str
    approval_level: str
    action: str
    comments: str
    action_date: datetime


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pr_id: int
    recipient_email: str
    message: str
    created_at: datetime


class PurchaseRequisitionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pr_number: str
    title: str
    department: str
    requested_by: str
    supplier_name: str
    item_name: str
    quantity: int
    estimated_cost: Decimal
    priority: str
    status: str
    current_approval_level: str
    created_at: datetime


class PurchaseRequisitionDetail(PurchaseRequisitionSummary):
    item_description: str
    business_justification: str
    required_date: date
    updated_at: datetime
    creator_email: str
    approval_history: List[ApprovalHistoryResponse]
    notifications: List[NotificationResponse]


class ActionResponse(BaseModel):
    pr: PurchaseRequisitionDetail
    toast_message: str
    notification: NotificationResponse


class DeleteResponse(BaseModel):
    message: str
    toast_message: str


class PurchaseOrderSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    po_number: str
    pr_id: int
    pr_number: str
    supplier_name: str
    item_name: str
    quantity: int
    amount: Decimal
    created_by: str
    created_at: datetime
    status: str


class PurchaseOrderDetail(PurchaseOrderSummary):
    item_description: str
    purchase_requisition: PurchaseRequisitionDetail


class PurchaseOrderResponse(BaseModel):
    purchase_order: PurchaseOrderDetail
    toast_message: str


class PurchaseOrderPdfPreview(BaseModel):
    po_number: str
    pr_number: str
    supplier_name: str
    created_by: str
    created_at: datetime
    item_name: str
    item_description: str
    quantity: int
    amount: Decimal
    business_justification: str
    required_date: date
    approval_status: str
    approver_1_details: List[ApprovalHistoryResponse]
    approver_2_details: List[ApprovalHistoryResponse]


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]


class ErrorResponse(BaseModel):
    detail: str
