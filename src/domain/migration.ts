import { createInitialState, DEMO_CLOCK } from "./fixtures";
import { compatibleDocument } from "./operations";
import { makeRequirements, TEMPLATE_VERSION } from "./templates";
import type { AppState, EmployeeDocument, Requirement, RouteId } from "./types";

export const STORAGE_KEY = "tripwire.workspace.v3";
export const SCHEMA_VERSION = 3;
export interface WorkspaceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
const legacyKeys = [
  "tripwire.workspace.v2",
  "tripwire.workspace.v1",
  "tripwire-state",
  "tripwire-demo-state",
];
const routes: RouteId[] = [
  "vn-dn1",
  "vn-dn2",
  "vn-evisa",
  "uk-eta",
  "uk-visitor",
  "work-review",
  "review",
];
const genericTasks =
  /^(review submitted documents|confirm assignment facts|confirm outstanding actions)$/i;
const actor = (value: string | undefined) =>
  value === "Avery Morgan" ? "Jeffrey Tang" : value;
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const suffix = (value: unknown): number =>
  Number(String(value ?? "").match(/(\d+)$/)?.[1] ?? 0);
const display = (kind: "EMP" | "CASE", n: number) =>
  `TW-${kind}-${String(n).padStart(6, "0")}`;
function validCollection(
  value: unknown,
  name: string,
): asserts value is Record<string, unknown>[] {
  if (
    !Array.isArray(value) ||
    value.some((r) => !record(r) || typeof r.id !== "string" || !r.id)
  )
    throw new Error(`Workspace ${name} data is incomplete.`);
  const ids = value.map((r) => r.id);
  if (new Set(ids).size !== ids.length)
    throw new Error(`Workspace ${name} identifiers are duplicated.`);
}
function validateSupportRecords(raw: Record<string, unknown>): void {
  for (const thread of (raw.threads ?? []) as Record<string, unknown>[]) {
    validCollection(thread.messages, "thread messages");
    for (const message of thread.messages) {
      if (
        typeof message.author !== "string" ||
        typeof message.body !== "string" ||
        typeof message.at !== "string" ||
        !Number.isFinite(Date.parse(message.at)) ||
        (message.audience !== "employee" && message.audience !== "internal")
      ) {
        throw new Error("Workspace thread messages data is incomplete.");
      }
    }
  }
  for (const incident of (raw.incidents ?? []) as Record<string, unknown>[]) {
    if (
      !Array.isArray(incident.notes) ||
      incident.notes.some(
        (note) =>
          !record(note) ||
          typeof note.text !== "string" ||
          typeof note.actor !== "string" ||
          typeof note.at !== "string" ||
          !Number.isFinite(Date.parse(note.at)),
      )
    ) {
      throw new Error("Workspace incident notes data is incomplete.");
    }
    if (
      !Array.isArray(incident.documentIds) ||
      incident.documentIds.some((id) => typeof id !== "string" || !id)
    ) {
      throw new Error("Workspace incident document links data is incomplete.");
    }
  }
}
function normalizeDocument(
  value: Record<string, unknown>,
  clock: string,
): EmployeeDocument {
  const d = { ...value } as unknown as EmployeeDocument;
  d.type = d.type ?? "other";
  d.name = d.name ?? "Stored document";
  d.status = d.status ?? "submitted";
  if (d.versions !== undefined && !Array.isArray(d.versions))
    throw new Error("Document version history has an unsupported format.");
  if (!d.versions?.length)
    d.versions = [
      { id: `d-${d.id}-v1`, name: d.name, createdAt: clock, status: d.status },
    ];
  validCollection(d.versions, "document versions");
  d.currentVersionId = d.currentVersionId ?? d.versions.at(-1)!.id;
  if (!d.versions.some((v) => v.id === d.currentVersionId))
    throw new Error("A document’s current version is missing.");
  return d;
}
/** Pure, idempotent migration. Unknown fields and historical document versions survive. */
export function migrateState(value: unknown): AppState {
  if (!record(value)) throw new Error("Workspace data is not an object.");
  if (Number(value.version) > SCHEMA_VERSION)
    throw new Error("This workspace was saved by a newer application version.");
  const raw = structuredClone(value);
  const incomingCases = raw.cases ?? raw.assignments;
  validCollection(raw.employees, "employees");
  validCollection(incomingCases, "cases");
  for (const key of [
    "documents",
    "threads",
    "incidents",
    "trips",
    "history",
    "notifications",
  ])
    if (raw[key] !== undefined) validCollection(raw[key], key);
  validateSupportRecords(raw);
  const clock =
    typeof raw.clock === "string" && Number.isFinite(Date.parse(raw.clock))
      ? raw.clock
      : DEMO_CLOCK;
  const originalVersion = Number(raw.version ?? 0);
  const state = {
    ...raw,
    version: SCHEMA_VERSION,
    clock,
    profile: {
      ...(record(raw.profile) ? raw.profile : {}),
      id:
        record(raw.profile) && typeof raw.profile.id === "string"
          ? raw.profile.id
          : "admin-1",
      name: "Jeffrey Tang",
      initials: "JT",
    },
    employees: raw.employees,
    cases: incomingCases,
    documents: ((raw.documents ?? []) as Record<string, unknown>[]).map((d) =>
      normalizeDocument(d, clock),
    ),
    threads: raw.threads ?? [],
    incidents: raw.incidents ?? [],
    trips: raw.trips ?? [],
    history: raw.history ?? [],
    notifications: raw.notifications ?? [],
    migrationLog: Array.isArray(raw.migrationLog) ? raw.migrationLog : [],
    counters: record(raw.counters)
      ? { ...raw.counters }
      : { employee: 0, case: 0, document: 0 },
  } as unknown as AppState;
  state.counters = {
    employee: Math.max(
      Number(state.counters.employee) || 0,
      ...state.employees.map((e) => suffix(e.employeeNumber)),
    ),
    case: Math.max(
      Number(state.counters.case) || 0,
      ...state.cases.map((c) => suffix(c.caseNumber)),
    ),
    document: Math.max(
      Number(state.counters.document) || 0,
      ...state.documents.map((d) => suffix(d.id)),
    ),
  };
  const employeeNumbers = new Set<string>(),
    caseNumbers = new Set<string>();
  for (const e of state.employees) {
    if (
      !/^TW-EMP-\d{6,}$/.test(e.employeeNumber ?? "") ||
      employeeNumbers.has(e.employeeNumber)
    )
      e.employeeNumber = display("EMP", ++state.counters.employee);
    employeeNumbers.add(e.employeeNumber);
    e.initials =
      e.initials ??
      e.name
        ?.split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() ??
      "?";
    e.color = e.color ?? "#687caa";
    e.department = e.department ?? "";
    e.homeOffice = e.homeOffice ?? "";
    e.nationality = e.nationality ?? "";
    e.email = e.email ?? "";
  }
  let rebuilt = 0,
    legacyMoved = 0,
    revalidated = 0;
  for (const c of state.cases) {
    if (
      !/^TW-CASE-\d{6,}$/.test(c.caseNumber ?? "") ||
      caseNumbers.has(c.caseNumber)
    )
      c.caseNumber = display("CASE", ++state.counters.case);
    caseNumbers.add(c.caseNumber);
    c.coordinator = actor(c.coordinator) ?? "Jeffrey Tang";
    c.routeConfirmed = c.routeConfirmed ?? false;
    c.createdAt = c.createdAt ?? clock;
    c.host = c.host ?? "";
    c.purpose = c.purpose ?? "Activity needs confirmation";
    c.country = c.country ?? "";
    c.start = c.start ?? "";
    c.end = c.end ?? "";
    if (!routes.includes(c.route))
      c.route =
        /technical|hands.on|engineering|work assignment|placement|employment/i.test(
          c.purpose,
        )
          ? "work-review"
          : "review";
    if (
      c.id === "assignment-2" &&
      /technical|engineering|six.month|placement/i.test(c.purpose)
    )
      c.route = "work-review";
    c.internalTasks = Array.isArray(c.internalTasks) ? c.internalTasks : [];
    const previous = Array.isArray(c.requirements) ? c.requirements : [];
    const retained: Requirement[] = [];
    for (const r of previous) {
      if (genericTasks.test(r.name ?? "")) {
        if (!c.internalTasks.some((t) => t.id === r.id))
          c.internalTasks.push({
            ...r,
            id: r.id,
            name: r.name,
            status: r.status ?? "todo",
            legacy: true,
          });
        legacyMoved++;
      } else
        retained.push({ ...r, assignee: actor(r.assignee) ?? "Unassigned" });
    }
    if (c.templateVersion !== TEMPLATE_VERSION) {
      const template = makeRequirements(c.route, c.start);
      const used = new Set<string>();
      c.requirements = template.map((seed) => {
        const old = retained.find(
          (r) =>
            r.id === seed.id ||
            r.name?.toLowerCase() === seed.name.toLowerCase(),
        );
        if (old) used.add(old.id);
        return {
          ...seed,
          ...old,
          name: seed.name,
          instruction: seed.instruction,
          assignee:
            actor(old?.assignee) ??
            (seed.party === "employee"
              ? (state.employees.find((e) => e.id === c.employeeId)?.name ??
                "Employee")
              : seed.assignee),
        };
      });
      c.requirements.push(...retained.filter((r) => !used.has(r.id)));
      c.templateVersion = TEMPLATE_VERSION;
      rebuilt++;
    } else c.requirements = retained;
    for (const r of c.requirements) {
      if (r.status === "completed" && r.documentId) {
        const d = state.documents.find((d) => d.id === r.documentId);
        if (
          !d ||
          d.currentVersionId !== r.versionId ||
          !compatibleDocument(d, c, r.id)
        ) {
          r.status = "correction";
          r.details =
            "Review the current document version and confirm this trip’s criteria before reusing it.";
          revalidated++;
        }
      }
    }
  }
  // Correct the configured fictional admin display name; preserve message bodies/audit facts.
  for (const t of state.threads) {
    t.assignee = actor(t.assignee) ?? "Unassigned";
    for (const m of t.messages ?? []) m.author = actor(m.author) ?? m.author;
  }
  for (const i of state.incidents) {
    i.assignee = actor(i.assignee) ?? "Unassigned";
    for (const n of i.notes ?? []) n.actor = actor(n.actor) ?? n.actor;
  }
  for (const h of state.history) h.actor = actor(h.actor) ?? h.actor;
  for (const c of state.cases) {
    if (c.submission)
      c.submission.actor = actor(c.submission.actor) ?? c.submission.actor;
    if (c.decision)
      c.decision.actor = actor(c.decision.actor) ?? c.decision.actor;
  }
  if (
    originalVersion !== SCHEMA_VERSION ||
    rebuilt ||
    legacyMoved ||
    revalidated
  )
    state.migrationLog.push(
      `Migrated schema ${originalVersion} → ${SCHEMA_VERSION}; refreshed ${rebuilt} requirement templates, retained ${legacyMoved} legacy internal actions, revalidated ${revalidated} document uses. Existing IDs, custom requirements and document versions retained.`,
    );
  return state;
}
function browserStorage(): WorkspaceStorage | undefined {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}
function quarantine(
  storage: WorkspaceStorage,
  key: string,
  raw: string,
): string {
  let attempt = 0,
    keyName = `${STORAGE_KEY}.quarantine.${Date.now()}`;
  while (storage.getItem(keyName) !== null)
    keyName = `${STORAGE_KEY}.quarantine.${Date.now()}.${++attempt}`;
  storage.setItem(keyName, raw);
  if (storage.getItem(keyName) !== raw)
    throw new Error("Unable to preserve the existing workspace.");
  storage.removeItem(key);
  return keyName;
}
export function loadWorkspace(
  storage: WorkspaceStorage | undefined = browserStorage(),
): AppState {
  if (!storage) return createInitialState();
  for (const key of [STORAGE_KEY, ...legacyKeys]) {
    let raw: string | null;
    try {
      raw = storage.getItem(key);
    } catch {
      const seed = createInitialState();
      seed.migrationLog.push(
        "Browser storage is unavailable; changes are kept in this tab.",
      );
      return seed;
    }
    if (raw === null) continue;
    try {
      const state = migrateState(JSON.parse(raw));
      if (key !== STORAGE_KEY)
        state.migrationLog.push(
          `Imported existing workspace from ${key}; original storage retained.`,
        );
      return state;
    } catch (error) {
      const seed = createInitialState();
      try {
        const saved = quarantine(storage, key, raw);
        seed.migrationLog.push(
          `Unreadable workspace quarantined at ${saved}; original data retained for recovery. ${error instanceof Error ? error.message : "Storage format could not be read."}`,
        );
      } catch {
        seed.migrationLog.push(
          "Existing workspace could not be read or quarantined. Original storage is retained; persistence is paused until it can be recovered.",
        );
      }
      return seed;
    }
  }
  return createInitialState();
}
/** Throws on unavailable persistence or unpreserved corruption; caller must surface feedback. */
export function saveWorkspace(
  storage: WorkspaceStorage,
  state: AppState,
): void {
  if (state.migrationLog.some((m) => m.includes("persistence is paused")))
    throw new Error(
      "Persistence is paused to preserve unreadable existing data.",
    );
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
