const statusClasses = {
  "Pending Level 1 Approval": "badge pending-l1",
  "Pending Level 2 Approval": "badge pending-l2",
  "Fully Approved": "badge approved",
  Rejected: "badge rejected",
};

export default function StatusBadge({ status }) {
  return <span className={statusClasses[status] || "badge"}>{status}</span>;
}
