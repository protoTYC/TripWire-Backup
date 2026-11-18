import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCheck,
  Clock3,
  FileText,
  Link2,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Search,
  Send,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Drawer,
  Empty,
  Field,
  Info,
  Modal,
  PageHeading,
  Status,
} from "../components/ui";
import { addHistory } from "../domain/operations";
import type { AppState, Incident, Thread } from "../domain/types";
import { useApp } from "../store";

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const dateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
const day = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
function elapsed(createdAt: string, clock: string) {
  const minutes = Math.max(
    0,
    Math.floor(
      (new Date(clock).getTime() - new Date(createdAt).getTime()) / 60000,
    ),
  );
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24
    ? `${hours}h ${minutes % 60}m`
    : `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
function threadForIncident(state: AppState, incident: Incident): Thread {
  let thread = state.threads.find(
    (item) => item.id === incident.threadId && item.audience === "employee",
  );
  if (!thread) {
    thread = state.threads.find(
      (item) =>
        item.employeeId === incident.employeeId &&
        item.caseId === incident.caseId &&
        item.audience === "employee" &&
        item.status !== "resolved",
    );
  }
  if (!thread) {
    thread = {
      id: id("thread"),
      title: incident.title,
      employeeId: incident.employeeId,
      caseId: incident.caseId,
      audience: "employee",
      assignee: incident.assignee,
      unread: false,
      status: "open",
      messages: [],
    };
    state.threads.unshift(thread);
  }
  incident.threadId = thread.id;
  return thread;
}

export function InboxPage() {
  const { state, update, notify } = useApp();
  const [params, setParams] = useSearchParams();
  const audience =
    params.get("audience") === "internal" ? "internal" : "employee";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [reply, setReply] = useState("");
  const [escalating, setEscalating] = useState<Thread | null>(null);
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [departure, setDeparture] = useState("");
  const [severity, setSeverity] = useState<Incident["severity"]>("high");
  const [formError, setFormError] = useState("");
  const threads = state.threads.filter((thread) => {
    const included =
      audience === "employee"
        ? thread.audience === "employee"
        : thread.audience === "internal" ||
          thread.messages.some((message) => message.audience === "internal");
    const employee = state.employees.find(
      (item) => item.id === thread.employeeId,
    );
    const linkedCase = state.cases.find((item) => item.id === thread.caseId);
    return (
      included &&
      (status === "all" ||
        (status === "unread" ? thread.unread : thread.status === status)) &&
      `${thread.title} ${employee?.name || ""} ${linkedCase?.caseNumber || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });
  const selected =
    state.threads.find(
      (thread) =>
        thread.id === params.get("thread") &&
        (audience === "employee"
          ? thread.audience === "employee"
          : thread.audience === "internal" ||
            thread.messages.some((message) => message.audience === "internal")),
    ) || threads[0];
  const employee = state.employees.find(
    (item) => item.id === selected?.employeeId,
  );
  const linkedCase = state.cases.find((item) => item.id === selected?.caseId);
  const unread = state.threads.filter(
    (thread) => thread.audience === "employee" && thread.unread,
  ).length;
  const unresolved = state.threads.filter(
    (thread) => thread.audience === "employee" && thread.status !== "resolved",
  ).length;
  const linkedIncident = state.incidents.find(
    (incident) =>
      incident.threadId === selected?.id && incident.status !== "resolved",
  );

  useEffect(() => {
    setReply("");
    setFormError("");
  }, [selected?.id, audience]);
  useEffect(() => {
    if (selected?.unread && audience === "employee") {
      if (!params.get("thread"))
        setParams({ thread: selected.id, audience }, { replace: true });
      update((draft) => {
        const thread = draft.threads.find((item) => item.id === selected.id);
        if (thread) thread.unread = false;
      });
    }
  }, [selected?.id, audience]);

  function selectAudience(next: "employee" | "internal") {
    if (next === audience) return;
    setReply("");
    setFormError("");
    setStatus("all");
    setParams({ audience: next });
  }
  function selectThread(thread: Thread) {
    setParams({ thread: thread.id, audience });
  }
  function sendReply() {
    if (!selected || !reply.trim()) return;
    const body = reply.trim();
    update(
      (draft) => {
        const thread = draft.threads.find((item) => item.id === selected.id);
        if (!thread) return;
        thread.messages.push({
          id: id("message"),
          author: draft.profile.name,
          body,
          at: draft.clock,
          audience,
        });
        if (audience === "employee") {
          thread.status = "awaiting";
          thread.unread = false;
        }
        addHistory(
          draft,
          audience === "employee"
            ? "Employee reply recorded in Inbox"
            : "Internal support note added",
          thread.caseId,
        );
      },
      audience === "employee"
        ? "Reply recorded in this demo"
        : "Internal note saved",
    );
    setReply("");
  }
  function escalate() {
    if (!escalating) return;
    if (!reason.trim() || !location.trim() || !timezone.trim()) {
      setFormError(
        "Add a reason, location and time zone so the responder has enough context.",
      );
      return;
    }
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone.trim() }).format();
    } catch {
      setFormError(
        "Use a valid time zone, for example Europe/London or Asia/Ho_Chi_Minh.",
      );
      return;
    }
    const incidentId = id("incident");
    update((draft) => {
      draft.incidents.unshift({
        id: incidentId,
        title: escalating.title,
        reason: `Employee question escalated: ${reason.trim()}`,
        employeeId: escalating.employeeId,
        caseId: escalating.caseId,
        threadId: escalating.id,
        location: location.trim(),
        timezone: timezone.trim(),
        ...(departure ? { departure } : {}),
        severity,
        status: "open",
        assignee: escalating.assignee,
        createdAt: draft.clock,
        notes: [
          { text: reason.trim(), at: draft.clock, actor: draft.profile.name },
        ],
        documentIds: [],
      });
      addHistory(
        draft,
        `Employee question escalated to urgent: ${reason.trim()}`,
        escalating.caseId,
      );
    }, "Urgent incident created. The conversation is preserved.");
    setEscalating(null);
    notify("The linked urgent incident is available in Urgent.");
  }

  return (
    <>
      <PageHeading
        eyebrow="SUPPORT"
        title="Inbox"
        description="Keep employee questions moving, with a clear next response."
        action={
          <div className="row">
            <Badge tone="purple">{unread} unread</Badge>
            <Badge>{unresolved} unresolved</Badge>
            <Info>
              Unread counts employee conversations with new messages. Unresolved
              counts open or awaiting-reply employee conversations. Reading a
              message does not resolve it.
            </Info>
          </div>
        }
      />
      <div className="tabs" role="tablist" aria-label="Conversation audience">
        <button
          role="tab"
          aria-selected={audience === "employee"}
          className={audience === "employee" ? "active" : ""}
          onClick={() => selectAudience("employee")}
        >
          Employees{" "}
          <span>
            {
              state.threads.filter((thread) => thread.audience === "employee")
                .length
            }
          </span>
        </button>
        <button
          role="tab"
          aria-selected={audience === "internal"}
          className={audience === "internal" ? "active" : ""}
          onClick={() => selectAudience("internal")}
        >
          Internal{" "}
          <span>
            {
              state.threads.filter(
                (thread) =>
                  thread.audience === "internal" ||
                  thread.messages.some(
                    (message) => message.audience === "internal",
                  ),
              ).length
            }
          </span>
        </button>
      </div>
      <Card className="inbox-card">
        <div className="toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Search conversations"
              placeholder="Search people, cases or questions"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            aria-label="Conversation status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All conversations</option>
            <option value="open">Open</option>
            <option value="awaiting">Awaiting reply</option>
            <option value="resolved">Resolved</option>
            {audience === "employee" && <option value="unread">Unread</option>}
          </select>
        </div>
        <div className="split-view">
          <div className="thread-list" aria-label="Conversations">
            {threads.length ? (
              threads.map((thread) => {
                const person = state.employees.find(
                  (item) => item.id === thread.employeeId,
                );
                const visibleMessages = thread.messages.filter(
                  (message) => message.audience === audience,
                );
                const last = visibleMessages[visibleMessages.length - 1];
                return (
                  <button
                    key={thread.id}
                    className={`thread-item ${thread.id === selected?.id ? "active" : ""}`}
                    onClick={() => selectThread(thread)}
                    aria-current={
                      thread.id === selected?.id ? "true" : undefined
                    }
                  >
                    <div className="row">
                      {person && <Avatar employee={person} size="sm" />}
                      <strong>{person?.name || "Employee"}</strong>
                      {thread.unread && audience === "employee" && (
                        <span className="unread-dot" aria-label="Unread" />
                      )}
                      <small className="push">
                        {last
                          ? day(last.at).split(" ").slice(0, 2).join(" ")
                          : ""}
                      </small>
                    </div>
                    <h3>{thread.title}</h3>
                    <p>{last?.body || "No messages yet"}</p>
                    <Status status={thread.status} />
                  </button>
                );
              })
            ) : (
              <Empty title="No conversations found">
                Try a different search or status.
              </Empty>
            )}
          </div>
          {selected ? (
            <article className="thread-detail">
              <div className="thread-header">
                <div className="row between">
                  <Badge tone={audience === "employee" ? "blue" : "purple"}>
                    {audience === "employee"
                      ? "Employee conversation"
                      : "Internal team notes"}
                  </Badge>
                  <Status status={selected.status} />
                </div>
                <h2>{selected.title}</h2>
                <div className="row">
                  {employee && (
                    <Link
                      className="text-link"
                      to={`/employees/${employee.id}`}
                    >
                      {employee.name}
                    </Link>
                  )}
                  <span className="muted">·</span>
                  {linkedCase && (
                    <Link className="text-link" to={`/cases/${linkedCase.id}`}>
                      {linkedCase.caseNumber}
                      <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
                <div className="thread-controls">
                  <label className="row">
                    <UserRound size={15} />
                    <span>Assigned to</span>
                    <select
                      aria-label="Assigned responder"
                      value={selected.assignee}
                      onChange={(event) =>
                        update((draft) => {
                          const thread = draft.threads.find(
                            (item) => item.id === selected.id,
                          );
                          if (thread) {
                            thread.assignee = event.target.value;
                            addHistory(
                              draft,
                              `Inbox responder: ${event.target.value || "Unassigned"}`,
                              thread.caseId,
                            );
                          }
                        }, "Responder updated")
                      }
                    >
                      <option value="">Unassigned</option>
                      <option value={state.profile.name}>
                        {state.profile.name}
                      </option>
                      {selected.assignee &&
                        selected.assignee !== state.profile.name && (
                          <option value={selected.assignee}>
                            {selected.assignee}
                          </option>
                        )}
                    </select>
                  </label>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      update(
                        (draft) => {
                          const thread = draft.threads.find(
                            (item) => item.id === selected.id,
                          );
                          if (thread) {
                            thread.status =
                              thread.status === "resolved"
                                ? "open"
                                : "resolved";
                            addHistory(
                              draft,
                              thread.status === "resolved"
                                ? "Inbox conversation resolved"
                                : "Inbox conversation reopened",
                              thread.caseId,
                            );
                          }
                        },
                        selected.status === "resolved"
                          ? "Conversation reopened"
                          : "Conversation resolved",
                      )
                    }
                  >
                    <CheckCheck size={15} />
                    {selected.status === "resolved" ? "Reopen" : "Resolve"}
                  </Button>
                </div>
              </div>
              {linkedIncident && (
                <Link
                  className="callout urgent-callout"
                  to={`/urgent?incident=${linkedIncident.id}`}
                >
                  <ShieldAlert size={17} />
                  <span>
                    Linked urgent incident ·{" "}
                    {linkedIncident.status.replace("-", " ")}
                  </span>
                  <ArrowRight size={16} />
                </Link>
              )}
              {audience === "internal" && (
                <div className="callout">
                  <ShieldAlert size={16} />
                  <span>Only your team can see these notes.</span>
                </div>
              )}
              <div
                className="messages"
                aria-label={
                  audience === "employee"
                    ? "Employee messages"
                    : "Internal notes"
                }
              >
                {selected.messages
                  .filter((message) => message.audience === audience)
                  .map((message) => (
                    <div
                      key={message.id}
                      className={`message ${message.author === state.profile.name ? "message-own" : ""}`}
                    >
                      <div className="message-meta">
                        <strong>{message.author}</strong>
                        <span>{dateTime(message.at)} UTC</span>
                      </div>
                      <p>{message.body}</p>
                      {message.audience === "internal" && (
                        <small className="muted">Internal note</small>
                      )}
                    </div>
                  ))}
              </div>
              <div className="reply-composer">
                <div className="row between">
                  <strong>
                    {audience === "employee"
                      ? `Reply to ${employee?.name.split(" ")[0] || "employee"}`
                      : "Add an internal note"}
                  </strong>
                  <Badge tone={audience === "employee" ? "blue" : "purple"}>
                    {audience === "employee"
                      ? "Visible to employee"
                      : "Team only"}
                  </Badge>
                </div>
                <textarea
                  aria-label={
                    audience === "employee" ? "Employee reply" : "Internal note"
                  }
                  placeholder={
                    audience === "employee"
                      ? "Write a helpful reply…"
                      : "Add context for your team…"
                  }
                  rows={3}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                />
                <div className="row between">
                  <small className="muted">
                    {audience === "employee"
                      ? "Saved locally for this demo. No email is sent."
                      : "This note stays in the Internal view."}
                  </small>
                  <Button disabled={!reply.trim()} onClick={sendReply}>
                    <Send size={15} />
                    {audience === "employee" ? "Record reply" : "Save note"}
                  </Button>
                </div>
              </div>
              {audience === "employee" && !linkedIncident && (
                <div className="thread-footer">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEscalating(selected);
                      setReason("");
                      setLocation("");
                      setTimezone("UTC");
                      setDeparture("");
                      setSeverity("high");
                      setFormError("");
                    }}
                  >
                    <AlertTriangle size={15} />
                    Escalate to Urgent
                  </Button>
                  <span className="muted">
                    For a time-sensitive travel or document issue
                  </span>
                </div>
              )}
              <div className="next-response">
                <Clock3 size={14} />
                <span>
                  {selected.status === "resolved"
                    ? "Resolved · reopen when further follow-up is needed."
                    : selected.status === "awaiting"
                      ? "Next response: waiting for employee information."
                      : `Next response: ${selected.assignee || "Assign a responder"} to review and reply.`}
                </span>
              </div>
            </article>
          ) : (
            <Empty title="Select a conversation">
              Employee questions and internal notes stay in their own views.
            </Empty>
          )}
        </div>
      </Card>
      {escalating && (
        <Modal title="Escalate to Urgent" onClose={() => setEscalating(null)}>
          <div className="stack">
            <p>
              Keep this employee conversation linked to a time-sensitive
              incident.
            </p>
            <Field label="Reason for urgency">
              <textarea
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="What is blocking the employee, and why is it urgent?"
              />
            </Field>
            <div className="grid-2">
              <Field label="Location">
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Heathrow Airport, London"
                />
              </Field>
              <Field label="Time zone">
                <input
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  placeholder="Europe/London"
                />
              </Field>
              <Field
                label="Departure date or time (optional)"
                hint="Leave blank when the departure is unknown. A date alone does not imply a flight time."
              >
                <input
                  type="date"
                  value={departure}
                  onChange={(event) => setDeparture(event.target.value)}
                />
              </Field>
              <Field label="Severity">
                <select
                  value={severity}
                  onChange={(event) =>
                    setSeverity(event.target.value as Incident["severity"])
                  }
                >
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </Field>
            </div>
            {formError && (
              <p role="alert" className="form-error">
                {formError}
              </p>
            )}
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setEscalating(null)}>
                Cancel
              </Button>
              <Button onClick={escalate}>
                <ShieldAlert size={16} />
                Create urgent incident
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function UrgentPage() {
  const { state, update } = useApp();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("unresolved");
  const [action, setAction] = useState<
    "ask" | "link" | "escalate" | "resolve" | null
  >(null);
  const [text, setText] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [error, setError] = useState("");
  const incident = state.incidents.find(
    (item) => item.id === params.get("incident"),
  );
  const unresolved = state.incidents.filter(
    (item) => item.status !== "resolved",
  );
  const critical = unresolved.filter(
    (item) => item.severity === "critical",
  ).length;
  const incidents = useMemo(
    () =>
      state.incidents
        .filter((item) => {
          const employee = state.employees.find(
            (person) => person.id === item.employeeId,
          );
          return (
            (filter === "all" ||
              (filter === "unresolved"
                ? item.status !== "resolved"
                : item.status === filter)) &&
            `${item.title} ${item.reason} ${employee?.name || ""} ${item.location}`
              .toLowerCase()
              .includes(search.toLowerCase())
          );
        })
        .sort(
          (a, b) =>
            Number(a.status === "resolved") - Number(b.status === "resolved") ||
            Number(b.severity === "critical") -
              Number(a.severity === "critical") ||
            a.createdAt.localeCompare(b.createdAt),
        ),
    [state.incidents, state.employees, filter, search],
  );
  const employee = state.employees.find(
    (item) => item.id === incident?.employeeId,
  );
  const linkedCase = state.cases.find((item) => item.id === incident?.caseId);
  const documents = state.documents.filter(
    (item) => item.employeeId === incident?.employeeId,
  );
  useEffect(() => {
    setAction(null);
    setText("");
    setDocumentId("");
    setError("");
  }, [incident?.id]);
  function openAction(next: typeof action) {
    setAction(next);
    setText("");
    setDocumentId("");
    setError("");
  }
  function close() {
    setParams({});
    setAction(null);
  }
  function changeStatus(next: Incident["status"]) {
    if (!incident) return;
    update(
      (draft) => {
        const current = draft.incidents.find((item) => item.id === incident.id);
        if (!current) return;
        const permitted =
          (current.status === "open" && next === "acknowledged") ||
          (current.status === "acknowledged" && next === "in-progress") ||
          (current.status === "resolved" && next === "open");
        if (!permitted) return;
        current.status = next;
        current.notes.push({
          text:
            next === "acknowledged"
              ? "Incident acknowledged. Response is still required."
              : next === "in-progress"
                ? "Response work started."
                : "Incident reopened for follow-up.",
          actor: draft.profile.name,
          at: draft.clock,
        });
        addHistory(
          draft,
          `Urgent incident ${next === "open" ? "reopened" : next.replace("-", " ")}`,
          current.caseId,
        );
      },
      next === "acknowledged"
        ? "Acknowledged. This incident remains unresolved."
        : next === "open"
          ? "Incident reopened"
          : "Incident is in progress",
    );
  }
  function saveAction() {
    if (!incident || !action) return;
    if (action === "link" && !documentId) {
      setError("Choose a document to link.");
      return;
    }
    if (action !== "link" && !text.trim()) {
      setError(
        action === "resolve"
          ? "Add a resolution note before resolving this incident."
          : "Add a message before saving.",
      );
      return;
    }
    update(
      (draft) => {
        const current = draft.incidents.find((item) => item.id === incident.id);
        if (!current) return;
        const note = text.trim();
        if (action === "link") {
          const document = draft.documents.find(
            (item) =>
              item.id === documentId && item.employeeId === current.employeeId,
          );
          if (!document) return;
          if (!current.documentIds.includes(document.id))
            current.documentIds.push(document.id);
          current.notes.push({
            text: `Linked document: ${document.name} · current version ${document.currentVersionId}.`,
            actor: draft.profile.name,
            at: draft.clock,
          });
          addHistory(
            draft,
            `Document linked to urgent incident: ${document.name}`,
            current.caseId,
          );
        } else if (action === "ask") {
          const thread = threadForIncident(draft, current);
          thread.messages.push({
            id: id("message"),
            author: draft.profile.name,
            body: note,
            at: draft.clock,
            audience: "employee",
          });
          thread.status = "awaiting";
          current.notes.push({
            text: `Information requested in the employee conversation: ${note}`,
            actor: draft.profile.name,
            at: draft.clock,
          });
          addHistory(
            draft,
            "Urgent incident: employee information requested in local Inbox",
            current.caseId,
          );
        } else if (action === "escalate") {
          const thread = threadForIncident(draft, current);
          thread.messages.push({
            id: id("message"),
            author: draft.profile.name,
            body: `Urgent escalation — ${current.title}: ${note}`,
            at: draft.clock,
            audience: "internal",
          });
          current.notes.push({
            text: `Escalated internally: ${note}`,
            actor: draft.profile.name,
            at: draft.clock,
          });
          addHistory(
            draft,
            "Urgent incident escalated with an internal team note",
            current.caseId,
          );
        } else if (action === "resolve" && current.status === "in-progress") {
          current.status = "resolved";
          current.notes.push({
            text: `Resolution: ${note}`,
            actor: draft.profile.name,
            at: draft.clock,
          });
          addHistory(
            draft,
            `Urgent incident resolved: ${note}`,
            current.caseId,
          );
        }
      },
      action === "resolve"
        ? "Incident resolved with your note"
        : action === "link"
          ? "Document linked"
          : action === "ask"
            ? "Information request recorded in Inbox"
            : "Internal escalation note saved",
    );
    setAction(null);
    setText("");
    setDocumentId("");
  }

  return (
    <>
      <PageHeading
        eyebrow="SUPPORT"
        title="Urgent"
        description="Time-sensitive incidents that need a coordinated response."
        action={
          <div className="row">
            <Badge tone="red">{unresolved.length} unresolved</Badge>
            <Info>
              Counts all incidents that are Open, Acknowledged or In progress.
              Reading or acknowledging an incident does not remove it from this
              count.
            </Info>
          </div>
        }
      />
      <div className="urgent-summary">
        <div>
          <span className="urgent-summary-icon">
            <ShieldAlert size={24} />
          </span>
          <div>
            <strong>{unresolved.length} incidents need follow-up</strong>
            <p>
              {critical} critical · {unresolved.length - critical} high priority
            </p>
          </div>
        </div>
        <span className="muted">
          Prioritized by severity, then time reported
        </span>
      </div>
      <div className="toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search urgent incidents"
            placeholder="Search incidents, people or locations"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          aria-label="Incident status"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="unresolved">All unresolved</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in-progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="all">All incidents</option>
        </select>
      </div>
      <div className="incident-list">
        {incidents.length ? (
          incidents.map((item) => {
            const person = state.employees.find(
              (employee) => employee.id === item.employeeId,
            );
            const caseRecord = state.cases.find(
              (record) => record.id === item.caseId,
            );
            return (
              <Card
                key={item.id}
                className={`incident-card ${item.severity === "critical" && item.status !== "resolved" ? "incident-critical" : ""}`}
              >
                <div className="incident-main">
                  <div className="incident-title-row">
                    <Badge
                      tone={item.severity === "critical" ? "red" : "amber"}
                    >
                      <AlertTriangle size={12} />
                      {item.severity === "critical" ? "Critical" : "High"}
                    </Badge>
                    <Status status={item.status} />
                    <span className="muted push">
                      <Clock3 size={13} />
                      {elapsed(item.createdAt, state.clock)} elapsed
                    </span>
                  </div>
                  <button
                    className="incident-title"
                    onClick={() => setParams({ incident: item.id })}
                  >
                    {item.title}
                    <ArrowRight size={16} />
                  </button>
                  <p className="incident-reason">{item.reason}</p>
                  <div className="incident-meta">
                    <span className="row">
                      {person && <Avatar employee={person} size="sm" />}
                      <Link to={`/employees/${item.employeeId}`}>
                        {person?.name || "Employee"}
                      </Link>
                    </span>
                    <Link className="text-link" to={`/cases/${item.caseId}`}>
                      {caseRecord?.caseNumber || "View case"}
                    </Link>
                    <span>
                      <MapPin size={14} />
                      {item.location} · {item.timezone}
                    </span>
                  </div>
                </div>
                <div className="incident-side">
                  <small>DEPARTURE</small>
                  <strong>
                    {item.departure
                      ? item.departure.includes("T")
                        ? `${dateTime(item.departure)} UTC`
                        : day(item.departure)
                      : "Not recorded"}
                  </strong>
                  {item.departure && !item.departure.includes("T") && (
                    <small>Date only</small>
                  )}
                  <span className="row muted">
                    <UserRound size={14} />
                    {item.assignee || "Unassigned"}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => setParams({ incident: item.id })}
                  >
                    Review incident
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </Card>
            );
          })
        ) : (
          <Card>
            <Empty title="No incidents in this view">
              Try a different status or search.
            </Empty>
          </Card>
        )}
      </div>
      <div className="support-footnote">
        <MessageSquare size={15} />
        <span>
          Routine employee questions are in <Link to="/inbox">Inbox</Link>. This
          queue tracks incident response and linked documents.
        </span>
      </div>
      {incident && (
        <Drawer title={incident.title} onClose={close}>
          <div className="stack">
            <div className="row">
              <Badge tone={incident.severity === "critical" ? "red" : "amber"}>
                {incident.severity === "critical"
                  ? "Critical priority"
                  : "High priority"}
              </Badge>
              <Status status={incident.status} />
              <span className="muted push">
                {elapsed(incident.createdAt, state.clock)} elapsed
              </span>
            </div>
            <div className="callout">
              <AlertTriangle size={19} />
              <div>
                <strong>Why this is urgent</strong>
                <p>{incident.reason}</p>
              </div>
            </div>
            <div className="grid-2 incident-facts">
              <div>
                <small>EMPLOYEE</small>
                <Link
                  className="text-link"
                  to={`/employees/${incident.employeeId}`}
                >
                  {employee?.name || "View employee"}
                </Link>
              </div>
              <div>
                <small>LINKED CASE</small>
                <Link className="text-link" to={`/cases/${incident.caseId}`}>
                  {linkedCase?.caseNumber || "View case"}
                  <ArrowRight size={13} />
                </Link>
              </div>
              <div>
                <small>LOCATION / TIME ZONE</small>
                <strong>{incident.location}</strong>
                <span>{incident.timezone}</span>
              </div>
              <div>
                <small>DEPARTURE</small>
                <strong>
                  {incident.departure
                    ? incident.departure.includes("T")
                      ? `${dateTime(incident.departure)} UTC`
                      : day(incident.departure)
                    : "Not recorded"}
                </strong>
                {incident.departure && !incident.departure.includes("T") && (
                  <span className="muted">Date only · flight time unknown</span>
                )}
              </div>
            </div>
            <Field label="Assigned responder">
              <select
                value={incident.assignee}
                onChange={(event) =>
                  update((draft) => {
                    const current = draft.incidents.find(
                      (item) => item.id === incident.id,
                    );
                    if (!current) return;
                    current.assignee = event.target.value;
                    current.notes.push({
                      text: `Assigned responder: ${event.target.value || "Unassigned"}.`,
                      actor: draft.profile.name,
                      at: draft.clock,
                    });
                    addHistory(
                      draft,
                      `Urgent responder: ${event.target.value || "Unassigned"}`,
                      current.caseId,
                    );
                  }, "Responder updated")
                }
              >
                <option value="">Unassigned</option>
                <option value={state.profile.name}>{state.profile.name}</option>
                {incident.assignee &&
                  incident.assignee !== state.profile.name && (
                    <option value={incident.assignee}>
                      {incident.assignee}
                    </option>
                  )}
              </select>
            </Field>
            <div className="incident-actions">
              {incident.status === "open" && (
                <Button onClick={() => changeStatus("acknowledged")}>
                  <Check size={16} />
                  Acknowledge
                </Button>
              )}
              {incident.status === "acknowledged" && (
                <Button onClick={() => changeStatus("in-progress")}>
                  <ArrowRight size={16} />
                  Start response
                </Button>
              )}
              {incident.status !== "resolved" && (
                <>
                  <Button variant="secondary" onClick={() => openAction("ask")}>
                    <MessageSquare size={16} />
                    Ask for information
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => openAction("link")}
                  >
                    <Link2 size={16} />
                    Link document
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => openAction("escalate")}
                  >
                    <MoreHorizontal size={16} />
                    Escalate internally
                  </Button>
                  {incident.status === "in-progress" && (
                    <Button onClick={() => openAction("resolve")}>
                      <CheckCheck size={16} />
                      Resolve with note
                    </Button>
                  )}
                </>
              )}
              {incident.status === "resolved" && (
                <Button
                  variant="secondary"
                  onClick={() => changeStatus("open")}
                >
                  Reopen incident
                </Button>
              )}
            </div>
            {incident.status === "open" && (
              <small className="muted">
                Acknowledge the incident, then start a response before resolving
                it.
              </small>
            )}
            {incident.status === "acknowledged" && (
              <small className="muted">
                Acknowledged incidents remain in the unresolved count. Start a
                response to continue.
              </small>
            )}
            {action && (
              <div className="incident-action-form stack">
                <h3>
                  {action === "ask"
                    ? "Ask the employee for information"
                    : action === "link"
                      ? "Link a document on file"
                      : action === "escalate"
                        ? "Escalate to your internal team"
                        : "Record the resolution"}
                </h3>
                {action === "link" ? (
                  <>
                    <Field label="Employee document">
                      <select
                        value={documentId}
                        onChange={(event) => setDocumentId(event.target.value)}
                      >
                        <option value="">Select a document</option>
                        {documents
                          .filter(
                            (document) =>
                              !incident.documentIds.includes(document.id),
                          )
                          .map((document) => (
                            <option key={document.id} value={document.id}>
                              {document.name} · {document.status}
                            </option>
                          ))}
                      </select>
                    </Field>
                    {!documents.filter(
                      (document) => !incident.documentIds.includes(document.id),
                    ).length && (
                      <p className="muted">
                        All available documents are already linked, or this
                        employee has no documents on file.
                      </p>
                    )}
                    {documentId &&
                      (() => {
                        const document = documents.find(
                          (item) => item.id === documentId,
                        );
                        const version = document?.versions.find(
                          (item) => item.id === document.currentVersionId,
                        );
                        return (
                          document && (
                            <div className="callout">
                              <FileText size={17} />
                              <div>
                                <strong>{document.name}</strong>
                                <p>
                                  Current version:{" "}
                                  {version?.name || document.currentVersionId} ·{" "}
                                  {document.status}
                                </p>
                                <small>
                                  {document.expiry
                                    ? `Recorded expiry: ${day(document.expiry)}`
                                    : "Expiry is not recorded"}
                                </small>
                              </div>
                            </div>
                          )
                        );
                      })()}
                  </>
                ) : (
                  <Field
                    label={
                      action === "ask"
                        ? "Employee message"
                        : action === "escalate"
                          ? "Internal note"
                          : "Resolution note"
                    }
                    hint={
                      action === "ask"
                        ? "Recorded in the employee conversation in this demo. No email is sent."
                        : action === "escalate"
                          ? "Visible only in the Internal Inbox view and incident activity."
                          : "Explain what was done and any follow-up needed."
                    }
                  >
                    <textarea
                      rows={4}
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                    />
                  </Field>
                )}
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="row">
                  <Button onClick={saveAction}>
                    {action === "link"
                      ? "Link document"
                      : action === "resolve"
                        ? "Resolve incident"
                        : action === "ask"
                          ? "Record information request"
                          : "Save internal escalation"}
                  </Button>
                  <Button variant="ghost" onClick={() => setAction(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            <section className="stack">
              <div className="row between">
                <h3>
                  Linked documents{" "}
                  <span className="muted">({incident.documentIds.length})</span>
                </h3>
                <Link
                  className="text-link"
                  to={`/documents?employee=${incident.employeeId}`}
                >
                  Document inventory
                  <ArrowRight size={13} />
                </Link>
              </div>
              {incident.documentIds.length ? (
                incident.documentIds.map((linkedId) => {
                  const document = state.documents.find(
                    (item) => item.id === linkedId,
                  );
                  const version = document?.versions.find(
                    (item) => item.id === document.currentVersionId,
                  );
                  return (
                    <div className="linked-document" key={linkedId}>
                      <FileText size={20} />
                      <div>
                        <strong>
                          {document?.name || "Document unavailable"}
                        </strong>
                        {document && (
                          <>
                            <small>
                              Current version:{" "}
                              {version?.name || document.currentVersionId}
                            </small>
                            <small>
                              {document.expiry
                                ? `Recorded expiry: ${day(document.expiry)}`
                                : "Expiry is not recorded"}
                            </small>
                          </>
                        )}
                      </div>
                      {document && <Status status={document.status} />}
                    </div>
                  );
                })
              ) : (
                <p className="muted">No documents linked yet.</p>
              )}
            </section>
            {incident.threadId && (
              <Link
                className="callout"
                to={`/inbox?thread=${incident.threadId}`}
              >
                <MessageSquare size={18} />
                <span>Open the linked employee conversation</span>
                <ArrowRight size={15} />
              </Link>
            )}
            <section className="stack">
              <h3>Incident activity</h3>
              <div className="incident-timeline">
                {[...incident.notes].reverse().map((note, index) => (
                  <div className="activity-item" key={`${note.at}-${index}`}>
                    <span className="activity-dot" />
                    <div>
                      <p>{note.text}</p>
                      <small>
                        {note.actor} · {dateTime(note.at)} UTC
                      </small>
                    </div>
                  </div>
                ))}
                <div className="activity-item">
                  <span className="activity-dot" />
                  <div>
                    <p>Incident opened</p>
                    <small>{dateTime(incident.createdAt)} UTC</small>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </Drawer>
      )}
    </>
  );
}
