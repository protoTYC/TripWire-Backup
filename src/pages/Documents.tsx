import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileCheck2,
  FileText,
  History,
  Search,
  Upload,
} from "lucide-react";
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
import { useApp } from "../store";
import {
  addHistory,
  compatibleDocument,
  replaceDocument,
} from "../domain/operations";
import type { EmployeeDocument } from "../domain/types";

const documentLabels: Record<EmployeeDocument["type"], string> = {
  passport: "Passport",
  photo: "Portrait photo",
  invitation: "Host invitation",
  authorization: "Visa / authorization",
  other: "Other document",
};

function displayDate(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

export function DocumentsPage() {
  const { state, update } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const statusParam = searchParams.get("status") || "all";
  const filter = [
    "all",
    "submitted",
    "reviewed",
    "correction",
    "expired",
  ].includes(statusParam)
    ? statusParam
    : "all";
  const employeeId = searchParams.get("employee") || "";
  const previewId = searchParams.get("document") || undefined;
  const [reviewId, setReviewId] = useState<string>();
  const [uploadId, setUploadId] = useState<string>();
  const [reviewResult, setReviewResult] = useState<"reviewed" | "correction">(
    "reviewed",
  );
  const [note, setNote] = useState("");
  const [fileName, setFileName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [error, setError] = useState("");
  const today = state.clock.slice(0, 10);
  const expired = (document: EmployeeDocument) =>
    Boolean(document.expiry && document.expiry < today);
  const employeeFor = (document: EmployeeDocument) =>
    state.employees.find((employee) => employee.id === document.employeeId);
  const usagesFor = (document: EmployeeDocument) =>
    state.cases.filter((item) =>
      item.requirements.some(
        (requirement) => requirement.documentId === document.id,
      ),
    );
  const reviewDocument = state.documents.find(
    (document) => document.id === reviewId,
  );
  const previewDocument = state.documents.find(
    (document) => document.id === previewId,
  );
  const uploadDocument = state.documents.find(
    (document) => document.id === uploadId,
  );
  const needsPassportExpiry =
    reviewDocument?.type === "passport" &&
    (!reviewDocument.expiry || expired(reviewDocument));
  const scopedDocuments = state.documents.filter(
    (document) => !employeeId || document.employeeId === employeeId,
  );

  function changeParam(key: string, value?: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }
  function setFilter(value: string) {
    changeParam("status", value === "all" ? undefined : value);
  }
  function setPreviewId(value?: string) {
    changeParam("document", value);
  }

  const documents = useMemo(() => {
    const search = query.trim().toLowerCase();
    return state.documents.filter((document) => {
      const employee = state.employees.find(
        (item) => item.id === document.employeeId,
      );
      const cases = state.cases.filter((item) =>
        item.requirements.some(
          (requirement) => requirement.documentId === document.id,
        ),
      );
      const matchesQuery =
        !search ||
        [
          document.name,
          documentLabels[document.type],
          employee?.name,
          employee?.employeeNumber,
          employee?.email,
          ...cases.map((item) => item.caseNumber),
        ].some((value) => value?.toLowerCase().includes(search));
      const matchesFilter =
        filter === "all" ||
        (filter === "expired"
          ? Boolean(document.expiry && document.expiry < today)
          : document.status === filter);
      return (
        matchesQuery &&
        matchesFilter &&
        (!employeeId || document.employeeId === employeeId)
      );
    });
  }, [
    state.documents,
    state.employees,
    state.cases,
    query,
    filter,
    today,
    employeeId,
  ]);

  function openReview(document: EmployeeDocument) {
    setReviewId(document.id);
    setReviewResult("reviewed");
    setNote("");
    setError("");
  }

  function openUpload(document?: EmployeeDocument) {
    setUploadId(document?.id || state.documents[0]?.id);
    setFileName("");
    setExpiry("");
    setError("");
  }

  function saveReview(event: FormEvent) {
    event.preventDefault();
    if (!reviewDocument) return;
    if (!note.trim()) {
      setError("Add a review note so the decision can be understood later.");
      return;
    }
    if (reviewResult === "reviewed" && needsPassportExpiry) {
      setError(
        "Record a current passport expiry on an updated version before completing its review.",
      );
      return;
    }
    update(
      (draft) => {
        const document = draft.documents.find(
          (item) => item.id === reviewDocument.id,
        );
        if (!document) return;
        document.status = reviewResult;
        document.checkedAt = draft.clock;
        const current = document.versions.find(
          (version) => version.id === document.currentVersionId,
        );
        if (current) current.status = reviewResult;
        const linkedCases = draft.cases.filter((item) =>
          item.requirements.some(
            (requirement) => requirement.documentId === document.id,
          ),
        );
        for (const item of linkedCases) {
          for (const requirement of item.requirements) {
            if (requirement.documentId === document.id) {
              if (reviewResult === "correction")
                requirement.status = "correction";
              else if (requirement.versionId === document.currentVersionId)
                requirement.status = compatibleDocument(
                  document,
                  item,
                  requirement.id,
                )
                  ? "completed"
                  : "correction";
              else if (requirement.status === "completed")
                requirement.status = "correction";
            }
          }
          addHistory(
            draft,
            `${reviewResult === "reviewed" ? "Document reviewed" : "Document correction requested"}: ${document.name}. ${note.trim()}`,
            item.id,
          );
        }
        if (!linkedCases.length)
          addHistory(
            draft,
            `${reviewResult === "reviewed" ? "Document reviewed" : "Document correction requested"}: ${document.name}. ${note.trim()}`,
          );
      },
      reviewResult === "reviewed"
        ? "Document review recorded"
        : "Correction requested",
    );
    setReviewId(undefined);
  }

  function saveUpload(event: FormEvent) {
    event.preventDefault();
    if (!uploadDocument || !fileName.trim()) {
      setError(
        "Select the document record and choose a file to record its new version.",
      );
      return;
    }
    update((draft) => {
      replaceDocument(
        draft,
        uploadDocument.id,
        fileName.trim(),
        expiry || undefined,
      );
    }, "New version recorded for review");
    setUploadId(undefined);
  }

  return (
    <>
      <PageHeading
        title="Documents"
        description="A clear view of the documents your travelers have on file."
        action={
          <Button
            onClick={() => openUpload()}
            disabled={!state.documents.length}
          >
            <Upload size={16} /> Upload new version
          </Button>
        }
      />
      <div className="metric-grid">
        <button className="card metric-card" onClick={() => setFilter("all")}>
          <span className="metric-label">
            <FileText size={17} /> Documents on file
          </span>
          <strong>{scopedDocuments.length}</strong>
          <span className="muted">Current versions</span>
        </button>
        <button
          className="card metric-card"
          onClick={() => setFilter("submitted")}
        >
          <span className="metric-label">
            <FileCheck2 size={17} /> Awaiting review
          </span>
          <strong>
            {
              scopedDocuments.filter(
                (document) => document.status === "submitted",
              ).length
            }
          </strong>
          <span className="muted">Ready for your attention</span>
        </button>
        <button
          className="card metric-card"
          onClick={() => setFilter("correction")}
        >
          <span className="metric-label">
            <AlertTriangle size={17} /> Needs correction
          </span>
          <strong>
            {
              scopedDocuments.filter(
                (document) => document.status === "correction",
              ).length
            }
          </strong>
          <span className="muted">Follow up with the traveler</span>
        </button>
        <button
          className="card metric-card"
          onClick={() => setFilter("expired")}
        >
          <span className="metric-label">
            <History size={17} /> Expired documents
          </span>
          <strong>{scopedDocuments.filter(expired).length}</strong>
          <span className="muted">An updated version is needed</span>
        </button>
      </div>
      <Card>
        <div className="toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Search documents"
              placeholder="Search documents, employees or cases"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            aria-label="Filter documents by review status"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All documents</option>
            <option value="submitted">Awaiting review</option>
            <option value="reviewed">Reviewed</option>
            <option value="correction">Needs correction</option>
            <option value="expired">Expired</option>
          </select>
          <select
            aria-label="Filter documents by employee"
            value={employeeId}
            onChange={(event) => changeParam("employee", event.target.value)}
          >
            <option value="">All employees</option>
            {state.employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
          <span className="muted">
            {documents.length}{" "}
            {documents.length === 1 ? "document" : "documents"}
          </span>
        </div>
        {documents.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Employee</th>
                  <th>Review status</th>
                  <th>Expiry</th>
                  <th>Used in</th>
                  <th>Last checked</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => {
                  const employee = employeeFor(document);
                  const usages = usagesFor(document);
                  const current = document.versions.find(
                    (version) => version.id === document.currentVersionId,
                  );
                  return (
                    <tr key={document.id}>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => setPreviewId(document.id)}
                        >
                          <FileText size={17} /> {documentLabels[document.type]}
                        </button>
                        <div className="muted table-subline">
                          {current?.name || document.name}
                        </div>
                        <div className="muted table-subline">
                          Version{" "}
                          {document.versions.findIndex(
                            (version) =>
                              version.id === document.currentVersionId,
                          ) + 1}
                        </div>
                      </td>
                      <td>
                        {employee ? (
                          <Link
                            className="person-cell"
                            to={`/employees/${employee.id}`}
                          >
                            <Avatar employee={employee} size="sm" />
                            <span>
                              <strong>{employee.name}</strong>
                              <small>{employee.employeeNumber}</small>
                            </span>
                          </Link>
                        ) : (
                          <span className="muted">Employee unavailable</span>
                        )}
                      </td>
                      <td>
                        <Status status={document.status} />
                        {expired(document) && (
                          <div className="table-subline">
                            <Badge tone="red">
                              <AlertTriangle size={12} /> Needs update
                            </Badge>
                          </div>
                        )}
                      </td>
                      <td>
                        {document.expiry ? (
                          <span
                            className={expired(document) ? "text-danger" : ""}
                          >
                            {displayDate(document.expiry)}
                            {expired(document) && (
                              <small className="table-subline">Expired</small>
                            )}
                          </span>
                        ) : (
                          <Badge tone="amber">Not recorded</Badge>
                        )}
                      </td>
                      <td>
                        {usages.length ? (
                          <div className="stack-xs">
                            {usages.map((item) => (
                              <Link
                                className="text-link"
                                key={item.id}
                                to={`/cases/${item.id}?tab=documents`}
                              >
                                {item.caseNumber}
                                <ArrowUpRight size={12} />
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <span className="muted">Not linked</span>
                        )}
                      </td>
                      <td>{displayDate(document.checkedAt)}</td>
                      <td>
                        <Button
                          variant="secondary"
                          onClick={() => openReview(document)}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No documents match">
            Try another name, case number or review status.
          </Empty>
        )}
      </Card>
      {previewDocument && (
        <Modal
          title={`${documentLabels[previewDocument.type]} details`}
          onClose={() => setPreviewId(undefined)}
          wide
        >
          <div className="callout">
            <FileText size={19} />
            <div>
              <strong>Metadata preview</strong>
              <p>
                This demonstration records file names and review history. It
                does not display document contents or enforce real file access
                control.
              </p>
            </div>
          </div>
          <dl className="detail-grid">
            <div>
              <dt>Current file</dt>
              <dd>
                {previewDocument.versions.find(
                  (version) => version.id === previewDocument.currentVersionId,
                )?.name || previewDocument.name}
              </dd>
            </div>
            <div>
              <dt>Review status</dt>
              <dd>
                <Status status={previewDocument.status} />
              </dd>
            </div>
            <div>
              <dt>Recorded expiry</dt>
              <dd>
                {displayDate(previewDocument.expiry)}
                {expired(previewDocument) && (
                  <Badge tone="red">Expired · needs update</Badge>
                )}
              </dd>
            </div>
            <div>
              <dt>Last checked</dt>
              <dd>{displayDate(previewDocument.checkedAt)}</dd>
            </div>
          </dl>
          <h3>Linked case use</h3>
          {usagesFor(previewDocument).length ? (
            <div className="stack-sm">
              {usagesFor(previewDocument).map((item) => {
                const requirements = item.requirements.filter(
                  (requirement) =>
                    requirement.documentId === previewDocument.id,
                );
                const validUse =
                  !expired(previewDocument) &&
                  requirements.every(
                    (requirement) =>
                      compatibleDocument(
                        previewDocument,
                        item,
                        requirement.id,
                      ) &&
                      requirement.versionId ===
                        previewDocument.currentVersionId &&
                      requirement.status === "completed",
                  );
                return (
                  <div key={item.id} className="list-row">
                    <div>
                      <Link
                        className="text-link"
                        to={`/cases/${item.id}?tab=documents`}
                      >
                        {item.caseNumber} · {item.country}
                        <ArrowUpRight size={14} />
                      </Link>
                      <div className="muted">
                        {requirements
                          .map((requirement) => requirement.name)
                          .join(", ")}
                      </div>
                    </div>
                    <Badge tone={validUse ? "green" : "amber"}>
                      {validUse
                        ? "Current version checked"
                        : "Revalidation needed"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted">
              This document has not been linked to a case.
            </p>
          )}
          <details className="details">
            <summary>
              <History size={16} /> Version history (
              {previewDocument.versions.length})
            </summary>
            <div className="stack-sm">
              {[...previewDocument.versions].reverse().map((version, index) => (
                <div className="list-row" key={version.id}>
                  <div>
                    <strong>{version.name}</strong>
                    <div className="muted">
                      {displayDate(version.createdAt)} · Version{" "}
                      {previewDocument.versions.length - index}
                      {version.id === previewDocument.currentVersionId
                        ? " · Current"
                        : ""}
                    </div>
                  </div>
                  <Status status={version.status} />
                </div>
              ))}
            </div>
          </details>
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setPreviewId(undefined);
                openUpload(previewDocument);
              }}
            >
              <Upload size={15} /> Upload replacement
            </Button>
            <Button
              onClick={() => {
                setPreviewId(undefined);
                openReview(previewDocument);
              }}
            >
              Review current version
            </Button>
          </div>
        </Modal>
      )}
      {reviewDocument && (
        <Modal
          title="Review current document"
          onClose={() => setReviewId(undefined)}
        >
          <form onSubmit={saveReview} className="stack-md">
            <div className="callout">
              <FileCheck2 size={20} />
              <div>
                <strong>{reviewDocument.name}</strong>
                <p>
                  Record your check of this version. Case requirements update
                  only where this version meets the linked case’s criteria.
                </p>
              </div>
            </div>
            {needsPassportExpiry && (
              <div className="callout callout-warning">
                <AlertTriangle size={18} />
                <p>
                  {reviewDocument.expiry
                    ? "This passport has expired. Upload an updated version before completing its review."
                    : "Passport expiry is not recorded. Upload an updated version with its expiry before completing its review."}
                </p>
              </div>
            )}
            <Field label="Review result">
              <select
                value={reviewResult}
                onChange={(event) => {
                  setReviewResult(
                    event.target.value as "reviewed" | "correction",
                  );
                  setError("");
                }}
              >
                <option value="reviewed">
                  Reviewed — this version has been checked
                </option>
                <option value="correction">Needs correction</option>
              </select>
            </Field>
            <Field label="Review note">
              <textarea
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Record what you checked or what needs to change"
                required
              />
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
                onClick={() => setReviewId(undefined)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  reviewResult === "reviewed" && Boolean(needsPassportExpiry)
                }
              >
                <CheckCircle2 size={15} /> Record review
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {uploadDocument && (
        <Modal
          title="Upload a new document version"
          onClose={() => setUploadId(undefined)}
        >
          <form onSubmit={saveUpload} className="stack-md">
            <div className="callout">
              <Upload size={20} />
              <p>
                This metadata-only demonstration records the chosen file name. A
                replacement awaits review, and linked case use must be
                revalidated.
              </p>
            </div>
            <Field label="Document record">
              <select
                value={uploadId}
                onChange={(event) => {
                  setUploadId(event.target.value);
                  setFileName("");
                  setExpiry("");
                }}
              >
                {state.documents.map((document) => (
                  <option key={document.id} value={document.id}>
                    {employeeFor(document)?.name} ·{" "}
                    {documentLabels[document.type]}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Replacement file"
              hint="Only the file name is retained in this demonstration."
            >
              <input
                key={uploadId}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(event) =>
                  setFileName(event.target.files?.[0]?.name || "")
                }
                required
              />
            </Field>
            <Field
              label="Recorded expiry"
              hint="Leave blank if expiry has not been confirmed. An unknown expiry is not treated as valid."
            >
              <input
                type="date"
                value={expiry}
                onChange={(event) => setExpiry(event.target.value)}
              />
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
                onClick={() => setUploadId(undefined)}
              >
                Cancel
              </Button>
              <Button type="submit">
                <Upload size={15} /> Record new version
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export default DocumentsPage;
