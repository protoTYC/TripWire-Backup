import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  History,
  Image,
  Mail,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { useApp } from "../store";
import type { EmployeeDocument } from "../domain/types";
import {
  compatibleDocument,
  createEmployee,
  replaceDocument,
} from "../domain/operations";
import { dateOnly, formatDate } from "../domain/dates";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Modal,
  PageHeading,
  Status,
} from "../components/ui";

const documentLabels: Record<EmployeeDocument["type"], string> = {
  passport: "Passport",
  photo: "Portrait photo",
  authorization: "Visa / authorization",
  invitation: "Host invitation",
  other: "Other document",
};
const documentIcons = {
  passport: ShieldCheck,
  photo: Image,
  authorization: FileText,
  invitation: Mail,
  other: FileText,
};

export function EmployeesPage() {
  const { state, update } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const employees = state.employees.filter(
    (employee) =>
      (department === "all" || employee.department === department) &&
      `${employee.name} ${employee.employeeNumber} ${employee.email} ${employee.department} ${employee.homeOffice} ${employee.nationality}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  return (
    <>
      <PageHeading
        eyebrow="YOUR PEOPLE"
        title="Employees"
        description="Your people, their travel and the documents that keep things moving."
        action={
          <Button
            onClick={() => {
              setCreating(true);
              setError("");
            }}
          >
            <Plus size={17} /> Add employee
          </Button>
        }
      />
      <div className="metric-grid employee-metrics">
        <Card>
          <div className="metric-top">
            <span>Employee directory</span>
            <Users size={19} />
          </div>
          <div className="metric-value">{state.employees.length}</div>
          <div className="metric-footer">
            Across{" "}
            {new Set(state.employees.map((item) => item.homeOffice)).size} home
            offices
          </div>
        </Card>
        <Card>
          <div className="metric-top">
            <span>Departments</span>
            <Building2 size={19} />
          </div>
          <div className="metric-value">
            {new Set(state.employees.map((item) => item.department)).size}
          </div>
          <div className="metric-footer">Connected in one workspace</div>
        </Card>
        <Card>
          <div className="metric-top">
            <span>Documents on file</span>
            <FileText size={19} />
          </div>
          <div className="metric-value">{state.documents.length}</div>
          <div className="metric-footer">Current document records</div>
        </Card>
        <Card>
          <div className="metric-top">
            <span>Awaiting document review</span>
            <ShieldCheck size={19} />
          </div>
          <div className="metric-value">
            {
              state.documents.filter((item) => item.status === "submitted")
                .length
            }
          </div>
          <Link
            className="text-link metric-footer"
            to="/documents?status=submitted"
          >
            Open review queue <ArrowUpRight size={12} />
          </Link>
        </Card>
      </div>
      <Card>
        <div className="toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Search employees"
              placeholder="Search name, employee number or email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            aria-label="Filter employees by department"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <option value="all">All departments</option>
            {Array.from(new Set(state.employees.map((item) => item.department)))
              .sort()
              .map((item) => (
                <option key={item}>{item}</option>
              ))}
          </select>
          <span className="muted">
            {employees.length}{" "}
            {employees.length === 1 ? "employee" : "employees"}
          </span>
        </div>
        {employees.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department / office</th>
                  <th>Nationality</th>
                  <th>Cases</th>
                  <th>Documents on file</th>
                  <th>
                    <span className="sr-only">Profile</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => {
                  const documents = state.documents.filter(
                    (document) => document.employeeId === employee.id,
                  );
                  const needsReview = documents.filter(
                    (document) =>
                      document.status !== "reviewed" ||
                      (document.expiry &&
                        document.expiry < dateOnly(state.clock)),
                  ).length;
                  return (
                    <tr key={employee.id}>
                      <td>
                        <div className="person-cell">
                          <Avatar employee={employee} />
                          <div>
                            <Link
                              className="name-link"
                              to={`/employees/${employee.id}`}
                            >
                              {employee.name}
                            </Link>
                            <span className="table-subtext">
                              {employee.employeeNumber}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{employee.department}</div>
                        <span className="table-subtext">
                          {employee.homeOffice}
                        </span>
                      </td>
                      <td>{employee.nationality}</td>
                      <td>
                        <Badge tone="purple">
                          {
                            state.cases.filter(
                              (item) => item.employeeId === employee.id,
                            ).length
                          }{" "}
                          cases
                        </Badge>
                      </td>
                      <td>
                        <span>{documents.length} on file</span>
                        {needsReview > 0 && (
                          <span className="table-subtext text-danger">
                            {needsReview} need attention
                          </span>
                        )}
                      </td>
                      <td>
                        <Link
                          className="text-link"
                          to={`/employees/${employee.id}`}
                        >
                          View profile <ArrowUpRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No employees found">
            Try another name or department, or add an employee to get started.
          </Empty>
        )}
      </Card>
      {creating && (
        <Modal title="Add employee" onClose={() => setCreating(false)}>
          <form
            className="stack-md"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              const input = {
                name: String(values.get("name") || "").trim(),
                email: String(values.get("email") || "").trim(),
                department: String(values.get("department") || "").trim(),
                homeOffice: String(values.get("homeOffice") || "").trim(),
                nationality: String(values.get("nationality") || "").trim(),
              };
              if (Object.values(input).some((value) => !value)) {
                setError("Complete each field to create the employee record.");
                return;
              }
              if (
                state.employees.some(
                  (employee) =>
                    employee.email.toLowerCase() === input.email.toLowerCase(),
                )
              ) {
                setError("An employee with this email already exists.");
                return;
              }
              let createdId = "";
              update((draft) => {
                createEmployee(draft, input);
                createdId = draft.employees.at(-1)?.id || "";
              }, "Employee added");
              setCreating(false);
              if (createdId) navigate(`/employees/${createdId}`);
            }}
          >
            <p className="muted">
              A unique employee number is assigned automatically.
            </p>
            <Field label="Full name">
              <input
                required
                name="name"
                autoComplete="name"
                placeholder="e.g. Morgan Lee"
              />
            </Field>
            <Field label="Work email">
              <input
                required
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
              />
            </Field>
            <div className="grid-2">
              <Field label="Department">
                <input
                  required
                  name="department"
                  placeholder="e.g. Operations"
                />
              </Field>
              <Field label="Home office">
                <input
                  required
                  name="homeOffice"
                  placeholder="e.g. Singapore"
                />
              </Field>
            </div>
            <Field label="Nationality">
              <input required name="nationality" placeholder="e.g. Canadian" />
            </Field>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                <Plus size={16} /> Add employee
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function EmployeeDetailPage() {
  const { id } = useParams();
  const { state, update } = useApp();
  const [previewId, setPreviewId] = useState<string>();
  const [uploadId, setUploadId] = useState<string>();
  const [fileName, setFileName] = useState("");
  const [expiry, setExpiry] = useState("");
  const employee = state.employees.find((item) => item.id === id);
  if (!employee)
    return (
      <>
        <PageHeading title="Employee not found" />
        <Card>
          <Empty title="This employee record is unavailable">
            Return to the directory to find an employee.
          </Empty>
          <Link className="btn btn-secondary" to="/employees">
            <ArrowLeft size={15} /> Employee directory
          </Link>
        </Card>
      </>
    );
  const today = dateOnly(state.clock);
  const documents = state.documents.filter(
    (document) => document.employeeId === employee.id,
  );
  const cases = state.cases
    .filter((item) => item.employeeId === employee.id)
    .sort((a, b) => b.start.localeCompare(a.start));
  const preview = documents.find((document) => document.id === previewId);
  const uploading = documents.find((document) => document.id === uploadId);
  const expired = (document: EmployeeDocument) =>
    Boolean(document.expiry && document.expiry < today);
  const usages = (document: EmployeeDocument) =>
    cases.filter((item) =>
      item.requirements.some(
        (requirement) => requirement.documentId === document.id,
      ),
    );
  function openUpload(document: EmployeeDocument) {
    setUploadId(document.id);
    setPreviewId(undefined);
    setFileName("");
    setExpiry("");
  }
  return (
    <>
      <Link className="back-link" to="/employees">
        <ArrowLeft size={15} /> Employees
      </Link>
      <div className="employee-profile-heading">
        <div className="person-cell">
          <Avatar employee={employee} size="lg" />
          <div>
            <div className="eyebrow">{employee.employeeNumber}</div>
            <h1>{employee.name}</h1>
            <span className="muted">
              {employee.department} · {employee.homeOffice}
            </span>
          </div>
        </div>
        <Link
          className="btn btn-primary"
          to={`/cases/new?employee=${employee.id}`}
        >
          <Plus size={17} /> New case
        </Link>
      </div>
      <Card>
        <div className="profile-details">
          <div>
            <span className="detail-label">
              <Mail size={15} /> Work email
            </span>
            <a href={`mailto:${employee.email}`}>{employee.email}</a>
          </div>
          <div>
            <span className="detail-label">
              <Building2 size={15} /> Department
            </span>
            <strong>{employee.department}</strong>
          </div>
          <div>
            <span className="detail-label">
              <MapPin size={15} /> Home office
            </span>
            <strong>{employee.homeOffice}</strong>
          </div>
          <div>
            <span className="detail-label">
              <UserRound size={15} /> Nationality
            </span>
            <strong>{employee.nationality}</strong>
          </div>
        </div>
      </Card>
      <Card>
        <div className="section-heading">
          <div>
            <h2>Documents on file</h2>
            <p className="muted">
              Current versions, recorded dates and where each document is used.
            </p>
          </div>
          <Link className="text-link" to={`/documents?employee=${employee.id}`}>
            Document workspace <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="document-inventory">
          {documents.map((document) => {
            const Icon = documentIcons[document.type];
            const current = document.versions.find(
              (version) => version.id === document.currentVersionId,
            );
            const linkedCases = usages(document);
            return (
              <div className="document-inventory-row" key={document.id}>
                <div className="document-inventory-icon">
                  <Icon size={23} />
                </div>
                <div className="document-inventory-main">
                  <div className="document-title">
                    <strong>{documentLabels[document.type]}</strong>
                    {expired(document) ? (
                      <Badge tone="red">
                        <AlertCircle size={12} /> Expired · needs update
                      </Badge>
                    ) : (
                      <Status status={document.status} />
                    )}
                  </div>
                  <div className="table-subtext">
                    {current?.name || document.name} · Current version{" "}
                    {document.versions.findIndex(
                      (version) => version.id === document.currentVersionId,
                    ) + 1}
                  </div>
                  <div className="document-dates">
                    <span>
                      Expiry:{" "}
                      <strong
                        className={expired(document) ? "text-danger" : ""}
                      >
                        {document.expiry
                          ? formatDate(document.expiry)
                          : "Not recorded"}
                      </strong>
                    </span>
                    <span>
                      Last checked:{" "}
                      {document.checkedAt
                        ? formatDate(document.checkedAt)
                        : "Not recorded"}
                    </span>
                  </div>
                  {document.type === "passport" && !document.expiry && (
                    <div className="table-subtext text-danger">
                      Confirm passport expiry before reusing this version.
                    </div>
                  )}
                  <div className="document-usages">
                    {linkedCases.length ? (
                      linkedCases.map((item) => {
                        const requirements = item.requirements.filter(
                          (requirement) =>
                            requirement.documentId === document.id,
                        );
                        const validated =
                          !expired(document) &&
                          requirements.every(
                            (requirement) =>
                              compatibleDocument(
                                document,
                                item,
                                requirement.id,
                              ) &&
                              requirement.versionId ===
                                document.currentVersionId &&
                              requirement.status === "completed",
                          );
                        return (
                          <span key={item.id}>
                            <Link
                              className="text-link"
                              to={`/cases/${item.id}?tab=documents`}
                            >
                              {item.caseNumber}
                              <ArrowUpRight size={11} />
                            </Link>
                            <span
                              className={`usage-state ${validated ? "" : "text-danger"}`}
                            >
                              {validated
                                ? "Current version checked"
                                : "Revalidation needed"}
                            </span>
                          </span>
                        );
                      })
                    ) : (
                      <span className="muted">Not linked to a case</span>
                    )}
                  </div>
                </div>
                <div className="row-actions">
                  <Button
                    variant="secondary"
                    onClick={() => setPreviewId(document.id)}
                  >
                    Preview metadata
                  </Button>
                  <Button variant="ghost" onClick={() => openUpload(document)}>
                    <Upload size={14} /> Update
                  </Button>
                </div>
              </div>
            );
          })}
          {(["passport", "photo"] as const)
            .filter(
              (type) => !documents.some((document) => document.type === type),
            )
            .map((type) => (
              <div className="document-inventory-row" key={type}>
                <div className="document-inventory-icon">
                  <AlertCircle size={23} />
                </div>
                <div className="document-inventory-main">
                  <div className="document-title">
                    <strong>{documentLabels[type]}</strong>
                    <Badge tone="amber">Not on file</Badge>
                  </div>
                  <p className="muted">
                    Add this document through the relevant case requirement.
                  </p>
                </div>
                <Link
                  className="text-link"
                  to={
                    cases[0]
                      ? `/cases/${cases[0].id}?tab=documents`
                      : `/cases/new?employee=${employee.id}`
                  }
                >
                  {cases[0] ? "Open case" : "Start a case"}
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            ))}
        </div>
      </Card>
      <Card>
        <div className="section-heading">
          <div>
            <h2>Case history</h2>
            <p className="muted">
              {cases.length} {cases.length === 1 ? "case" : "cases"} linked to{" "}
              {employee.name.split(" ")[0]}.
            </p>
          </div>
          <History size={19} />
        </div>
        {cases.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Destination / purpose</th>
                  <th>Trip dates</th>
                  <th>Assigned to</th>
                  <th>Route</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className="text-link" to={`/cases/${item.id}`}>
                        {item.caseNumber}
                        <ArrowUpRight size={13} />
                      </Link>
                    </td>
                    <td>
                      <strong>{item.country}</strong>
                      <span className="table-subtext">{item.purpose}</span>
                    </td>
                    <td>
                      {formatDate(item.start)} – {formatDate(item.end)}
                    </td>
                    <td>{item.coordinator || "Unassigned"}</td>
                    <td>
                      <Badge tone={item.routeConfirmed ? "purple" : "amber"}>
                        {item.routeConfirmed
                          ? "Route confirmed"
                          : "Route needs review"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No cases yet">
            Create a case when this employee has travel to prepare.
          </Empty>
        )}
      </Card>
      {preview && (
        <Modal
          title={`${documentLabels[preview.type]} metadata`}
          onClose={() => setPreviewId(undefined)}
          wide
        >
          <div className="callout callout-blue">
            <FileText size={21} />
            <div>
              <strong>Metadata preview</strong>
              <p>
                This demonstration shows file names and review history. File
                contents are not stored or displayed, and real file access
                control is not enforced.
              </p>
            </div>
          </div>
          <dl className="detail-grid">
            <div>
              <dt>Current file</dt>
              <dd>
                {preview.versions.find(
                  (version) => version.id === preview.currentVersionId,
                )?.name || preview.name}
              </dd>
            </div>
            <div>
              <dt>Current status</dt>
              <dd>
                {expired(preview) ? (
                  <Badge tone="red">Expired · needs update</Badge>
                ) : (
                  <Status status={preview.status} />
                )}
              </dd>
            </div>
            <div>
              <dt>Expiry</dt>
              <dd>
                {preview.expiry ? formatDate(preview.expiry) : "Not recorded"}
              </dd>
            </div>
            <div>
              <dt>Last checked</dt>
              <dd>
                {preview.checkedAt
                  ? formatDate(preview.checkedAt)
                  : "Not recorded"}
              </dd>
            </div>
          </dl>
          <h3>Used in cases</h3>
          {usages(preview).length ? (
            <div className="stack-sm">
              {usages(preview).map((item) => (
                <Link
                  className="text-link"
                  key={item.id}
                  to={`/cases/${item.id}?tab=documents`}
                >
                  {item.caseNumber} · {item.country}
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">Not linked to a case.</p>
          )}
          <details className="details">
            <summary>
              <History size={16} /> Version history
            </summary>
            <div className="stack-sm">
              {[...preview.versions].reverse().map((version, index) => (
                <div className="list-row" key={version.id}>
                  <div>
                    <strong>{version.name}</strong>
                    <span className="table-subtext">
                      Version {preview.versions.length - index} ·{" "}
                      {formatDate(version.createdAt)}
                      {version.id === preview.currentVersionId
                        ? " · Current"
                        : ""}
                    </span>
                  </div>
                  <Status status={version.status} />
                </div>
              ))}
            </div>
          </details>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => openUpload(preview)}>
              <Upload size={15} /> Upload replacement
            </Button>
            <Link
              className="btn btn-primary"
              to={`/documents?document=${preview.id}`}
            >
              Review in Documents <ArrowUpRight size={14} />
            </Link>
          </div>
        </Modal>
      )}
      {uploading && (
        <Modal
          title={`Update ${documentLabels[uploading.type].toLowerCase()}`}
          onClose={() => setUploadId(undefined)}
        >
          <form
            className="stack-md"
            onSubmit={(event) => {
              event.preventDefault();
              if (!fileName) return;
              update((draft) => {
                replaceDocument(
                  draft,
                  uploading.id,
                  fileName,
                  expiry || undefined,
                );
              }, "New version recorded — review required");
              setUploadId(undefined);
            }}
          >
            <div className="callout callout-blue">
              <Upload size={21} />
              <p>
                Only the selected file name is retained in this demonstration.
                The replacement becomes the current version and awaits review.
                Linked case use requires revalidation.
              </p>
            </div>
            <Field
              label="Replacement file"
              hint="Choose a non-sensitive PDF or image."
            >
              <input
                required
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(event) =>
                  setFileName(event.target.files?.[0]?.name || "")
                }
              />
            </Field>
            <Field
              label="Recorded expiry"
              hint="Leave blank if not confirmed. Unknown expiry is not treated as valid."
            >
              <input
                type="date"
                value={expiry}
                onChange={(event) => setExpiry(event.target.value)}
              />
            </Field>
            <div className="modal-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setUploadId(undefined)}
              >
                Cancel
              </Button>
              <Button type="submit">
                <Upload size={15} /> Record replacement
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export default EmployeesPage;
