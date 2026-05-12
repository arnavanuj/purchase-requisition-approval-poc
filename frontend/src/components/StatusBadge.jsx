const STATUS_VARIANTS = {
  approved: {
    icon: "\u2705",
    className: "badge status-badge status-approved",
  },
  rejected: {
    icon: "\u274C",
    className: "badge status-badge status-rejected",
  },
  pending: {
    icon: "\u{1F552}",
    className: "badge status-badge status-pending",
  },
  default: {
    icon: "",
    className: "badge status-badge",
  },
};

function getStatusVariant(status) {
  if (status === "Fully Approved") {
    return STATUS_VARIANTS.approved;
  }

  if (status === "Rejected") {
    return STATUS_VARIANTS.rejected;
  }

  if (
    [
      "Pending Level 1 Approval",
      "Pending Level 2 Approval",
      "Submitted",
      "Created",
      "Draft",
    ].includes(status)
  ) {
    return STATUS_VARIANTS.pending;
  }

  return STATUS_VARIANTS.default;
}

export default function StatusBadge({ status }) {
  const { icon, className } = getStatusVariant(status);

  return (
    <span className={className}>
      {icon ? <span aria-hidden="true" className="status-badge__icon">{icon}</span> : null}
      <span>{status}</span>
    </span>
  );
}
