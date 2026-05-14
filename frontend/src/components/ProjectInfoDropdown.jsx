const PROJECT_INFO = {
  id: "PR-PO-POC-001",
  name: "Purchase Requisition Approval POC",
};

export default function ProjectInfoDropdown() {
  return (
    <details className="project-info-dropdown">
      <summary className="project-info-dropdown__trigger">Project Info</summary>
      <div className="project-info-dropdown__menu">
        <p><strong>Project ID:</strong> {PROJECT_INFO.id}</p>
        <p><strong>Project Name:</strong> {PROJECT_INFO.name}</p>
      </div>
    </details>
  );
}
