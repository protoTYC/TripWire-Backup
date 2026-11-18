import { dateOnly } from "./dates";
import { makeRequirements, TEMPLATE_VERSION } from "./templates";
import type {
  AppState,
  Case,
  Employee,
  EmployeeDocument,
  RouteId,
} from "./types";

const pad = (n: number) => String(n).padStart(6, "0");
function nextNumber(
  state: AppState,
  key: "employee" | "case" | "document",
): number {
  const records =
    key === "employee"
      ? state.employees
      : key === "case"
        ? state.cases
        : state.documents;
  const field =
    key === "employee"
      ? "employeeNumber"
      : key === "case"
        ? "caseNumber"
        : "id";
  const max = Math.max(
    0,
    ...records.map((r) => {
      const match = String(
        (r as unknown as Record<string, unknown>)[field] ?? "",
      ).match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    }),
  );
  return (state.counters[key] = Math.max(state.counters[key] ?? 0, max) + 1);
}
function id(prefix: string, existing: { id: string }[]): string {
  let n = existing.length + 1;
  while (existing.some((x) => x.id === `${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}
export function addHistory(
  state: AppState,
  message: string,
  caseId?: string,
): void {
  state.history.unshift({
    id: id("history", state.history),
    message,
    caseId,
    at: state.clock,
    actor: state.profile.name,
  });
}
function assessedRoute(input: {
  country: string;
  purpose: string;
  route: RouteId;
}): RouteId {
  if (
    /hands.on|engineering|technical work|employment|placement|installation|maintenance/i.test(
      input.purpose,
    )
  )
    return input.country === "Vietnam" ? "work-review" : "review";
  if (input.route.startsWith("vn-") && input.country !== "Vietnam")
    return "review";
  if (input.route.startsWith("uk-") && input.country !== "United Kingdom")
    return "review";
  return input.route;
}
export function createCase(
  state: AppState,
  input: {
    employeeId: string;
    country: string;
    purpose: string;
    host: string;
    start: string;
    end: string;
    route: RouteId;
  },
): Case {
  const employee = state.employees.find((e) => e.id === input.employeeId);
  if (!employee) throw new Error("Select an employee before creating a case.");
  if (
    !dateOnly(input.start) ||
    !dateOnly(input.end) ||
    dateOnly(input.end) < dateOnly(input.start)
  )
    throw new Error("Enter a valid trip date range.");
  const n = nextNumber(state, "case");
  let internalId = `case-${n}`;
  while (state.cases.some((c) => c.id === internalId))
    internalId = `case-${nextNumber(state, "case")}`;
  const route = assessedRoute(input);
  const created: Case = {
    ...input,
    route,
    id: internalId,
    caseNumber: `TW-CASE-${pad(state.counters.case)}`,
    coordinator: state.profile.name,
    routeConfirmed: false,
    requirements: makeRequirements(route, input.start),
    internalTasks: [],
    templateVersion: TEMPLATE_VERSION,
    createdAt: state.clock,
  };
  if (route === "review" || route === "work-review")
    created.reviewQuestion =
      route === "work-review"
        ? "Which work-authorization route covers these technical duties and placement dates?"
        : "Which route applies to this nationality, current status and activity?";
  created.requirements.forEach((r) => {
    if (r.party === "employee") r.assignee = employee.name;
  });
  state.cases.unshift(created);
  const tripId = id("trip", state.trips);
  state.trips.push({
    id: tripId,
    employeeId: employee.id,
    caseId: created.id,
    country: created.country,
    plannedEntry: created.start,
    plannedExit: created.end,
    approvedReturn: created.end,
    cancelled: false,
  });
  addHistory(
    state,
    `Created ${created.caseNumber} for ${employee.name}; proposed ${route} route awaits confirmation.`,
    created.id,
  );
  return created;
}
function minimumPassportExpiry(c: Case): string {
  if (c.route === "vn-dn1" || c.route === "vn-dn2") {
    const d = new Date(`${dateOnly(c.start)}T12:00:00Z`),
      originalDay = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 6);
    const last = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
    ).getUTCDate();
    d.setUTCDate(Math.min(originalDay, last));
    return d.toISOString().slice(0, 10);
  }
  return dateOnly(c.end);
}
/** Reuse is about the current reviewed version, employee and this case's criteria. */
export function compatibleDocument(
  document: EmployeeDocument,
  c: Case,
  requirementId?: string,
): boolean {
  if (document.employeeId !== c.employeeId || document.status !== "reviewed")
    return false;
  if (
    !dateOnly(c.start) ||
    !dateOnly(c.end) ||
    dateOnly(c.end) < dateOnly(c.start)
  )
    return false;
  const current = document.versions.find(
    (v) => v.id === document.currentVersionId,
  );
  if (!current || current.status !== "reviewed") return false;
  if (document.type === "passport")
    return (
      !!dateOnly(document.expiry ?? "") &&
      dateOnly(document.expiry!) >= minimumPassportExpiry(c)
    );
  if (
    document.expiry &&
    (!dateOnly(document.expiry) || dateOnly(document.expiry) < dateOnly(c.end))
  )
    return false;
  // A company setup certificate, sponsor request and authority approval are different deliverables.
  // Reuse is established by review for this exact requirement, never by the shared document type.
  if (document.type === "invitation" || document.type === "authorization")
    return c.requirements.some(
      (r) =>
        r.id === requirementId &&
        r.documentType === document.type &&
        r.documentId === document.id &&
        r.versionId === document.currentVersionId &&
        r.status === "completed",
    );
  return true;
}
export function linkDocument(
  state: AppState,
  caseId: string,
  requirementId: string,
  documentId: string,
): void {
  const c = state.cases.find((c) => c.id === caseId),
    doc = state.documents.find((d) => d.id === documentId),
    r = c?.requirements.find((r) => r.id === requirementId);
  if (!c || !doc || !r)
    throw new Error(
      "This case, requirement or document is no longer available.",
    );
  if (r.documentType && r.documentType !== doc.type)
    throw new Error("Choose the document type requested by this requirement.");
  if (!compatibleDocument(doc, c, r.id))
    throw new Error(
      "The current document version needs review or does not meet this trip’s criteria.",
    );
  r.documentId = doc.id;
  r.versionId = doc.currentVersionId;
  r.status = "completed";
  addHistory(
    state,
    `Linked current reviewed ${doc.name} (${doc.currentVersionId}) to ${r.name}.`,
    caseId,
  );
}
export function replaceDocument(
  state: AppState,
  documentId: string,
  fileName: string,
  expiry?: string,
): void {
  const doc = state.documents.find((d) => d.id === documentId);
  if (!doc) throw new Error("Document not found.");
  if (!fileName.trim())
    throw new Error("Choose a file name for this replacement.");
  let n = doc.versions.length + 1;
  while (doc.versions.some((v) => v.id === `${doc.id}-v${n}`)) n++;
  const previousVersionId = doc.currentVersionId;
  const version = {
    id: `${doc.id}-v${n}`,
    name: fileName.trim(),
    createdAt: state.clock,
    status: "submitted" as const,
  };
  doc.versions.push(version);
  doc.currentVersionId = version.id;
  doc.name = fileName.trim();
  doc.status = "submitted";
  doc.expiry = expiry;
  doc.checkedAt = undefined;
  for (const c of state.cases) {
    const linked = c.requirements.filter(
      (r) => r.documentId === doc.id && r.status !== "na",
    );
    for (const r of linked) {
      r.status = "correction";
      r.details =
        "A replacement version was submitted. Review the current file and revalidate this case before using it.";
      addHistory(
        state,
        `${r.name} needs revalidation after a replacement document was submitted; the previous version remains in the case history.`,
        c.id,
      );
    }
    if (doc.type === "passport" && linked.length) {
      c.routeConfirmed = false;
      if (c.draft) c.draft.needsReview = true;
      if (c.decision) {
        c.decision.passportVersionId ??= previousVersionId;
        c.decision.needsRevalidation = true;
      }
      for (const r of c.requirements) {
        const dependent =
          r.stage === "decision" ||
          r.stage === "departure" ||
          (r.stage === "preparation" && !r.documentType);
        if (
          dependent &&
          (r.status === "completed" || r.status === "submitted")
        ) {
          r.status = "correction";
          r.details =
            "The traveling passport was replaced. Recheck the current passport, application facts, authority result linkage and departure requirements.";
        }
      }
      addHistory(
        state,
        `Replaced passport version ${previousVersionId}; route and preparation need review${c.decision ? `; authority result ${c.decision.reference} is retained as history and needs passport-linkage revalidation` : ""}.`,
        c.id,
      );
    }
  }
  addHistory(state, `New version submitted for ${doc.name}; review required.`);
}
export function createEmployee(
  state: AppState,
  input: {
    name: string;
    email: string;
    department: string;
    homeOffice: string;
    nationality: string;
  },
): Employee {
  if (!input.name.trim()) throw new Error("Enter the employee name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
    throw new Error("Enter a valid employee email address.");
  const n = nextNumber(state, "employee");
  let internalId = `employee-${n}`;
  while (state.employees.some((e) => e.id === internalId))
    internalId = `employee-${nextNumber(state, "employee")}`;
  const colors = [
    "#7c5cce",
    "#1b867b",
    "#bc6446",
    "#3a77b1",
    "#a65b94",
    "#7c773d",
  ];
  const e: Employee = {
    ...input,
    name: input.name.trim(),
    email: input.email.trim(),
    id: internalId,
    employeeNumber: `TW-EMP-${pad(state.counters.employee)}`,
    initials: input.name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
    color: colors[n % colors.length],
  };
  state.employees.push(e);
  addHistory(
    state,
    `Created employee record ${e.employeeNumber} for ${e.name}.`,
  );
  return e;
}
