export type RouteId =
  | "vn-dn1"
  | "vn-dn2"
  | "vn-evisa"
  | "uk-eta"
  | "uk-visitor"
  | "work-review"
  | "review";
export type WorkflowStatus =
  | "todo"
  | "requested"
  | "submitted"
  | "completed"
  | "correction"
  | "na";
export type DocumentType =
  | "passport"
  | "photo"
  | "invitation"
  | "authorization"
  | "other";
export interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  email: string;
  department: string;
  homeOffice: string;
  nationality: string;
  initials: string;
  color: string;
}
export interface DocumentVersion {
  id: string;
  name: string;
  createdAt: string;
  status: "reviewed" | "submitted" | "correction";
}
export interface EmployeeDocument {
  id: string;
  employeeId: string;
  type: DocumentType;
  name: string;
  status: "reviewed" | "submitted" | "correction";
  expiry?: string;
  checkedAt?: string;
  currentVersionId: string;
  versions: DocumentVersion[];
}
export interface Requirement {
  id: string;
  name: string;
  instruction: string;
  kind: "required" | "conditional" | "recommended";
  party: "employee" | "hr" | "host";
  assignee: string;
  status: WorkflowStatus;
  stage: "documents" | "preparation" | "submission" | "decision" | "departure";
  due?: string;
  documentType?: DocumentType;
  documentId?: string;
  versionId?: string;
  details?: string;
}
export interface InternalTask {
  id: string;
  name: string;
  status: WorkflowStatus;
  legacy?: boolean;
}
export interface Case {
  id: string;
  caseNumber: string;
  employeeId: string;
  country: string;
  purpose: string;
  host: string;
  start: string;
  end: string;
  coordinator: string;
  route: RouteId;
  routeConfirmed: boolean;
  requirements: Requirement[];
  internalTasks: InternalTask[];
  templateVersion: number;
  createdAt: string;
  reviewQuestion?: string;
  intake?: {
    nationality: string;
    passportNationality: string;
    currentPermission: string;
    eligibility: string;
    eligibilityChecked: boolean;
    activity: string;
    activityDetail: string;
  };
  draft?: {
    fields: Record<string, string>;
    preparedAt: string;
    needsReview?: boolean;
  };
  submission?: {
    reference: string;
    date: string;
    actor: string;
    simulated: boolean;
  };
  decision?: {
    outcome: string;
    date: string;
    actor: string;
    simulated: boolean;
    reference: string;
    validFrom?: string;
    validUntil?: string;
    needsRevalidation?: boolean;
    passportVersionId?: string;
  };
}
export interface Message {
  id: string;
  author: string;
  body: string;
  at: string;
  audience: "employee" | "internal";
}
export interface Thread {
  id: string;
  title: string;
  employeeId: string;
  caseId: string;
  audience: "employee" | "internal";
  assignee: string;
  unread: boolean;
  status: "open" | "awaiting" | "resolved";
  messages: Message[];
  requirementIds?: string[];
}
export interface Incident {
  id: string;
  title: string;
  reason: string;
  employeeId: string;
  caseId: string;
  threadId?: string;
  location: string;
  timezone: string;
  departure?: string;
  severity: "critical" | "high";
  status: "open" | "acknowledged" | "in-progress" | "resolved";
  assignee: string;
  createdAt: string;
  notes: { text: string; at: string; actor: string }[];
  documentIds: string[];
}
export interface Trip {
  id: string;
  employeeId: string;
  caseId: string;
  country: string;
  plannedEntry: string;
  plannedExit: string;
  actualEntry?: string;
  actualExit?: string;
  approvedReturn: string;
  permissionExpiry?: string;
  cancelled: boolean;
  dailyBudget?: number;
  currency?: string;
}
export interface HistoryEvent {
  id: string;
  caseId?: string;
  message: string;
  at: string;
  actor: string;
}
export interface Notification {
  id: string;
  title: string;
  read: boolean;
  to: string;
}
export interface AppState {
  version: number;
  clock: string;
  profile: { id: string; name: string; initials: string };
  counters: { employee: number; case: number; document: number };
  employees: Employee[];
  cases: Case[];
  documents: EmployeeDocument[];
  threads: Thread[];
  incidents: Incident[];
  trips: Trip[];
  history: HistoryEvent[];
  notifications: Notification[];
  migrationLog: string[];
}
export interface RouteGuide {
  id: RouteId;
  country: string;
  title: string;
  short: string;
  purpose: string;
  scope: string;
  excludes: string;
  fee: string;
  feeScope: string;
  timing: string;
  officialUrl: string;
  sourceChecked: string;
  sources: { label: string; url: string }[];
  steps: string[];
  employeeItems: string[];
  hostItems: string[];
}
