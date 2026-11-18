import { useState, type MouseEvent } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  Download,
  FileCheck2,
  FileText,
  Globe2,
  HelpCircle,
  Plus,
  Search,
  Send,
  Upload,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Drawer,
  Empty,
  ExternalLink,
  Field,
  Modal,
  PageHeading,
  Status,
} from "../components/ui";
import { useApp } from "../store";
import {
  addHistory,
  compatibleDocument,
  linkDocument,
  replaceDocument,
} from "../domain/operations";
import { getGuide } from "../domain/templates";
import { formatDate, inWindow } from "../domain/dates";
import type {
  AppState,
  Case,
  Employee,
  EmployeeDocument,
  Requirement,
} from "../domain/types";

const decisionCurrent = (c: Case) =>
  Boolean(c.decision) && !c.decision?.needsRevalidation;
const approved = (c: Case) =>
  decisionCurrent(c) && /^(approved|granted)$/i.test(c.decision?.outcome || "");
const complete = (r: Requirement) =>
  r.status === "completed" || r.status === "na";
const required = (r: Requirement) => r.kind === "required";
const docReady = (c: Case) =>
  c.requirements
    .filter((r) => r.stage === "documents" && required(r))
    .every(complete);
const prepReady = (c: Case) =>
  Boolean(c.draft) &&
  !c.draft?.needsReview &&
  Object.keys(applicationLabels(c)).every((key) =>
    Boolean(c.draft?.fields[key]?.trim()),
  ) &&
  c.draft?.fields.destination === c.country &&
  c.draft.fields.start === c.start &&
  c.draft.fields.end === c.end &&
  c.requirements
    .filter((r) => r.stage === "preparation" && required(r))
    .every(complete);
const caseProgress = (c: Case) => {
  const rows = c.requirements.filter(required);
  return rows.length
    ? Math.round((rows.filter(complete).length / rows.length) * 100)
    : 0;
};
const caseLabel = (c: Case) =>
  c.decision?.needsRevalidation
    ? !c.routeConfirmed
      ? "Review route for new passport"
      : !docReady(c)
        ? "Recheck passport"
        : !prepReady(c)
          ? "Review preparation"
          : "Recheck authority result"
    : c.decision
      ? approved(c)
        ? "Decision recorded"
        : "Decision needs action"
      : c.submission
        ? "Awaiting decision"
        : !c.routeConfirmed
          ? "Confirm route"
          : !docReady(c)
            ? "Collect documents"
            : !prepReady(c)
              ? "Prepare application"
              : "Ready for handoff";
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
function requestDocuments(state: AppState, c: Case, items: Requirement[]) {
  const selected = items.filter((r) => r.party === "employee" && !complete(r));
  if (!selected.length) return;
  const threadId = uid("thread");
  state.threads.unshift({
    id: threadId,
    title: `Documents needed · ${c.caseNumber}`,
    employeeId: c.employeeId,
    caseId: c.id,
    audience: "employee",
    assignee: c.coordinator || state.profile.name,
    unread: false,
    status: "awaiting",
    requirementIds: selected.map((r) => r.id),
    messages: [
      {
        id: uid("message"),
        author: state.profile.name,
        body: `Please provide the following for your ${c.country} trip (${formatDate(c.start)}–${formatDate(c.end)}):\n\n${selected.map((r) => `• ${r.name}: ${r.instruction}`).join("\n")}\n\nReply here if you have a question.`,
        at: state.clock,
        audience: "employee",
      },
    ],
  });
  selected.forEach((r) => {
    r.status = "requested";
  });
  addHistory(
    state,
    `Created an employee-facing request for ${selected.map((r) => r.name).join(", ")}. No email was sent.`,
    c.id,
  );
}
function rowNavigate(
  event: MouseEvent<HTMLTableRowElement>,
  navigate: ReturnType<typeof useNavigate>,
  id: string,
) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    window.getSelection()?.toString()
  )
    return;
  const target = event.target as HTMLElement;
  if (
    target.closest(
      'a,button,input,select,textarea,label,[role="menu"],[role="menuitem"]',
    )
  )
    return;
  navigate(`/cases/${id}`);
}
export function CasesPage() {
  const { state, update, notify } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [stage, setStage] = useState(params.get("stage") || "all");
  const queue = params.get("queue") || "all";
  const [selected, setSelected] = useState<string[]>([]);
  const rows = state.cases.filter((c) => {
    const employee = state.employees.find((e) => e.id === c.employeeId);
    const match =
      `${c.caseNumber} ${employee?.name} ${employee?.employeeNumber} ${c.country} ${c.purpose}`
        .toLowerCase()
        .includes(query.toLowerCase());
    const queueMatch =
      queue !== "departing" ||
      (inWindow(c.start, state.clock, 3) &&
        c.requirements.some((r) => required(r) && !complete(r)));
    return (
      match &&
      queueMatch &&
      (stage === "all" ||
        (stage === "preparing" && !docReady(c)) ||
        (stage === "ready" && docReady(c)) ||
        (stage === "review" && !c.routeConfirmed) ||
        (stage === "documents" && !docReady(c)) ||
        (stage === "preparation" && docReady(c) && !prepReady(c)) ||
        (stage === "submitted" && Boolean(c.submission) && !c.decision) ||
        (stage === "decision" && Boolean(c.decision)))
    );
  });
  const requestSelected = () => {
    let count = 0;
    update((draft) => {
      draft.cases
        .filter((c) => selected.includes(c.id))
        .forEach((c) => {
          const missing = c.requirements.filter(
            (r) => r.documentType && r.party === "employee" && !complete(r),
          );
          if (missing.length) {
            requestDocuments(draft, c, missing);
            count++;
          }
        });
    }, "Document requests created in employee messages");
    if (!count) notify("Selected cases have no missing employee documents.");
    setSelected([]);
  };
  return (
    <>
      <PageHeading
        eyebrow="CASE WORKSPACE"
        title="Cases"
        description="A clear path from trip details to a prepared application."
        action={
          <Link className="btn btn-primary" to="/cases/new">
            <Plus size={17} />
            New case
          </Link>
        }
      />
      <Card>
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Search cases"
              placeholder="Search employee, case number or destination"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter cases by stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="all">All stages</option>
            <option value="preparing">Preparing · documents incomplete</option>
            <option value="ready">Documents ready</option>
            <option value="review">Route confirmation</option>
            <option value="documents">Collecting documents</option>
            <option value="preparation">Application preparation</option>
            <option value="submitted">Awaiting decision</option>
            <option value="decision">Decision recorded</option>
          </select>
          <select
            aria-label="Case queue"
            value={queue}
            onChange={(event) =>
              setParams((current) => {
                const next = new URLSearchParams(current);
                if (event.target.value === "all") next.delete("queue");
                else next.set("queue", event.target.value);
                return next;
              })
            }
          >
            <option value="all">All cases</option>
            <option value="departing">
              Departing soon · missing requirements
            </option>
          </select>
          {(query || stage !== "all" || queue !== "all") && (
            <Button
              variant="ghost"
              onClick={() => {
                setQuery("");
                setStage("all");
                setParams({});
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
        {queue === "departing" && (
          <div className="callout callout-amber">
            <strong>Departing soon with missing requirements</strong>
            <p>
              Cases with planned entry in the next 72 hours and incomplete
              required steps. Date-only plans have no recorded flight time.
            </p>
          </div>
        )}
        {selected.length > 0 && (
          <div className="selection-bar">
            <span>{selected.length} selected</span>
            <Button variant="secondary" onClick={requestSelected}>
              <Send size={15} />
              Request missing documents
            </Button>
            <Button variant="ghost" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        )}
        <div className="table-wrap">
          <table className="data-table case-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all visible cases"
                    checked={
                      rows.length > 0 &&
                      rows.every((c) => selected.includes(c.id))
                    }
                    onChange={(e) =>
                      setSelected(e.target.checked ? rows.map((c) => c.id) : [])
                    }
                  />
                </th>
                <th>Employee / case</th>
                <th>Destination & purpose</th>
                <th>Trip dates</th>
                <th>Next step</th>
                <th>Assigned to</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const employee = state.employees.find(
                  (e) => e.id === c.employeeId,
                );
                if (!employee) return null;
                return (
                  <tr
                    className="clickable-row"
                    key={c.id}
                    onClick={(e) => rowNavigate(e, navigate, c.id)}
                  >
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${c.caseNumber}`}
                        checked={selected.includes(c.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, c.id]
                              : selected.filter((id) => id !== c.id),
                          )
                        }
                      />
                    </td>
                    <td>
                      <div className="person-cell">
                        <Avatar employee={employee} />
                        <div>
                          <Link
                            className="case-employee-link"
                            to={`/cases/${c.id}`}
                          >
                            {employee.name}
                          </Link>
                          <small className="muted">{c.caseNumber}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{c.country}</strong>
                      <small className="muted">{c.purpose}</small>
                    </td>
                    <td>
                      <span>{formatDate(c.start)}</span>
                      <small className="muted">
                        {queue === "departing" ? "Date only · " : ""}to{" "}
                        {formatDate(c.end)}
                      </small>
                    </td>
                    <td>
                      <Badge
                        tone={
                          approved(c)
                            ? "green"
                            : c.decision
                              ? "amber"
                              : c.routeConfirmed
                                ? "purple"
                                : "amber"
                        }
                      >
                        {caseLabel(c)}
                      </Badge>
                      <div
                        className="mini-progress"
                        aria-label={`${caseProgress(c)} percent of required steps complete`}
                      >
                        <span style={{ width: `${caseProgress(c)}%` }} />
                      </div>
                    </td>
                    <td>{c.coordinator || "Unassigned"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <Empty title="No matching cases">
            Try another employee, destination or stage.
          </Empty>
        )}
        <div className="table-footer">
          {rows.length} {rows.length === 1 ? "case" : "cases"}
          <span>Preparation progress reflects recorded checklist work.</span>
        </div>
      </Card>
    </>
  );
}

export function CaseDetailPage() {
  const { id } = useParams();
  const { state, update, notify } = useApp();
  const [params, setParams] = useSearchParams();
  const tabValue = params.get("tab") || "process";
  const tab = ["process", "documents", "messages", "history"].includes(tabValue)
    ? tabValue
    : "process";
  const c = state.cases.find((item) => item.id === id);
  const employee = state.employees.find((item) => item.id === c?.employeeId);
  const [guideOpen, setGuideOpen] = useState(false);
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [uploadReq, setUploadReq] = useState<Requirement | null>(null);
  const [reviewReq, setReviewReq] = useState<Requirement | null>(null);
  const [checkReq, setCheckReq] = useState<Requirement | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [reply, setReply] = useState("");
  const [audience, setAudience] = useState<"employee" | "internal">("employee");
  const [newThread, setNewThread] = useState(false);
  if (!c || !employee)
    return (
      <>
        <Link to="/cases" className="back-link">
          <ArrowLeft size={15} />
          Cases
        </Link>
        <Empty title="Case not found">
          This case may have been removed. Open Cases to find a current record.
        </Empty>
      </>
    );
  const guide = getGuide(c.route);
  const documentItems = c.requirements.filter(
    (r) => r.documentType || r.stage === "documents",
  );
  const selectedItems = c.requirements.filter((r) => selected.includes(r.id));
  const missingEmployee = documentItems.filter(
    (r) => r.party === "employee" && r.documentType && !complete(r),
  );
  const stages = [
    Boolean(c.routeConfirmed),
    docReady(c),
    prepReady(c),
    Boolean(c.submission),
    decisionCurrent(c),
    c.requirements
      .filter((r) => r.stage === "departure" && required(r))
      .every(complete) &&
      approved(c) &&
      Boolean(
        c.decision?.validFrom &&
          c.decision?.validUntil &&
          c.decision.validFrom <= c.start &&
          c.decision.validUntil >= c.end,
      ),
  ];
  const stageLabels = [
    "Trip details",
    "Documents",
    "Application preparation",
    "Official submission",
    "Decision",
    "Before departure",
  ];
  let reached = true;
  const sequential = stages.map((done) => {
    reached = reached && done;
    return reached;
  });
  const currentStage = sequential.findIndex((done) => !done);
  const apply = (
    recipe: (draft: AppState, target: Case) => void,
    message: string,
  ) =>
    update((draft) => {
      const target = draft.cases.find((item) => item.id === c.id);
      if (target) recipe(draft, target);
    }, message);
  const request = (items: Requirement[]) => {
    if (!items.length) {
      notify("Choose a missing employee document first.");
      return;
    }
    apply(
      (draft, target) =>
        requestDocuments(
          draft,
          target,
          target.requirements.filter((r) =>
            items.some((item) => item.id === r.id),
          ),
        ),
      "Document request added to employee messages",
    );
    setSelected([]);
  };
  const requestReview = () => {
    apply((draft, target) => {
      const existing = draft.threads.find(
        (t) =>
          t.caseId === target.id &&
          t.audience === "internal" &&
          t.title.startsWith("Advice needed:") &&
          t.status !== "resolved",
      );
      if (existing) return;
      draft.threads.unshift({
        id: uid("thread"),
        title: `Advice needed: ${target.reviewQuestion || `confirm whether ${guide.title} fits the planned activities`}`,
        employeeId: target.employeeId,
        caseId: target.id,
        audience: "internal",
        assignee: "Unassigned",
        unread: false,
        status: "open",
        messages: [
          {
            id: uid("message"),
            author: draft.profile.name,
            body: `${target.reviewQuestion || `Confirm whether ${guide.title} is appropriate for ${target.purpose}.`}\nHost: ${target.host || "Not recorded"}. Intended dates: ${target.start} to ${target.end}. Please assign a qualified reviewer and record the route assessment.`,
            at: draft.clock,
            audience: "internal",
          },
        ],
      });
      addHistory(
        draft,
        "Created an unassigned internal route review request.",
        target.id,
      );
    }, "Route review request created in Internal inbox");
  };
  const nextAction = () => {
    if (!c.routeConfirmed) {
      setRouteOpen(true);
      return;
    }
    const pending = c.requirements.find(
      (r) =>
        required(r) &&
        !complete(r) &&
        (r.stage === "documents" ||
          r.stage === "preparation" ||
          Boolean(r.documentType)),
    );
    if (pending) {
      if (pending.documentType) {
        if (pending.status === "submitted") setReviewReq(pending);
        else {
          const reusable = state.documents.find(
            (d) =>
              d.type === pending.documentType &&
              d.employeeId === c.employeeId &&
              compatibleDocument(d, c, pending.id),
          );
          if (reusable)
            document
              .getElementById("case-checklist")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          else setUploadReq(pending);
        }
      } else if (pending.name === "Route and activity confirmation")
        setRouteOpen(true);
      else if (pending.name.includes("TripWire application"))
        setApplicationOpen(true);
      else setCheckReq(pending);
      return;
    }
    if (!prepReady(c)) {
      setApplicationOpen(true);
      return;
    }
    if (!c.submission) setSubmissionOpen(true);
    else if (!c.decision || !approved(c)) setDecisionOpen(true);
    else
      document
        .getElementById("case-checklist")
        ?.scrollIntoView({ behavior: "smooth", block: "end" });
  };
  const reuse = (r: Requirement, doc: EmployeeDocument) => {
    apply((draft, target) => {
      linkDocument(draft, target.id, r.id, doc.id);
    }, "Current reviewed document linked to this case");
  };
  const check = (r: Requirement) => {
    const dependencyBlocked =
      r.stage === "departure" &&
      (!c.routeConfirmed ||
        !docReady(c) ||
        !prepReady(c) ||
        !c.decision ||
        !approved(c) ||
        !c.decision.validFrom ||
        !c.decision.validUntil ||
        c.decision.validFrom > c.start ||
        c.decision.validUntil < c.end ||
        !c.requirements
          .filter((req) => req.stage === "decision" && required(req))
          .every(complete));
    if (dependencyBlocked) {
      notify(
        "Recheck the route, current documents, preparation and approved authority-result validity for the full trip before completing departure checks.",
      );
      return;
    }
    apply((draft, target) => {
      const item = target.requirements.find((req) => req.id === r.id);
      if (item) item.status = "completed";
      addHistory(draft, `Checked ${r.name}.`, target.id);
    }, `${r.name} marked checked`);
  };
  function requirementAction(r: Requirement) {
    if (r.documentType) {
      const doc = state.documents.find((d) => d.id === r.documentId);
      const reusable = state.documents.find(
        (d) =>
          d.type === r.documentType &&
          d.employeeId === c!.employeeId &&
          compatibleDocument(d, c!, r.id),
      );
      if (r.status === "submitted" || doc?.status === "submitted")
        return (
          <Button variant="secondary" onClick={() => setReviewReq(r)}>
            Review
          </Button>
        );
      if (complete(r))
        return (
          <Button variant="ghost" onClick={() => setReviewReq(r)}>
            Review details
          </Button>
        );
      return (
        <div className="requirement-actions">
          {reusable && (
            <Button variant="secondary" onClick={() => reuse(r, reusable)}>
              Use document on file
            </Button>
          )}
          <Button
            variant={reusable ? "ghost" : "secondary"}
            onClick={() => setUploadReq(r)}
          >
            <Upload size={14} />
            {r.status === "correction"
              ? "Upload replacement"
              : "Upload document"}
          </Button>
          {r.party === "employee" && r.status !== "requested" && (
            <Button variant="ghost" onClick={() => request([r])}>
              Request document
            </Button>
          )}
          {r.party === "host" && (
            <Button
              variant="ghost"
              onClick={() => {
                apply((draft, target) => {
                  const item = target.requirements.find((i) => i.id === r.id);
                  if (item) item.status = "requested";
                  draft.threads.unshift({
                    id: uid("thread"),
                    title: `Host coordination: ${r.name}`,
                    employeeId: target.employeeId,
                    caseId: target.id,
                    audience: "internal",
                    assignee: target.coordinator || "Unassigned",
                    unread: false,
                    status: "open",
                    requirementIds: [r.id],
                    messages: [
                      {
                        id: uid("message"),
                        author: draft.profile.name,
                        body: `Coordinate with ${target.host || "the host"} to obtain ${r.name}. ${r.instruction}`,
                        at: draft.clock,
                        audience: "internal",
                      },
                    ],
                  });
                  addHistory(
                    draft,
                    `Created host coordination task for ${r.name}.`,
                    target.id,
                  );
                }, "Host coordination request created in Internal inbox");
              }}
            >
              Coordinate with host
            </Button>
          )}
        </div>
      );
    }
    if (r.stage === "preparation") {
      if (r.name === "Route and activity confirmation")
        return (
          <Button
            variant={complete(r) ? "ghost" : "secondary"}
            onClick={() => setRouteOpen(true)}
          >
            {complete(r) ? "Review assessment" : "Review route"}
          </Button>
        );
      if (
        !c!.routeConfirmed &&
        (r.name.toLowerCase().includes("route") ||
          r.name.toLowerCase().includes("assessment"))
      )
        return (
          <Button variant="secondary" onClick={requestReview}>
            Request review
          </Button>
        );
      if (r.name.includes("TripWire application"))
        return (
          <Button
            variant={complete(r) ? "ghost" : "secondary"}
            onClick={() => setApplicationOpen(true)}
          >
            {complete(r) ? "View draft" : "Prepare draft"}
          </Button>
        );
      return (
        <Button
          variant={complete(r) ? "ghost" : "secondary"}
          onClick={() => setCheckReq(r)}
        >
          {complete(r) ? "Review check" : "Prepare & check"}
        </Button>
      );
    }
    if (r.stage === "submission" && r.name !== "Official submission reference")
      return (
        <Button variant="secondary" onClick={() => setCheckReq(r)}>
          {complete(r) ? "Review check" : "Record completion"}
        </Button>
      );
    if (r.stage === "submission")
      return (
        <Button variant="secondary" onClick={() => setSubmissionOpen(true)}>
          {c!.submission ? "View submission record" : "Record submission"}
        </Button>
      );
    if (r.stage === "decision")
      return (
        <Button variant="secondary" onClick={() => setDecisionOpen(true)}>
          {c!.decision ? "Review decision" : "Add decision"}
        </Button>
      );
    if (
      !c!.routeConfirmed &&
      (r.name.toLowerCase().includes("route") ||
        r.name.toLowerCase().includes("advice"))
    )
      return (
        <Button variant="secondary" onClick={requestReview}>
          Request review
        </Button>
      );
    return (
      <Button
        variant={complete(r) ? "ghost" : "secondary"}
        onClick={() => {
          if (
            r.stage === "departure" &&
            (!c!.routeConfirmed ||
              !docReady(c!) ||
              !prepReady(c!) ||
              !c!.decision ||
              !approved(c!) ||
              !c!.decision.validFrom ||
              !c!.decision.validUntil ||
              c!.decision.validFrom > c!.start ||
              c!.decision.validUntil < c!.end ||
              !c!.requirements
                .filter((req) => req.stage === "decision" && required(req))
                .every(complete))
          ) {
            check(r);
            return;
          }
          setCheckReq(r);
        }}
      >
        {complete(r) ? "Review check" : "Mark checked"}
      </Button>
    );
  }
  const allThreads = state.threads.filter(
    (t) => t.caseId === c.id && t.audience === audience,
  );
  const sendMessage = () => {
    if (!reply.trim()) return;
    apply(
      (draft, target) => {
        draft.threads.unshift({
          id: uid("thread"),
          title:
            audience === "employee"
              ? `Trip question · ${target.caseNumber}`
              : `Internal note · ${target.caseNumber}`,
          employeeId: target.employeeId,
          caseId: target.id,
          audience,
          assignee: target.coordinator || "Unassigned",
          unread: false,
          status: "open",
          messages: [
            {
              id: uid("message"),
              author: draft.profile.name,
              body: reply.trim(),
              at: draft.clock,
              audience,
            },
          ],
        });
        addHistory(
          draft,
          `Added ${audience === "employee" ? "an employee message" : "an internal note"}. No email was sent.`,
          target.id,
        );
      },
      audience === "employee"
        ? "Employee-facing message saved locally"
        : "Internal note saved",
    );
    setReply("");
    setNewThread(false);
  };
  return (
    <>
      <Link className="back-link" to="/cases">
        <ArrowLeft size={15} />
        All cases
      </Link>
      <div className="case-heading">
        <div className="person-cell">
          <Avatar employee={employee} size="lg" />
          <div>
            <div className="eyebrow">{c.caseNumber}</div>
            <h1>
              {employee.name} <span className="heading-slash">/</span>{" "}
              {c.country}
            </h1>
            <p>
              {c.purpose}{" "}
              <span className="muted">
                · {formatDate(c.start)}–{formatDate(c.end)}
              </span>
            </p>
          </div>
        </div>
        <Button onClick={nextAction}>
          {caseLabel(c)}
          <ArrowRight size={16} />
        </Button>
      </div>
      <div className="case-meta-strip">
        <button className="route-trigger" onClick={() => setGuideOpen(true)}>
          <Globe2 size={16} />
          <strong>{guide.title}</strong>
          <Badge tone={c.routeConfirmed ? "purple" : "amber"}>
            {c.routeConfirmed ? "Route recorded" : "Needs confirmation"}
          </Badge>
          <HelpCircle size={15} />
        </button>
        <span>
          Assigned to <strong>{c.coordinator || "Unassigned"}</strong>
        </span>
        <Link className="text-link" to={`/employees/${employee.id}`}>
          {employee.employeeNumber}
        </Link>
      </div>
      <nav className="tabs" aria-label="Case sections">
        {["process", "documents", "messages", "history"].map((name) => (
          <button
            key={name}
            className={tab === name ? "active" : ""}
            aria-current={tab === name ? "page" : undefined}
            onClick={() => setParams({ tab: name })}
          >
            {name[0].toUpperCase() + name.slice(1)}
            {name === "messages" && (
              <span className="tab-count">
                {
                  state.threads.filter(
                    (t) => t.caseId === c.id && t.audience === "employee",
                  ).length
                }
              </span>
            )}
          </button>
        ))}
      </nav>
      {tab === "process" && (
        <>
          <ol className="case-stepper" aria-label="Preparation stages">
            {stageLabels.map((label, i) => (
              <li
                key={label}
                className={
                  sequential[i]
                    ? "complete"
                    : i === currentStage
                      ? "current"
                      : ""
                }
              >
                {sequential[i] ? (
                  <CheckCircle2 size={19} />
                ) : (
                  <span className="step-number">{i + 1}</span>
                )}
                <span>{label}</span>
              </li>
            ))}
          </ol>
          {!c.routeConfirmed && (
            <div className="callout callout-amber case-route-callout">
              <HelpCircle size={19} />
              <div>
                <strong>
                  {c.reviewQuestion
                    ? `Advice needed: ${c.reviewQuestion}`
                    : `Confirm the proposed ${guide.title} route`}
                </strong>
                <p>
                  {c.route === "work-review"
                    ? "This case retains its work activities. The correct employment or work-permission route needs assessment."
                    : "Check the planned activities, passport and host before treating this as the selected route."}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setRouteOpen(true)}>
                Review route
              </Button>
            </div>
          )}
          {c.decision?.needsRevalidation && (
            <div className="callout callout-amber">
              <strong>
                The previous authority result needs revalidation after a
                passport replacement.
              </strong>
              <p>
                The earlier reference stays in history. Review the current
                passport, update preparation and confirm the authority result is
                linked to the replacement passport before departure.
              </p>
            </div>
          )}
          <div className="detail-grid case-process-grid">
            <div>
              <Card>
                <div className="section-heading" id="case-checklist">
                  <div>
                    <h2>Application checklist</h2>
                    <p className="muted">
                      Named documents and the steps that follow.
                    </p>
                  </div>
                  <Badge>
                    {c.requirements.filter(complete).length}/
                    {c.requirements.length} complete
                  </Badge>
                </div>
                <div className="checklist-toolbar">
                  <Button
                    variant="secondary"
                    disabled={!missingEmployee.length}
                    onClick={() =>
                      request(
                        selectedItems.length ? selectedItems : missingEmployee,
                      )
                    }
                  >
                    <Send size={14} />
                    {selectedItems.length
                      ? `Request selected (${selectedItems.length})`
                      : "Request missing documents"}
                  </Button>
                  <span className="muted">
                    Requests appear in employee messages
                  </span>
                </div>
                <div className="checklist">
                  {c.requirements.map((r) => (
                    <div
                      className={`checklist-item ${complete(r) ? "is-complete" : ""}`}
                      key={r.id}
                    >
                      <div className="requirement-icon">
                        {r.documentType ? (
                          <FileText size={20} />
                        ) : r.stage === "decision" ? (
                          <FileCheck2 size={20} />
                        ) : (
                          <ClipboardList size={20} />
                        )}
                      </div>
                      <div className="requirement-content">
                        <div className="requirement-title">
                          {r.party === "employee" &&
                            r.documentType &&
                            !complete(r) && (
                              <input
                                type="checkbox"
                                aria-label={`Select ${r.name}`}
                                checked={selected.includes(r.id)}
                                onChange={(e) =>
                                  setSelected(
                                    e.target.checked
                                      ? [...selected, r.id]
                                      : selected.filter((id) => id !== r.id),
                                  )
                                }
                              />
                            )}
                          <h3>{r.name}</h3>
                          <Status status={r.status} />
                        </div>
                        <div className="requirement-meta">
                          Assigned to{" "}
                          <strong>
                            {r.assignee ||
                              (r.party === "employee"
                                ? employee.name
                                : r.party === "host"
                                  ? "Host"
                                  : c.coordinator || "Unassigned")}
                          </strong>
                          {r.kind !== "required" && (
                            <Badge>
                              {r.kind === "conditional"
                                ? "When applicable"
                                : "Recommended"}
                            </Badge>
                          )}
                          {r.due && (
                            <span
                              className={
                                r.due < state.clock.slice(0, 10) && !complete(r)
                                  ? "inline-warning"
                                  : ""
                              }
                            >
                              Internal target {formatDate(r.due)}
                              {r.due < state.clock.slice(0, 10) && !complete(r)
                                ? " · Overdue"
                                : ""}
                            </span>
                          )}
                        </div>
                        <details className="requirement-details">
                          <summary>Details</summary>
                          <p>{r.instruction}</p>
                          {r.details && <p>{r.details}</p>}
                          {r.documentId && (
                            <DocumentVersionInfo
                              document={state.documents.find(
                                (d) => d.id === r.documentId,
                              )}
                              versionId={r.versionId}
                            />
                          )}
                          <small>
                            Template v{c.templateVersion} · {r.stage} ·{" "}
                            {r.party === "hr" ? "HR" : r.party}
                          </small>
                        </details>
                      </div>
                      <div className="requirement-action-cell">
                        {requirementAction(r)}
                      </div>
                    </div>
                  ))}
                </div>
                {c.requirements.length === 0 && (
                  <Empty title="Confirm the route to build a checklist">
                    Record a route assessment before requesting documents.
                  </Empty>
                )}
              </Card>
              {c.internalTasks.length > 0 && (
                <Card className="internal-task-card">
                  <details>
                    <summary>
                      Internal HR tasks{" "}
                      <Badge>
                        {
                          c.internalTasks.filter(
                            (t) => t.status !== "completed",
                          ).length
                        }{" "}
                        open
                      </Badge>
                    </summary>
                    <p className="muted">
                      Team coordination stays separate from the application
                      dossier.
                    </p>
                    {c.internalTasks.map((task) => (
                      <div className="internal-task-row" key={task.id}>
                        <span>{task.name}</span>
                        <Status status={task.status} />
                        <Button
                          variant="ghost"
                          disabled={task.status === "completed"}
                          onClick={() =>
                            apply((draft, target) => {
                              const item = target.internalTasks.find(
                                (t) => t.id === task.id,
                              );
                              if (item) item.status = "completed";
                              addHistory(
                                draft,
                                `Completed internal task: ${task.name}.`,
                                target.id,
                              );
                            }, "Internal task completed")
                          }
                        >
                          Mark done
                        </Button>
                      </div>
                    ))}
                  </details>
                </Card>
              )}
            </div>
            <aside className="case-summary">
              <Card>
                <span className="eyebrow">NEXT STEP</span>
                <div className="next-step-icon">
                  <ClipboardList size={24} />
                </div>
                <h2>{caseLabel(c)}</h2>
                <p>
                  {!c.routeConfirmed
                    ? "Record the activity and route assessment first."
                    : !docReady(c)
                      ? "Collect and review the required documents. Reuse a compatible current document where available."
                      : !prepReady(c)
                        ? "Build an editable field summary and a dossier index from this case."
                        : !c.submission
                          ? "Review the prepared dossier, then submit through the official channel."
                          : !decisionCurrent(c)
                            ? c.decision?.needsRevalidation
                              ? "The traveling passport changed. Recheck the authority result and current passport linkage."
                              : "Record the authority result when it is available."
                            : "Review decision details and finish the departure checks."}
                </p>
                <Button onClick={nextAction}>
                  Continue
                  <ArrowRight size={15} />
                </Button>
                <div className="summary-divider" />
                <h3>Fees</h3>
                <strong>{guide.fee}</strong>
                <p className="muted">{guide.feeScope}</p>
                <h3>Timing</h3>
                <p>{guide.timing}</p>
                <small className="muted">
                  Processing estimates are separate from internal targets and
                  permission validity.
                </small>
                <button
                  className="text-link"
                  onClick={() => setGuideOpen(true)}
                >
                  Route guide & official sources
                  <ArrowRight size={14} />
                </button>
              </Card>
              <div className="case-footnote">
                <FileCheck2 size={15} />
                <span>
                  Documents ready means the preparation checklist is complete.
                  Authority decisions are recorded separately.
                </span>
              </div>
            </aside>
          </div>
        </>
      )}
      {tab === "documents" && (
        <Card>
          <div className="section-heading">
            <div>
              <h2>Case dossier</h2>
              <p className="muted">
                Current files linked to this case and their review status.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setApplicationOpen(true)}
            >
              <Download size={15} />
              Dossier index
            </Button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Requirement</th>
                  <th>Linked file</th>
                  <th>Review status</th>
                  <th>Expiry</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {documentItems
                  .filter((r) => r.documentType)
                  .map((r) => {
                    const doc = state.documents.find(
                      (d) => d.id === r.documentId,
                    );
                    return (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.name}</strong>
                        </td>
                        <td>
                          {doc?.name || "Not yet provided"}
                          {doc && (
                            <small className="muted">
                              {doc.versions.find((v) => v.id === r.versionId)
                                ?.name || "Current version"}
                            </small>
                          )}
                        </td>
                        <td>
                          <Status status={r.status} />
                        </td>
                        <td>
                          {doc?.expiry
                            ? formatDate(doc.expiry)
                            : "Not recorded"}
                        </td>
                        <td>{requirementAction(r)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <details className="source-details">
            <summary>Document versions and case use</summary>
            {documentItems
              .filter((r) => r.documentId)
              .map((r) => (
                <div key={r.id}>
                  <h3>{r.name}</h3>
                  <DocumentVersionInfo
                    document={state.documents.find(
                      (d) => d.id === r.documentId,
                    )}
                    versionId={r.versionId}
                  />
                </div>
              ))}
            <p>
              Only metadata and non-sensitive sample previews are available in
              this prototype. No secure file-access role enforcement is claimed.
            </p>
          </details>
        </Card>
      )}
      {tab === "messages" && (
        <Card>
          <div className="section-heading">
            <div>
              <h2>Case messages</h2>
              <p className="muted">
                Messages are recorded locally. No email is sent.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setNewThread(true)}>
              <Plus size={15} />
              {audience === "employee"
                ? "New employee message"
                : "Add internal note"}
            </Button>
          </div>
          <div className="segmented">
            <button
              className={audience === "employee" ? "active" : ""}
              onClick={() => setAudience("employee")}
            >
              Employees
            </button>
            <button
              className={audience === "internal" ? "active" : ""}
              onClick={() => setAudience("internal")}
            >
              Internal
            </button>
          </div>
          {audience === "internal" && (
            <div className="callout">
              Internal notes are visible in the team view only.
            </div>
          )}
          {allThreads.length === 0 ? (
            <Empty
              title={
                audience === "employee"
                  ? "No employee messages yet"
                  : "No internal notes yet"
              }
            >
              Document requests and conversations will appear here.
            </Empty>
          ) : (
            allThreads.map((thread) => (
              <div className="case-message-thread" key={thread.id}>
                <div className="row">
                  <h3>
                    <Link
                      to={`/inbox?thread=${thread.id}&audience=${audience}`}
                    >
                      {thread.title}
                    </Link>
                  </h3>
                  <Status status={thread.status} />
                </div>
                <small className="muted">
                  Assigned to {thread.assignee || "Unassigned"}
                </small>
                {thread.messages
                  .filter((message) => message.audience === audience)
                  .map((message) => (
                    <div className="message-bubble" key={message.id}>
                      <div>
                        <strong>{message.author}</strong>
                        <small>{formatDate(message.at)}</small>
                      </div>
                      <p style={{ whiteSpace: "pre-wrap" }}>{message.body}</p>
                    </div>
                  ))}
                <Link
                  className="text-link"
                  to={`/inbox?thread=${thread.id}&audience=${audience}`}
                >
                  Open conversation
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))
          )}
        </Card>
      )}
      {tab === "history" && (
        <Card>
          <div className="section-heading">
            <div>
              <h2>Case history</h2>
              <p className="muted">
                Recorded actions and changes for {c.caseNumber}.
              </p>
            </div>
          </div>
          <ol className="history-list">
            {state.history
              .filter((event) => event.caseId === c.id)
              .map((event) => (
                <li key={event.id}>
                  <span className="history-dot" />
                  <div>
                    <p>{event.message}</p>
                    <small className="muted">
                      {event.actor} · {formatDate(event.at)}
                    </small>
                  </div>
                </li>
              ))}
          </ol>
          <details className="source-details">
            <summary>Sources & requirements</summary>
            <p>
              Template version {c.templateVersion}. Source checked{" "}
              {guide.sourceChecked}.
            </p>
            {guide.sources.map((source) => (
              <p key={source.url}>
                <ExternalLink href={source.url}>{source.label}</ExternalLink>
              </p>
            ))}
            <p>
              Older internal preparation tasks remain preserved as internal
              tasks and history.
            </p>
          </details>
        </Card>
      )}
      {guideOpen && (
        <CaseRouteDrawer
          c={c}
          onClose={() => setGuideOpen(false)}
          onNext={() => {
            setGuideOpen(false);
            nextAction();
          }}
        />
      )}
      {applicationOpen && (
        <CaseApplication
          c={c}
          employee={employee}
          onClose={() => setApplicationOpen(false)}
        />
      )}
      {submissionOpen && (
        <SubmissionModal c={c} onClose={() => setSubmissionOpen(false)} />
      )}
      {decisionOpen && (
        <DecisionModal c={c} onClose={() => setDecisionOpen(false)} />
      )}
      {routeOpen && (
        <RouteModal
          c={c}
          onClose={() => setRouteOpen(false)}
          onRequestReview={requestReview}
        />
      )}
      {uploadReq && (
        <UploadModal
          c={c}
          requirement={uploadReq}
          onClose={() => setUploadReq(null)}
        />
      )}
      {reviewReq && (
        <ReviewModal
          c={c}
          requirement={reviewReq}
          onClose={() => setReviewReq(null)}
        />
      )}
      {checkReq && (
        <CheckRequirementModal
          c={c}
          requirement={checkReq}
          onClose={() => setCheckReq(null)}
        />
      )}
      {newThread && (
        <Modal
          title={audience === "employee" ? "Message employee" : "Internal note"}
          onClose={() => setNewThread(false)}
        >
          <div className="callout">
            {audience === "employee"
              ? `This message will appear in ${employee.name}'s case conversation.`
              : "This note stays in the internal team view."}
          </div>
          <Field label="Message">
            <textarea
              rows={6}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write your message…"
            />
          </Field>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setNewThread(false)}>
              Cancel
            </Button>
            <Button disabled={!reply.trim()} onClick={sendMessage}>
              Save {audience === "employee" ? "message" : "note"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function DocumentVersionInfo({
  document: doc,
  versionId,
}: {
  document?: EmployeeDocument;
  versionId?: string;
}) {
  return doc ? (
    <div className="document-version-info">
      <p>
        Linked version:{" "}
        {doc.versions.find((v) => v.id === versionId)?.name || "Not linked"} ·
        Current version:{" "}
        {doc.versions.find((v) => v.id === doc.currentVersionId)?.name ||
          doc.name}
      </p>
      <p>
        Last checked:{" "}
        {doc.checkedAt ? formatDate(doc.checkedAt) : "Not recorded"}. Expiry:{" "}
        {doc.expiry ? formatDate(doc.expiry) : "Not recorded"}.
      </p>
      <ul>
        {doc.versions.map((version) => (
          <li key={version.id}>
            {version.name} · {formatDate(version.createdAt)} · {version.status}
            {version.id === doc.currentVersionId ? " · Current" : ""}
          </li>
        ))}
      </ul>
    </div>
  ) : (
    <p>No document linked.</p>
  );
}
function CaseRouteDrawer({
  c,
  onClose,
  onNext,
}: {
  c: Case;
  onClose: () => void;
  onNext: () => void;
}) {
  const guide = getGuide(c.route);
  return (
    <Drawer title={guide.title} onClose={onClose}>
      <div className="stack">
        <Badge tone="purple">{guide.country}</Badge>
        <p className="lead">{guide.short}</p>
        <h3>What this route is for</h3>
        <p>{guide.scope}</p>
        <div className="callout callout-amber">{guide.excludes}</div>
        <div className="grid-2">
          <div>
            <h3>Employee supplies</h3>
            <ul>
              {guide.employeeItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>HR / host supplies</h3>
            <ul>
              {guide.hostItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <h3>Step by step</h3>
        <ol className="guide-numbered">
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <h3>Field checks</h3>
        <p>
          Use the passport name exactly as printed. Check passport number and
          expiry, intended entry and exit dates, the host's legal identity and
          contact, and the actual activities. Resolve conflicting facts before
          submitting.
        </p>
        <h3>Fees</h3>
        <strong>{guide.fee}</strong>
        <p>{guide.feeScope}</p>
        <div className="callout">
          Total payable: Confirm with issuing office. Courier, service and
          payment costs are separate unless the issuing office confirms
          otherwise.
        </div>
        <h3>Timing</h3>
        <p>{guide.timing}</p>
        <p>
          Internal preparation targets appear beside each checklist item. They
          are company targets. Permission validity comes from the recorded
          authority decision.
        </p>
        {guide.officialUrl ? (
          <ExternalLink href={guide.officialUrl}>
            Open current official application / source
          </ExternalLink>
        ) : (
          <p>Official channel: confirm with the reviewing authority.</p>
        )}
        <details>
          <summary>Sources & requirements</summary>
          <p>
            Source checked {guide.sourceChecked}. Template version{" "}
            {c.templateVersion}.
          </p>
          {guide.sources.map((source) => (
            <p key={source.url}>
              <ExternalLink href={source.url}>{source.label}</ExternalLink>
            </p>
          ))}
          <p>
            Confirm the latest official form with the issuing office. TripWire
            exports a preparation worksheet; current form-field mapping is
            unavailable.
          </p>
        </details>
        <Button onClick={onNext}>
          Continue next step
          <ArrowRight size={16} />
        </Button>
      </div>
    </Drawer>
  );
}

const fieldLabels: Record<string, string> = {
  passportName: "Full name as shown on passport",
  nationality: "Passport nationality",
  passportNumber: "Passport number",
  passportExpiry: "Passport expiry",
  applicantEmail: "Applicant email",
  destination: "Destination",
  purpose: "Purpose and planned activities",
  host: "Host legal name / contact",
  start: "Intended entry",
  end: "Intended exit",
};
const applicationLabels = (c: Case): Record<string, string> => ({
  ...fieldLabels,
  currentPermission: "Current permission or exemption",
  ...(c.route === "vn-evisa"
    ? {
        entryPoint: "Intended entry / exit point",
        accommodation: "Accommodation address",
      }
    : c.route === "vn-dn1" || c.route === "vn-dn2"
      ? { issuingOffice: "Visa collection / issuing office" }
      : {}),
});
const htmlEscape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] || char,
  );
function CaseApplication({
  c,
  employee,
  onClose,
}: {
  c: Case;
  employee: Employee;
  onClose: () => void;
}) {
  const { state, update, notify } = useApp();
  const passport =
    state.documents.find(
      (d) =>
        d.id ===
        c.requirements.find((r) => r.documentType === "passport")?.documentId,
    ) ||
    state.documents.find(
      (d) => d.employeeId === c.employeeId && d.type === "passport",
    );
  const [fields, setFields] = useState<Record<string, string>>({
    ...{
      passportName: employee.name,
      nationality:
        c.intake?.passportNationality ||
        c.intake?.nationality ||
        employee.nationality,
      passportNumber: "",
      passportExpiry: passport?.expiry || "",
      applicantEmail: employee.email,
      destination: c.country,
      purpose: c.intake?.activityDetail
        ? `${c.purpose}. ${c.intake.activityDetail}`
        : c.purpose,
      host: c.host,
      start: c.start,
      end: c.end,
      currentPermission:
        c.intake?.currentPermission === "none"
          ? "Confirmed no existing permission or exemption"
          : c.intake?.currentPermission === "yes"
            ? "Existing permission / exemption — review recorded basis"
            : "Not recorded — confirm with traveler",
      entryPoint: "",
      accommodation: "",
      issuingOffice: "",
    },
    ...c.draft?.fields,
  });
  const labels = applicationLabels(c);
  const [preview, setPreview] = useState(false);
  const [reviewedCurrent, setReviewedCurrent] = useState(!c.draft?.needsReview);
  const guide = getGuide(c.route);
  const missing = Object.keys(labels).filter((key) => !fields[key]?.trim());
  const fieldErrors: string[] = [];
  if (fields.destination && fields.destination !== c.country)
    fieldErrors.push(
      "The worksheet destination differs from this case. Keep the draft within the recorded destination or create a separate case.",
    );
  if (
    (fields.start && fields.start !== c.start) ||
    (fields.end && fields.end !== c.end)
  )
    fieldErrors.push(
      "Worksheet dates differ from the case. Reconfirm trip dates and document validity before treating this draft as complete.",
    );
  if (
    passport?.expiry &&
    fields.passportExpiry &&
    fields.passportExpiry !== passport.expiry
  )
    fieldErrors.push(
      "Worksheet passport expiry differs from the document record. Review the current passport metadata before completing preparation.",
    );
  if (fields.start && fields.end && fields.end < fields.start)
    fieldErrors.push("Intended exit must be on or after intended entry.");
  if (
    fields.passportExpiry &&
    fields.start &&
    fields.passportExpiry < fields.start
  )
    fieldErrors.push("The passport expires before intended entry.");
  if (
    fields.applicantEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.applicantEmail)
  )
    fieldErrors.push("Enter a complete applicant email address.");
  const canComplete =
    missing.length === 0 &&
    fieldErrors.length === 0 &&
    c.routeConfirmed &&
    docReady(c) &&
    reviewedCurrent;
  const save = () => {
    update(
      (draft) => {
        const target = draft.cases.find((item) => item.id === c.id);
        if (!target) return;
        target.draft = {
          fields: { ...fields },
          preparedAt: draft.clock,
          needsReview: Boolean(c.draft?.needsReview) && !canComplete,
        };
        target.requirements
          .filter((r) => r.name.includes("TripWire application"))
          .forEach((r) => {
            r.status = canComplete ? "completed" : "todo";
          });
        addHistory(
          draft,
          `Saved ${canComplete ? "a complete" : "an incomplete"} TripWire preparation draft. It is not an official filing.`,
          target.id,
        );
      },
      canComplete
        ? "Preparation draft saved; dossier ready for handoff"
        : "Draft saved; required inputs or checks remain",
    );
  };
  const dossier = c.requirements
    .filter((r) => r.documentType)
    .map((r) => {
      const doc = state.documents.find((d) => d.id === r.documentId);
      const version = doc?.versions.find((v) => v.id === r.versionId);
      return {
        name: r.name,
        status: r.status,
        file: doc?.name || "Not provided",
        version: version?.name || "Not linked",
        expiry: doc?.expiry || "Not recorded",
      };
    });
  const sheet = () =>
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${htmlEscape(c.caseNumber)} · TripWire preparation draft</title><style>body{font:14px Arial,sans-serif;line-height:1.6;margin:42px;color:#192236}h1{color:#080679}h2{margin-top:30px}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #d5d9e4;padding:9px;text-align:left;vertical-align:top}th{background:#f4f5fa}.notice{padding:16px;background:#fff7df;border:1px solid #e8d390}.meta{color:#596176}a{color:#080679}@media print{button{display:none}body{margin:16mm}h2{break-after:avoid}tr{break-inside:avoid}}</style></head><body><button onclick="window.print()">Print / save as PDF</button><h1>TripWire preparation draft</h1><p class="meta">${htmlEscape(c.caseNumber)} · ${htmlEscape(employee.name)} · Prepared ${htmlEscape(formatDate(state.clock))}</p><div class="notice">Administrative preparation worksheet. This is not an official application, receipt, permission or filing-ready form. Current official form-field mapping is unavailable. Confirm the latest form and requirements with the issuing office.</div><h2>Application field summary</h2><table><tbody>${Object.entries(
      labels,
    )
      .map(
        ([key, label]) =>
          `<tr><th>${htmlEscape(label)}</th><td>${htmlEscape(fields[key] || "MISSING")}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table><p><strong>Missing inputs:</strong> ${htmlEscape(missing.map((key) => labels[key]).join(", ") || "No empty fields")}. ${htmlEscape(fieldErrors.join(" "))}</p><h2>Dossier checklist / index</h2><table><thead><tr><th>Requirement</th><th>File / version</th><th>Workflow status</th><th>Expiry</th></tr></thead><tbody>${dossier.map((row) => `<tr><td>${htmlEscape(row.name)}</td><td>${htmlEscape(row.file)}<br>${htmlEscape(row.version)}</td><td>${htmlEscape(row.status)}</td><td>${htmlEscape(row.expiry)}</td></tr>`).join("")}</tbody></table><h2>Handoff checks</h2><p>Route: ${htmlEscape(guide.title)} (${c.routeConfirmed ? "recorded locally" : "needs confirmation"}). Required documents: ${docReady(c) ? "reviewed checklist complete" : "incomplete"}. Fees: ${htmlEscape(guide.fee)}. ${htmlEscape(guide.feeScope)}</p><p>Official source: ${guide.officialUrl ? `<a href="${htmlEscape(guide.officialUrl)}">${htmlEscape(guide.officialUrl)}</a>` : "Not yet established; request a route review"}. Source checked ${htmlEscape(guide.sourceChecked)}.</p><p>The applicant or authorized sponsor submits through the official channel. Submission, payment and authority decisions are external actions. Retain the actual reference and receipt.</p></body></html>`;
  const download = () => {
    const blob = new Blob([sheet()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${c.caseNumber}-preparation-draft-and-dossier.html`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Printable preparation sheet and dossier index downloaded.");
  };
  const print = () => {
    const popup = window.open("", "_blank");
    if (!popup) {
      notify("Allow the print window, or download the printable sheet.");
      return;
    }
    popup.document.write(sheet());
    popup.document.close();
    popup.focus();
    popup.print();
  };
  return (
    <Modal title="Prepare application" onClose={onClose} wide>
      <div className="callout callout-blue">
        <FileText size={19} />
        <div>
          <strong>TripWire preparation draft</strong>
          <p>
            An editable worksheet and dossier index. Confirm and complete the
            latest official form separately.
          </p>
        </div>
      </div>
      <div className="draft-toolbar">
        <div className="segmented">
          <button
            className={!preview ? "active" : ""}
            onClick={() => setPreview(false)}
          >
            Edit fields
          </button>
          <button
            className={preview ? "active" : ""}
            onClick={() => setPreview(true)}
          >
            Preview
          </button>
        </div>
        <Badge tone={missing.length || fieldErrors.length ? "amber" : "green"}>
          {missing.length} missing {missing.length === 1 ? "input" : "inputs"}
        </Badge>
      </div>
      {c.draft?.needsReview && (
        <div className="callout callout-amber">
          <strong>The passport changed after this summary was prepared.</strong>
          <p>
            Check the passport name, number, nationality and expiry against the
            current reviewed file.
          </p>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={reviewedCurrent}
              onChange={(event) => setReviewedCurrent(event.target.checked)}
            />
            <span>
              I reviewed and updated this summary against the current traveling
              passport.
            </span>
          </label>
        </div>
      )}
      {!c.routeConfirmed && (
        <p className="inline-warning">Route confirmation is still required.</p>
      )}
      {!docReady(c) && (
        <p className="inline-warning">
          Required documents still need collection or review.
        </p>
      )}
      {fieldErrors.map((error) => (
        <p className="inline-warning" key={error}>
          {error}
        </p>
      ))}
      {preview ? (
        <div className="draft-preview">
          <h2>Application field summary</h2>
          <dl className="summary-fields">
            {Object.entries(labels).map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  {fields[key] || (
                    <span className="inline-warning">Missing</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <h3>Dossier index</h3>
          {dossier.map((row) => (
            <div className="dossier-row" key={row.name}>
              <FileText size={16} />
              <div>
                <strong>{row.name}</strong>
                <small>
                  {row.file} · {row.version}
                </small>
              </div>
              <Status status={row.status} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid-2 draft-fields">
          {Object.entries(labels).map(([key, label]) => (
            <Field
              key={key}
              label={label}
              hint={
                !fields[key]?.trim()
                  ? "Required for the preparation summary"
                  : undefined
              }
            >
              <input
                type={
                  ["start", "end", "passportExpiry"].includes(key)
                    ? "date"
                    : key === "applicantEmail"
                      ? "email"
                      : "text"
                }
                value={fields[key] || ""}
                onChange={(e) =>
                  setFields({ ...fields, [key]: e.target.value })
                }
              />
            </Field>
          ))}
        </div>
      )}
      <details className="source-details">
        <summary>Official form & sources</summary>
        <p>
          Current official form-field mapping is unavailable. This preparation
          sheet does not reproduce a government form. Source checked{" "}
          {guide.sourceChecked}.
        </p>
        {guide.officialUrl ? (
          <ExternalLink href={guide.officialUrl}>
            Open current official application / form source
          </ExternalLink>
        ) : (
          <p>
            Official form/source: not yet established. Request a route review.
          </p>
        )}
      </details>
      <div className="modal-actions draft-actions">
        <Button variant="ghost" onClick={download}>
          <Download size={15} />
          Export sheet + dossier index
        </Button>
        <Button variant="secondary" onClick={print}>
          Print / save PDF
        </Button>
        <Button onClick={save}>
          Save {canComplete ? "completed preparation" : "draft"}
        </Button>
      </div>
    </Modal>
  );
}
function UploadModal({
  c,
  requirement: r,
  onClose,
}: {
  c: Case;
  requirement: Requirement;
  onClose: () => void;
}) {
  const { state, update, notify } = useApp();
  const [fileName, setFileName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [error, setError] = useState("");
  const upload = () => {
    if (!fileName.trim()) {
      setError("Choose a document file.");
      return;
    }
    update((draft) => {
      const target = draft.cases.find((item) => item.id === c.id);
      const req = target?.requirements.find((item) => item.id === r.id);
      if (!target || !req) return;
      let doc = draft.documents.find((item) => item.id === req.documentId);
      if (doc) {
        replaceDocument(draft, doc.id, fileName, expiry || undefined);
        doc = draft.documents.find((item) => item.id === doc!.id);
      } else {
        const docId = `document-${++draft.counters.document}`;
        const versionId = `${docId}-v1`;
        doc = {
          id: docId,
          employeeId: target.employeeId,
          type: r.documentType || "other",
          name: fileName,
          status: "submitted",
          expiry: expiry || undefined,
          currentVersionId: versionId,
          versions: [
            {
              id: versionId,
              name: fileName,
              createdAt: draft.clock,
              status: "submitted",
            },
          ],
        };
        draft.documents.push(doc);
      }
      if (doc) {
        req.documentId = doc.id;
        req.versionId = doc.currentVersionId;
        req.status = "submitted";
      }
      addHistory(
        draft,
        `Uploaded ${fileName} metadata for ${r.name}; review required.`,
        target.id,
      );
    }, "Document metadata uploaded; review required");
    notify(
      "File name and document metadata saved locally. File contents are not uploaded.",
    );
    onClose();
  };
  return (
    <Modal title={`Upload ${r.name.toLowerCase()}`} onClose={onClose}>
      <p>{r.instruction}</p>
      <div className="callout">
        This local prototype stores the filename and review metadata. Use
        non-sensitive sample files; file contents are not retained.
      </div>
      <Field label="Document file">
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
        />
      </Field>
      {r.documentType === "passport" && (
        <Field
          label="Passport expiry"
          hint="Expiry must be checked before this passport can be reused."
        >
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </Field>
      )}
      {fileName && (
        <p>
          <FileText size={15} /> {fileName}
        </p>
      )}
      {error && (
        <p className="inline-warning" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={upload}>
          <Upload size={15} />
          Save for review
        </Button>
      </div>
    </Modal>
  );
}
function ReviewModal({
  c,
  requirement: r,
  onClose,
}: {
  c: Case;
  requirement: Requirement;
  onClose: () => void;
}) {
  const { state, update } = useApp();
  const doc = state.documents.find((item) => item.id === r.documentId);
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const review = (accepted: boolean) => {
    if (!doc) return;
    if (accepted && !checked) {
      setError("Confirm the document checks before accepting.");
      return;
    }
    if (!accepted && !note.trim()) {
      setError("Describe the correction required.");
      return;
    }
    const reviewed: EmployeeDocument = {
      ...doc,
      status: "reviewed",
      checkedAt: state.clock,
      versions: doc.versions.map((v) =>
        v.id === doc.currentVersionId ? { ...v, status: "reviewed" } : v,
      ),
    };
    if (
      accepted &&
      doc.type === "passport" &&
      !compatibleDocument(reviewed, c)
    ) {
      setError(
        "The current passport is not compatible with these trip dates. Check its expiry and the route-specific validity requirement.",
      );
      return;
    }
    update(
      (draft) => {
        const file = draft.documents.find((item) => item.id === doc.id);
        const target = draft.cases.find((item) => item.id === c.id);
        if (!file || !target) return;
        file.status = accepted ? "reviewed" : "correction";
        file.checkedAt = draft.clock;
        const version = file.versions.find(
          (item) => item.id === file.currentVersionId,
        );
        if (version) version.status = file.status;
        if (accepted) {
          const req = target.requirements.find((item) => item.id === r.id);
          if (req) {
            req.documentId = file.id;
            req.versionId = file.currentVersionId;
            req.status = "completed";
          }
        } else {
          draft.cases.forEach((item) =>
            item.requirements
              .filter(
                (req) =>
                  req.documentId === file.id &&
                  req.versionId === file.currentVersionId,
              )
              .forEach((req) => {
                req.status = "correction";
              }),
          );
        }
        if (!accepted) {
          draft.threads.unshift({
            id: uid("thread"),
            title: `Correction needed: ${r.name}`,
            employeeId: target.employeeId,
            caseId: target.id,
            audience: r.party === "employee" ? "employee" : "internal",
            assignee: target.coordinator || "Unassigned",
            unread: false,
            status: "awaiting",
            requirementIds: [r.id],
            messages: [
              {
                id: uid("message"),
                author: draft.profile.name,
                body: `Please update ${r.name}. ${note.trim()}`,
                at: draft.clock,
                audience: r.party === "employee" ? "employee" : "internal",
              },
            ],
          });
        }
        addHistory(
          draft,
          accepted
            ? `Reviewed current version of ${r.name} against this case's requirements.`
            : `Requested correction for ${r.name}: ${note.trim()}`,
          target.id,
        );
      },
      accepted ? "Document review recorded" : "Correction request created",
    );
    onClose();
  };
  return (
    <Modal title={`Review ${r.name.toLowerCase()}`} onClose={onClose}>
      {doc ? (
        <>
          <div className="document-review-header">
            <FileText size={28} />
            <div>
              <h3>{doc.name}</h3>
              <Status status={doc.status} />
            </div>
          </div>
          <p>{r.instruction}</p>
          <div className="callout">
            Metadata review only. Inspect the source document through your
            authorized process before recording a check here.
          </div>
          <DocumentVersionInfo document={doc} versionId={r.versionId} />
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span>
              I checked the current version, legibility, identity, expiry and
              this case's requirements.
            </span>
          </label>
          <Field
            label="Correction note"
            hint="Required when requesting a correction."
          >
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain exactly what needs to change…"
            />
          </Field>
          {error && (
            <p className="inline-warning" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="danger" onClick={() => review(false)}>
              Request correction
            </Button>
            <Button onClick={() => review(true)}>
              <Check size={15} />
              Accept document check
            </Button>
          </div>
        </>
      ) : (
        <Empty title="No document linked">
          Upload or reuse a current document before reviewing.
        </Empty>
      )}
    </Modal>
  );
}
function RouteModal({
  c,
  onClose,
  onRequestReview,
}: {
  c: Case;
  onClose: () => void;
  onRequestReview: () => void;
}) {
  const { state, update } = useApp();
  const guide = getGuide(c.route);
  const [actor, setActor] = useState(state.profile.name);
  const [basis, setBasis] = useState("");
  const [checked, setChecked] = useState(false);
  const supported = c.route !== "work-review" && c.route !== "review";
  const confirm = () => {
    if (!checked || !basis.trim() || !actor.trim() || !supported) return;
    update((draft) => {
      const target = draft.cases.find((item) => item.id === c.id);
      if (!target) return;
      target.routeConfirmed = true;
      target.requirements
        .filter((r) => r.name === "Route and activity confirmation")
        .forEach((r) => {
          r.status = "completed";
        });
      addHistory(
        draft,
        `Route assessment recorded by ${actor.trim()}: ${guide.title}. Basis: ${basis.trim()}. This is a local assessment, not authority permission.`,
        target.id,
      );
    }, "Route assessment recorded");
    onClose();
  };
  return (
    <Modal title="Review proposed route" onClose={onClose}>
      <Badge tone="purple">{guide.title}</Badge>
      <p>{guide.scope}</p>
      <div className="callout callout-amber">{guide.excludes}</div>
      {c.reviewQuestion && (
        <p>
          <strong>Advice needed:</strong> {c.reviewQuestion}
        </p>
      )}
      <dl className="summary-fields">
        <div>
          <dt>Actual activities</dt>
          <dd>{c.purpose}</dd>
        </div>
        <div>
          <dt>Host</dt>
          <dd>{c.host || "Not recorded"}</dd>
        </div>
        <div>
          <dt>Intended dates</dt>
          <dd>
            {formatDate(c.start)}–{formatDate(c.end)}
          </dd>
        </div>
      </dl>
      {supported ? (
        <>
          <Field label="Assessment recorded by">
            <input value={actor} onChange={(e) => setActor(e.target.value)} />
          </Field>
          <Field
            label="Basis for route assessment"
            hint="Record nationality/current permission, actual activities, host and current official eligibility checks."
          >
            <textarea
              rows={4}
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
              placeholder="Record the facts checked and any limitations…"
            />
          </Field>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span>
              I have checked this proposed route against the actual trip facts
              and recorded its basis.
            </span>
          </label>
          {guide.officialUrl && (
            <ExternalLink href={guide.officialUrl}>
              Check official route source
            </ExternalLink>
          )}
        </>
      ) : (
        <p>
          The route remains unconfirmed until an assigned reviewer identifies
          the appropriate current process. This action creates an Unassigned
          internal request for that specific question.
        </p>
      )}
      <div className="modal-actions">
        <Button
          variant="secondary"
          onClick={() => {
            onRequestReview();
            onClose();
          }}
        >
          Request review
        </Button>
        {supported && (
          <Button
            disabled={!checked || !basis.trim() || !actor.trim()}
            onClick={confirm}
          >
            Record route assessment
          </Button>
        )}
      </div>
    </Modal>
  );
}
const handoffBlockers = (c: Case) => [
  ...(!c.routeConfirmed ? ["Route assessment not recorded"] : []),
  ...(!docReady(c)
    ? ["Required identity / supporting documents incomplete"]
    : []),
  ...(!prepReady(c) ? ["Preparation checks or draft incomplete"] : []),
  ...c.requirements
    .filter(
      (r) =>
        r.documentType &&
        required(r) &&
        r.stage !== "documents" &&
        !complete(r),
    )
    .map((r) => r.name),
];
function SubmissionModal({ c, onClose }: { c: Case; onClose: () => void }) {
  const { state, update } = useApp();
  const guide = getGuide(c.route);
  const [simulated, setSimulated] = useState(c.submission?.simulated || false);
  const [reference, setReference] = useState(c.submission?.reference || "");
  const [date, setDate] = useState(
    c.submission?.date || state.clock.slice(0, 10),
  );
  const [actor, setActor] = useState(c.submission?.actor || state.profile.name);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState("");
  const blockers = handoffBlockers(c);
  const record = () => {
    if (blockers.length) {
      setError(
        "Complete the required preparation checks before recording final handoff.",
      );
      return;
    }
    if (!reference.trim() || !date || !actor.trim() || !ack) {
      setError(
        "Reference, submission date, submitting actor and confirmation are required.",
      );
      return;
    }
    if (date > state.clock.slice(0, 10)) {
      setError(
        "A submission record cannot be dated in the future relative to the configured clock.",
      );
      return;
    }
    if (c.decision && date > c.decision.date) {
      setError(
        "The submission date cannot be later than the recorded authority decision.",
      );
      return;
    }
    update(
      (draft) => {
        const target = draft.cases.find((item) => item.id === c.id);
        if (!target) return;
        target.submission = {
          reference: reference.trim(),
          date,
          actor: actor.trim(),
          simulated,
        };
        target.requirements
          .filter(
            (r) =>
              r.stage === "submission" &&
              !r.documentType &&
              r.name === "Official submission reference",
          )
          .forEach((r) => {
            r.status = "completed";
          });
        addHistory(
          draft,
          `${simulated ? "Recorded a demo simulated submission" : "Manually recorded an externally completed submission"}: ${reference.trim()}, ${date}, submitted by ${actor.trim()}. TripWire did not file or pay.`,
          target.id,
        );
      },
      simulated
        ? "Demo submission record saved; no filing or payment occurred"
        : "External submission record saved locally",
    );
    onClose();
  };
  return (
    <Modal
      title={c.submission ? "Submission record" : "Official submission handoff"}
      onClose={onClose}
      wide
    >
      <div className="callout callout-blue">
        <Globe2 size={20} />
        <div>
          <strong>
            Submission and payment happen through the official channel
          </strong>
          <p>
            TripWire prepares your dossier and records the reference. No
            application, fee or email is sent by this action.
          </p>
        </div>
      </div>
      {c.submission && (
        <div className="callout">
          <strong>
            {c.submission.simulated
              ? "Demo simulated record"
              : "Manually recorded external submission"}
          </strong>
          <p>
            {c.submission.reference} · {formatDate(c.submission.date)} ·{" "}
            {c.submission.actor}
          </p>
        </div>
      )}
      <h3>Handoff preview</h3>
      <dl className="summary-fields">
        <div>
          <dt>Case</dt>
          <dd>{c.caseNumber}</dd>
        </div>
        <div>
          <dt>Route</dt>
          <dd>{guide.title}</dd>
        </div>
        <div>
          <dt>Applicant / sponsor</dt>
          <dd>
            {state.employees.find((e) => e.id === c.employeeId)?.name} /{" "}
            {c.host}
          </dd>
        </div>
        <div>
          <dt>Trip</dt>
          <dd>
            {formatDate(c.start)}–{formatDate(c.end)}
          </dd>
        </div>
      </dl>
      <details className="source-details">
        <summary>Prepared application fields</summary>
        <dl className="summary-fields">
          {Object.entries(applicationLabels(c)).map(([key, label]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{c.draft?.fields[key] || "Missing"}</dd>
            </div>
          ))}
        </dl>
      </details>
      <h3>Dossier</h3>
      <ul className="handoff-list">
        {c.requirements
          .filter((r) => r.documentType)
          .map((r) => (
            <li key={r.id}>
              {complete(r) ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              <span>{r.name}</span>
              <Status status={r.status} />
            </li>
          ))}
      </ul>
      <h3>Fee assumptions</h3>
      <p>
        <strong>{guide.fee}</strong>
      </p>
      <p className="muted">
        {guide.feeScope} Total payable: Confirm with issuing office.
      </p>
      {blockers.length > 0 && (
        <div className="callout callout-amber">
          <div>
            <strong>Unresolved required steps</strong>
            <ul>
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {guide.officialUrl && (
        <ExternalLink href={guide.officialUrl}>
          Open official application
        </ExternalLink>
      )}
      <details className="demo-controls">
        <summary>Demo controls</summary>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={simulated}
            onChange={(e) => {
              setSimulated(e.target.checked);
              setReference(e.target.checked ? `DEMO-${c.caseNumber}` : "");
              setAck(false);
            }}
          />
          <span>Record a simulated submission for the demonstration</span>
        </label>
      </details>
      {simulated && (
        <div className="callout callout-amber">
          Demo simulation: this reference does not correspond to an authority
          filing. No government application or payment will occur.
        </div>
      )}
      <div className="grid-2">
        <Field
          label={simulated ? "Demo reference" : "Actual submission reference"}
        >
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={
              simulated
                ? "DEMO reference"
                : "Enter the authority receipt / reference"
            }
          />
        </Field>
        <Field label="Submission date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={state.clock.slice(0, 10)}
          />
        </Field>
        <Field label="Submitted by">
          <input value={actor} onChange={(e) => setActor(e.target.value)} />
        </Field>
      </div>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
        />
        <span>
          {simulated
            ? "I understand this creates only a simulated local record."
            : "I confirm this submission already occurred outside TripWire and these are its actual recorded details."}
        </span>
      </label>
      {error && (
        <p className="inline-warning" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button
          disabled={
            blockers.length > 0 ||
            !ack ||
            !reference.trim() ||
            !date ||
            !actor.trim()
          }
          onClick={record}
        >
          Record {simulated ? "demo reference" : "submission"}
        </Button>
      </div>
    </Modal>
  );
}
function DecisionModal({ c, onClose }: { c: Case; onClose: () => void }) {
  const { state, update } = useApp();
  const passportRequirement = c.requirements.find(
    (r) => r.documentType === "passport",
  );
  const currentPassport = state.documents.find(
    (d) => d.id === passportRequirement?.documentId,
  );
  const passportReady = Boolean(
    passportRequirement &&
      complete(passportRequirement) &&
      currentPassport &&
      currentPassport.status === "reviewed" &&
      passportRequirement.versionId === currentPassport.currentVersionId &&
      currentPassport.versions.find(
        (v) => v.id === currentPassport.currentVersionId,
      )?.status === "reviewed",
  );
  const needsNewReference = Boolean(
    c.decision?.needsRevalidation &&
      (c.route === "uk-eta" || c.route === "vn-evisa"),
  );
  const [passportLinked, setPassportLinked] = useState(
    !c.decision?.needsRevalidation,
  );
  const [linkageNote, setLinkageNote] = useState("");
  const [outcome, setOutcome] = useState(
    c.decision?.outcome === "Granted"
      ? "Approved"
      : c.decision?.outcome || "Approved",
  );
  const [reference, setReference] = useState(
    needsNewReference ? "" : c.decision?.reference || "",
  );
  const [date, setDate] = useState(
    c.decision?.date || state.clock.slice(0, 10),
  );
  const [actor, setActor] = useState(c.decision?.actor || state.profile.name);
  const [validFrom, setValidFrom] = useState(c.decision?.validFrom || "");
  const [validUntil, setValidUntil] = useState(c.decision?.validUntil || "");
  const [simulated, setSimulated] = useState(c.decision?.simulated || false);
  const [ack, setAck] = useState(false);
  const [error, setError] = useState("");
  const save = () => {
    if (!passportReady) {
      setError(
        "Review and link the current traveling passport version to this case first.",
      );
      return;
    }
    if (
      c.decision?.needsRevalidation &&
      (!passportLinked || !linkageNote.trim())
    ) {
      setError(
        "Record the authority-result linkage to the current passport and confirm the identity check.",
      );
      return;
    }
    if (
      needsNewReference &&
      (!reference.trim() || reference.trim() === c.decision?.reference)
    ) {
      setError(
        "A replacement passport requires a new authority reference for this ETA / e-visa route. The earlier reference remains historical.",
      );
      return;
    }
    if (!c.submission) {
      setError("Record the external submission reference first.");
      return;
    }
    if (!reference.trim() || !date || !actor.trim() || !ack) {
      setError(
        "Reference, decision date, recorder and confirmation are required.",
      );
      return;
    }
    if (date < c.submission.date || date > state.clock.slice(0, 10)) {
      setError(
        "Decision date must be after submission and no later than the configured date.",
      );
      return;
    }
    if (
      outcome === "Approved" &&
      (!validFrom || !validUntil || validUntil < validFrom)
    ) {
      setError(
        "Record the approved permission validity dates in the correct order.",
      );
      return;
    }
    if (c.submission.simulated && !simulated) {
      setError(
        "A simulated submission can only have a simulated decision in this demonstration.",
      );
      return;
    }
    update((draft) => {
      const target = draft.cases.find((item) => item.id === c.id);
      if (!target) return;
      if (target.decision)
        addHistory(
          draft,
          `Previous authority result retained: ${target.decision.outcome}; reference ${target.decision.reference}; ${target.decision.date}; recorder ${target.decision.actor}; passport version ${target.decision.passportVersionId || "not recorded"}.`,
          target.id,
        );
      target.decision = {
        outcome,
        reference: reference.trim(),
        date,
        actor: actor.trim(),
        simulated,
        needsRevalidation: false,
        passportVersionId: currentPassport?.currentVersionId,
        validFrom: outcome === "Approved" ? validFrom : undefined,
        validUntil: outcome === "Approved" ? validUntil : undefined,
      };
      target.requirements
        .filter((r) => r.stage === "decision" && !r.documentType)
        .forEach((r) => {
          r.status = "completed";
        });
      target.requirements
        .filter((r) => r.stage === "departure")
        .forEach((r) => {
          r.status = "todo";
        });
      addHistory(
        draft,
        `Recorded ${simulated ? "a demo simulated" : "an externally received"} authority result: ${outcome}; ${reference.trim()}; ${date}; recorder ${actor.trim()}.${linkageNote.trim() ? ` Current passport linkage check: ${linkageNote.trim()}` : ""}`,
        target.id,
      );
    }, "Decision record saved separately from document review");
    onClose();
  };
  return (
    <Modal title="Authority decision record" onClose={onClose}>
      {!c.submission && (
        <div className="callout callout-amber">
          Record a submission reference first. Accepting a document does not
          create an authority decision.
        </div>
      )}
      {c.decision?.needsRevalidation && (
        <div className="callout callout-amber">
          <strong>The previous authority result needs revalidation.</strong>
          <p>
            Historical reference: {c.decision.reference}. The traveling passport
            changed.{" "}
            {needsNewReference
              ? "Record a new authority reference for the replacement passport."
              : "Confirm whether the authority must correct or reissue its document."}
          </p>
        </div>
      )}
      {!passportReady && (
        <div className="callout callout-amber">
          Review and link the current traveling passport version before
          recording the result.
        </div>
      )}
      <p>
        Record an externally received result and its identity / validity checks.
        This action does not grant permission or guarantee entry.
      </p>
      <div className="grid-2">
        <Field label="Outcome">
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option>Approved</option>
            <option>Refused</option>
            <option>More information requested</option>
            <option>Withdrawn</option>
          </select>
        </Field>
        <Field label="Authority result / document reference">
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </Field>
        <Field label="Decision date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={c.submission?.date}
            max={state.clock.slice(0, 10)}
          />
        </Field>
        <Field label="Recorded by">
          <input value={actor} onChange={(e) => setActor(e.target.value)} />
        </Field>
        {outcome === "Approved" && (
          <>
            <Field label="Permission valid from">
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </Field>
            <Field label="Permission valid until">
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </Field>
          </>
        )}
      </div>
      {c.decision?.needsRevalidation && (
        <>
          <Field label="Current passport / authority linkage check">
            <textarea
              rows={3}
              value={linkageNote}
              onChange={(event) => setLinkageNote(event.target.value)}
              placeholder="Record the authority result for the current passport and the source checked…"
            />
          </Field>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={passportLinked}
              onChange={(event) => setPassportLinked(event.target.checked)}
            />
            <span>
              I verified the authority result against the current reviewed
              traveling passport version.
            </span>
          </label>
        </>
      )}
      <details className="demo-controls">
        <summary>Demo controls</summary>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={simulated}
            onChange={(e) => {
              setSimulated(e.target.checked);
              if (e.target.checked && !reference)
                setReference(
                  `DEMO-RESULT-${c.caseNumber}${needsNewReference ? `-${currentPassport?.currentVersionId || "new-passport"}` : ""}`,
                );
              setAck(false);
            }}
          />
          <span>Record a simulated decision</span>
        </label>
      </details>
      {simulated && (
        <div className="callout callout-amber">
          Demo simulation: no authority decision has occurred.
        </div>
      )}
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
        />
        <span>
          {simulated
            ? "I understand this records only a simulated result."
            : "I checked the externally received result, traveler identity, passport linkage, conditions and validity."}
        </span>
      </label>
      {error && (
        <p className="inline-warning" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={save}
          disabled={!c.submission || !ack || !passportReady}
        >
          Save decision record
        </Button>
      </div>
    </Modal>
  );
}
function CheckRequirementModal({
  c,
  requirement: r,
  onClose,
}: {
  c: Case;
  requirement: Requirement;
  onClose: () => void;
}) {
  const { update } = useApp();
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState("");
  const guide = getGuide(c.route);
  const save = () => {
    if (!checked || !note.trim()) return;
    update((draft) => {
      const target = draft.cases.find((item) => item.id === c.id);
      const req = target?.requirements.find((item) => item.id === r.id);
      if (!target || !req) return;
      req.status = "completed";
      addHistory(draft, `Checked ${r.name}: ${note.trim()}`, target.id);
    }, `${r.name} check recorded`);
    onClose();
  };
  return (
    <Modal title={r.name} onClose={onClose}>
      <p>{r.instruction}</p>
      {r.party === "host" && (
        <div className="callout">
          Record the host's actual preparation or confirmation. TripWire does
          not supply an authorized company signature or submit a sponsor
          request.
        </div>
      )}
      <Field
        label="Check record"
        hint="Record the facts confirmed, document/source checked or responsible person's confirmation."
      >
        <textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Record what was checked…"
        />
      </Field>
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>
          I confirmed this requirement against the current case and the relevant
          official instructions.
        </span>
      </label>
      {guide.officialUrl && (
        <ExternalLink href={guide.officialUrl}>
          Open official source
        </ExternalLink>
      )}
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!checked || !note.trim()} onClick={save}>
          Record check
        </Button>
      </div>
    </Modal>
  );
}
export default CasesPage;
