import { makeRequirements, TEMPLATE_VERSION } from "./templates";
import type {
  AppState,
  Case,
  Employee,
  EmployeeDocument,
  RouteId,
  Thread,
} from "./types";

export const DEMO_CLOCK = "2026-10-20T10:00:00Z";
const employees: Employee[] = [
  {
    id: "employee-2",
    employeeNumber: "TW-EMP-000069",
    name: "Casey Chen",
    email: "casey.chen@northstar.example",
    department: "Engineering",
    homeOffice: "San Francisco, US",
    nationality: "United States",
    initials: "CC",
    color: "#687caa",
  },
  {
    id: "employee-3",
    employeeNumber: "TW-EMP-000070",
    name: "Maya Patel",
    email: "maya.patel@northstar.example",
    department: "Operations",
    homeOffice: "Bengaluru, India",
    nationality: "India",
    initials: "MP",
    color: "#b47d60",
  },
  {
    id: "employee-4",
    employeeNumber: "TW-EMP-000071",
    name: "Olivia Martinez",
    email: "olivia.martinez@northstar.example",
    department: "Sales",
    homeOffice: "Austin, US",
    nationality: "United States",
    initials: "OM",
    color: "#a96993",
  },
  {
    id: "employee-5",
    employeeNumber: "TW-EMP-000072",
    name: "Daniel Kim",
    email: "daniel.kim@northstar.example",
    department: "Engineering",
    homeOffice: "Seoul, South Korea",
    nationality: "South Korea",
    initials: "DK",
    color: "#5f918b",
  },
  {
    id: "employee-6",
    employeeNumber: "TW-EMP-000073",
    name: "Ethan Brooks",
    email: "ethan.brooks@northstar.example",
    department: "Finance",
    homeOffice: "New York, US",
    nationality: "United States",
    initials: "EB",
    color: "#8072ac",
  },
  {
    id: "employee-7",
    employeeNumber: "TW-EMP-000074",
    name: "Amina Hassan",
    email: "amina.hassan@northstar.example",
    department: "Operations",
    homeOffice: "Dubai, UAE",
    nationality: "Egypt",
    initials: "AH",
    color: "#788352",
  },
];
function makeCase(
  id: string,
  number: number,
  employeeId: string,
  country: string,
  purpose: string,
  host: string,
  start: string,
  end: string,
  route: RouteId,
): Case {
  const employee = employees.find((e) => e.id === employeeId)!;
  return {
    id,
    caseNumber: `TW-CASE-${String(number).padStart(6, "0")}`,
    employeeId,
    country,
    purpose,
    host,
    start,
    end,
    route,
    coordinator: "Jeffrey Tang",
    routeConfirmed: false,
    requirements: makeRequirements(route, start).map((r) => ({
      ...r,
      assignee: r.party === "employee" ? employee.name : r.assignee,
    })),
    internalTasks: [],
    templateVersion: TEMPLATE_VERSION,
    createdAt: "2026-10-01T09:00:00Z",
  };
}
function document(
  id: string,
  employeeId: string,
  type: EmployeeDocument["type"],
  name: string,
  expiry?: string,
  status: EmployeeDocument["status"] = "reviewed",
  oldVersion = false,
): EmployeeDocument {
  const currentVersionId = `${id}-v${oldVersion ? 2 : 1}`;
  return {
    id,
    employeeId,
    type,
    name,
    status,
    expiry,
    checkedAt: status === "reviewed" ? "2026-10-15" : undefined,
    currentVersionId,
    versions: [
      ...(oldVersion
        ? [
            {
              id: `${id}-v1`,
              name: name.replace(".pdf", "-previous.pdf"),
              createdAt: "2025-03-10T09:00:00Z",
              status: "reviewed" as const,
            },
          ]
        : []),
      { id: currentVersionId, name, createdAt: "2026-10-14T14:30:00Z", status },
    ],
  };
}
function mark(
  c: Case,
  names: string[],
  status: "completed" | "submitted" | "requested" | "correction" = "completed",
) {
  for (const r of c.requirements)
    if (names.some((n) => r.name.includes(n))) r.status = status;
}
function thread(
  id: string,
  title: string,
  employeeId: string,
  caseId: string,
  body: string,
  at: string,
  audience: Thread["audience"] = "employee",
  unread = true,
): Thread {
  return {
    id,
    title,
    employeeId,
    caseId,
    audience,
    assignee: "Jeffrey Tang",
    unread,
    status: "open",
    messages: [
      {
        id: `${id}-m1`,
        author:
          audience === "employee"
            ? employees.find((e) => e.id === employeeId)!.name
            : "Jeffrey Tang",
        body,
        at,
        audience,
      },
    ],
  };
}
export function createInitialState(): AppState {
  const oldCase = makeCase(
    "assignment-2",
    142,
    "employee-2",
    "Vietnam",
    "Six-month technical engineering placement",
    "Sao Mai Precision Manufacturing",
    "2026-07-01",
    "2026-12-31",
    "work-review",
  );
  oldCase.reviewQuestion =
    "Which work permit or exemption and entry category cover hands-on engineering at the host for six months?";
  oldCase.internalTasks = [
    {
      id: "legacy-task-1",
      name: "Review submitted documents",
      status: "completed",
      legacy: true,
    },
    {
      id: "legacy-task-2",
      name: "Confirm assignment facts",
      status: "completed",
      legacy: true,
    },
    {
      id: "legacy-task-3",
      name: "Confirm outstanding actions",
      status: "requested",
      legacy: true,
    },
  ];
  mark(oldCase, ["Technical duties", "Passport"]);
  const meetings = makeCase(
    "case-vn-meetings",
    143,
    "employee-2",
    "Vietnam",
    "Business meetings · 10 days",
    "Sao Mai Precision Manufacturing",
    "2026-11-09",
    "2026-11-18",
    "vn-dn1",
  );
  meetings.reviewQuestion =
    "Confirm DN1 for meetings only, the host legal entity and the visa collection office. This is separate from Casey’s technical placement.";
  mark(meetings, ["Visa photograph"], "requested");
  const eta = makeCase(
    "case-uk-eta",
    144,
    "employee-4",
    "United Kingdom",
    "Partner meetings",
    "Northstar London office",
    "2026-10-20",
    "2026-10-25",
    "uk-eta",
  );
  eta.routeConfirmed = true;
  mark(eta, [
    "Route and activity",
    "Passport",
    "Face and passport",
    "Email, payment",
    "TripWire application",
    "Official submission",
    "ETA electronic",
  ]);
  eta.submission = {
    reference: "DEMO-ETA-102026-44",
    date: "2026-10-12",
    actor: "Olivia Martinez",
    simulated: true,
  };
  eta.decision = {
    outcome: "Granted",
    date: "2026-10-13",
    actor: "Jeffrey Tang",
    simulated: true,
    reference: "DEMO-ETA-44",
    validFrom: "2026-10-13",
    validUntil: "2028-10-12",
  };
  const visitor = makeCase(
    "case-uk-visitor",
    145,
    "employee-3",
    "United Kingdom",
    "Supplier meetings and contract negotiation",
    "Northstar Manufacturing UK Ltd",
    "2026-10-23",
    "2026-10-30",
    "uk-visitor",
  );
  visitor.routeConfirmed = true;
  mark(visitor, [
    "Route and activity",
    "Passport",
    "Business visit",
    "Host invitation",
    "Funding and employment",
    "TripWire application",
    "Visa-centre",
    "Official submission",
  ]);
  mark(visitor, ["Authority decision"], "submitted");
  visitor.submission = {
    reference: "DEMO-GWF-2026-0145",
    date: "2026-10-05",
    actor: "Maya Patel",
    simulated: true,
  };
  const short = makeCase(
    "case-vn-evisa",
    146,
    "employee-5",
    "Vietnam",
    "Supplier meetings",
    "Lac Viet Components",
    "2026-10-21",
    "2026-10-28",
    "vn-evisa",
  );
  short.routeConfirmed = true;
  mark(short, [
    "Route and activity",
    "Passport",
    "Entry point",
    "TripWire application",
  ]);
  mark(short, ["Portrait"], "correction");
  const dn2 = makeCase(
    "case-vn-dn2",
    147,
    "employee-6",
    "Vietnam",
    "Commercial-presence feasibility meetings",
    "Minh An Industrial Partners",
    "2026-11-15",
    "2026-11-26",
    "vn-dn2",
  );
  mark(dn2, ["Passport"]);
  const amina = makeCase(
    "case-uk-future",
    148,
    "employee-7",
    "United Kingdom",
    "Operations planning meetings",
    "Northstar London office",
    "2026-12-01",
    "2026-12-07",
    "uk-visitor",
  );
  mark(amina, ["Passport"], "requested");
  const prior = makeCase(
    "case-uk-completed",
    149,
    "employee-6",
    "United Kingdom",
    "Quarterly finance review",
    "Northstar London office",
    "2026-09-14",
    "2026-09-18",
    "uk-eta",
  );
  prior.createdAt = "2026-08-25T09:00:00Z";
  prior.routeConfirmed = true;
  prior.requirements.forEach((r) => (r.status = "completed"));
  prior.submission = {
    reference: "DEMO-ETA-2026-0149",
    date: "2026-09-03",
    actor: "Ethan Brooks",
    simulated: true,
  };
  prior.decision = {
    outcome: "Granted",
    date: "2026-09-05",
    actor: "Ethan Brooks",
    simulated: true,
    reference: "DEMO-ETA-0149",
    validFrom: "2026-09-05",
    validUntil: "2028-09-04",
  };
  for (const c of [eta, visitor, short, prior]) {
    const employee = employees.find((e) => e.id === c.employeeId)!;
    const expiry =
      c.employeeId === "employee-4"
        ? "2033-04-19"
        : c.employeeId === "employee-3"
          ? "2031-08-03"
          : c.employeeId === "employee-5"
            ? "2030-06-27"
            : "2029-09-15";
    c.draft = {
      fields: {
        passportName: employee.name,
        nationality: employee.nationality,
        passportNumber: `DEMO-${employee.initials}-${c.caseNumber.slice(-3)}`,
        passportExpiry: expiry,
        applicantEmail: employee.email,
        destination: c.country,
        purpose: c.purpose,
        host: c.host,
        start: c.start,
        end: c.end,
        currentPermission:
          c.country === "Vietnam"
            ? "No current Vietnam entry permission recorded"
            : c.route === "uk-eta"
              ? "No current UK visa or residence permission recorded"
              : "No current UK visitor visa recorded",
      },
      preparedAt:
        c.id === prior.id
          ? "2026-09-01T10:00:00Z"
          : c.id === short.id
            ? "2026-10-15T10:00:00Z"
            : "2026-10-05T10:00:00Z",
    };
    c.intake = {
      nationality: employee.nationality,
      passportNationality: employee.nationality,
      currentPermission: c.draft.fields.currentPermission,
      eligibility:
        c.route === "uk-eta"
          ? "eta"
          : c.route === "uk-visitor"
            ? "visa"
            : "review",
      eligibilityChecked: true,
      activity: "meetings",
      activityDetail: c.purpose,
    };
  }
  const documents: EmployeeDocument[] = [
    document(
      "document-1",
      "employee-2",
      "passport",
      "Casey-Chen-passport.pdf",
      "2032-05-14",
      "reviewed",
      true,
    ),
    document(
      "document-2",
      "employee-2",
      "photo",
      "Casey-Chen-portrait.jpg",
      undefined,
      "correction",
    ),
    document(
      "document-3",
      "employee-2",
      "authorization",
      "Casey-placement-permission-summary.pdf",
      "2027-01-15",
    ),
    document(
      "document-4",
      "employee-2",
      "invitation",
      "Sao-Mai-meeting-invitation.pdf",
    ),
    document(
      "document-5",
      "employee-3",
      "passport",
      "Maya-Patel-passport.pdf",
      "2031-08-03",
    ),
    document(
      "document-6",
      "employee-3",
      "invitation",
      "London-supplier-meeting.pdf",
    ),
    document(
      "document-7",
      "employee-3",
      "other",
      "Maya-employment-confirmation.pdf",
      undefined,
      "submitted",
    ),
    document(
      "document-8",
      "employee-4",
      "passport",
      "Olivia-Martinez-passport.pdf",
      "2033-04-19",
    ),
    document(
      "document-9",
      "employee-4",
      "photo",
      "Olivia-Martinez-portrait.jpg",
    ),
    document(
      "document-10",
      "employee-4",
      "authorization",
      "Olivia-ETA-result.pdf",
      "2028-10-12",
    ),
    document(
      "document-11",
      "employee-5",
      "passport",
      "Daniel-Kim-passport.pdf",
      "2030-06-27",
    ),
    document(
      "document-12",
      "employee-5",
      "photo",
      "Daniel-Kim-portrait.jpg",
      undefined,
      "correction",
      true,
    ),
    document(
      "document-13",
      "employee-6",
      "passport",
      "Ethan-Brooks-passport.pdf",
      "2029-09-15",
    ),
    document("document-14", "employee-6", "photo", "Ethan-Brooks-portrait.jpg"),
    document(
      "document-15",
      "employee-7",
      "passport",
      "Amina-Hassan-passport.pdf",
      "2026-09-30",
    ),
    document(
      "document-16",
      "employee-7",
      "photo",
      "Amina-Hassan-portrait.jpg",
      undefined,
      "submitted",
    ),
    document(
      "document-17",
      "employee-6",
      "authorization",
      "Ethan-ETA-result.pdf",
      "2028-09-04",
    ),
  ];
  // Preserve factual linked versions in already-reviewed cases; meeting case invites explicit reuse.
  for (const c of [oldCase, eta, visitor, short, dn2, prior])
    for (const r of c.requirements) {
      const doc = documents.find(
        (d) =>
          d.employeeId === c.employeeId &&
          d.type === r.documentType &&
          d.status === "reviewed",
      );
      if (doc && r.status === "completed" && r.documentType) {
        r.documentId = doc.id;
        r.versionId = doc.currentVersionId;
      }
    }
  const threads: Thread[] = [
    thread(
      "thread-passport",
      "Which passport page do you need?",
      "employee-2",
      meetings.id,
      "Should I upload just the photo page, or every stamped page as well? My passport on file is still current.",
      "2026-10-20T08:35:00Z",
    ),
    thread(
      "thread-photo",
      "Replacing my portrait photo",
      "employee-5",
      short.id,
      "I can retake the photo this morning. Does the replacement need a plain white background, and where do I upload it?",
      "2026-10-20T09:15:00Z",
    ),
    thread(
      "thread-dates",
      "Can my meeting dates change?",
      "employee-7",
      amina.id,
      "The London team may move our meetings by two days. Should I wait before you prepare the application summary?",
      "2026-10-19T16:05:00Z",
    ),
    thread(
      "thread-invitation",
      "Who supplies the host invitation?",
      "employee-6",
      dn2.id,
      "Will Minh An send the invitation directly to you, or should I request it from our local contact?",
      "2026-10-19T14:40:00Z",
      "employee",
      false,
    ),
    thread(
      "thread-airport",
      "Airport document check — need assistance",
      "employee-4",
      eta.id,
      "The check-in agent is asking which passport my ETA is linked to. I am at SFO Terminal G, and have my traveling passport with me. Can you help me locate the recorded details?",
      "2026-10-20T09:32:00Z",
    ),
    thread(
      "thread-internal-casey",
      "Casey placement: work-route assessment",
      "employee-2",
      oldCase.id,
      "The six-month placement includes hands-on line commissioning. Keep this separate from November meeting preparation; confirm the work permit/exemption with the host before changing the route.",
      "2026-10-19T11:10:00Z",
      "internal",
      false,
    ),
    thread(
      "thread-internal-dn2",
      "Confirm DN2 activity basis with host",
      "employee-6",
      dn2.id,
      "Ask Minh An whether the activities are commercial-presence work or ordinary meetings before confirming DN2. Do not request a signed sponsor form until that question is resolved.",
      "2026-10-20T08:00:00Z",
      "internal",
      false,
    ),
  ];
  return {
    version: 3,
    clock: DEMO_CLOCK,
    profile: { id: "admin-1", name: "Jeffrey Tang", initials: "JT" },
    counters: { employee: 74, case: 149, document: 17 },
    employees: structuredClone(employees),
    cases: [meetings, oldCase, eta, visitor, short, dn2, amina, prior],
    documents,
    threads,
    incidents: [
      {
        id: "incident-airport",
        title: "Passport-linked ETA record needed at airport",
        reason:
          "Employee-reported airport document issue in thread-airport; carrier document check is ongoing.",
        employeeId: "employee-4",
        caseId: eta.id,
        threadId: "thread-airport",
        location: "SFO · Terminal G",
        timezone: "America/Los_Angeles",
        departure: "2026-10-20T13:15:00Z",
        severity: "critical",
        status: "open",
        assignee: "Jeffrey Tang",
        createdAt: "2026-10-20T09:32:00Z",
        notes: [
          {
            text: "Employee has asked for the recorded passport/ETA details. Airline acceptance and border decisions remain external.",
            at: "2026-10-20T09:35:00Z",
            actor: "Jeffrey Tang",
          },
        ],
        documentIds: ["document-8", "document-10"],
      },
      {
        id: "incident-photo",
        title: "Portrait correction before tomorrow’s departure",
        reason:
          "Required e-visa portrait has a correction request; recorded flight is within 24 hours and the authority result has not been recorded.",
        employeeId: "employee-5",
        caseId: short.id,
        threadId: "thread-photo",
        location: "Seoul · ICN",
        timezone: "Asia/Seoul",
        departure: "2026-10-21T07:40:00Z",
        severity: "high",
        status: "acknowledged",
        assignee: "Jeffrey Tang",
        createdAt: "2026-10-20T08:10:00Z",
        notes: [
          {
            text: "Requested a new portrait and confirmation of current application status. Do not promise a decision before departure.",
            at: "2026-10-20T08:20:00Z",
            actor: "Jeffrey Tang",
          },
        ],
        documentIds: ["document-12"],
      },
    ],
    trips: [
      {
        id: "trip-casey-work",
        employeeId: "employee-2",
        caseId: oldCase.id,
        country: "Vietnam",
        plannedEntry: "2026-07-01",
        plannedExit: "2026-12-31",
        actualEntry: "2026-07-02",
        approvedReturn: "2026-10-18",
        permissionExpiry: "2027-01-15",
        cancelled: false,
        dailyBudget: 95,
        currency: "USD",
      },
      {
        id: "trip-casey-meetings",
        employeeId: "employee-2",
        caseId: meetings.id,
        country: "Vietnam",
        plannedEntry: meetings.start,
        plannedExit: meetings.end,
        approvedReturn: meetings.end,
        cancelled: false,
      },
      {
        id: "trip-olivia",
        employeeId: "employee-4",
        caseId: eta.id,
        country: "United Kingdom",
        plannedEntry: eta.start,
        plannedExit: eta.end,
        approvedReturn: eta.end,
        permissionExpiry: "2028-10-12",
        cancelled: false,
        dailyBudget: 160,
        currency: "GBP",
      },
      {
        id: "trip-maya",
        employeeId: "employee-3",
        caseId: visitor.id,
        country: "United Kingdom",
        plannedEntry: visitor.start,
        plannedExit: visitor.end,
        approvedReturn: visitor.end,
        cancelled: false,
      },
      {
        id: "trip-daniel",
        employeeId: "employee-5",
        caseId: short.id,
        country: "Vietnam",
        plannedEntry: short.start,
        plannedExit: short.end,
        approvedReturn: short.end,
        cancelled: false,
      },
      {
        id: "trip-ethan-future",
        employeeId: "employee-6",
        caseId: dn2.id,
        country: "Vietnam",
        plannedEntry: dn2.start,
        plannedExit: dn2.end,
        approvedReturn: dn2.end,
        cancelled: false,
      },
      {
        id: "trip-amina",
        employeeId: "employee-7",
        caseId: amina.id,
        country: "United Kingdom",
        plannedEntry: amina.start,
        plannedExit: amina.end,
        approvedReturn: amina.end,
        cancelled: false,
      },
      {
        id: "trip-ethan-sep",
        employeeId: "employee-6",
        caseId: prior.id,
        country: "United Kingdom",
        plannedEntry: prior.start,
        plannedExit: prior.end,
        actualEntry: "2026-09-14",
        actualExit: "2026-09-18",
        approvedReturn: "2026-09-18",
        permissionExpiry: "2028-09-04",
        cancelled: false,
      },
      {
        id: "trip-daniel-overlap-1",
        employeeId: "employee-5",
        caseId: short.id,
        country: "Vietnam",
        plannedEntry: "2026-02-01",
        plannedExit: "2026-02-05",
        actualEntry: "2026-02-01",
        actualExit: "2026-02-05",
        approvedReturn: "2026-02-05",
        cancelled: false,
      },
      {
        id: "trip-daniel-overlap-2",
        employeeId: "employee-5",
        caseId: short.id,
        country: "Vietnam",
        plannedEntry: "2026-02-04",
        plannedExit: "2026-02-07",
        actualEntry: "2026-02-04",
        actualExit: "2026-02-07",
        approvedReturn: "2026-02-07",
        cancelled: false,
      },
      {
        id: "trip-daniel-transition",
        employeeId: "employee-5",
        caseId: short.id,
        country: "United Kingdom",
        plannedEntry: "2026-02-07",
        plannedExit: "2026-02-09",
        actualEntry: "2026-02-07",
        actualExit: "2026-02-09",
        approvedReturn: "2026-02-09",
        cancelled: false,
      },
      {
        id: "trip-amina-year-boundary",
        employeeId: "employee-7",
        caseId: amina.id,
        country: "United Kingdom",
        plannedEntry: "2025-12-29",
        plannedExit: "2026-01-03",
        actualEntry: "2025-12-29",
        actualExit: "2026-01-03",
        approvedReturn: "2026-01-03",
        cancelled: false,
      },
      {
        id: "trip-maya-open",
        employeeId: "employee-3",
        caseId: visitor.id,
        country: "Vietnam",
        plannedEntry: "2026-10-12",
        plannedExit: "2026-10-22",
        actualEntry: "2026-10-12",
        approvedReturn: "2026-10-22",
        permissionExpiry: "2026-11-15",
        cancelled: false,
        dailyBudget: 80,
        currency: "USD",
      },
      {
        id: "trip-amina-cancelled",
        employeeId: "employee-7",
        caseId: amina.id,
        country: "Vietnam",
        plannedEntry: "2026-08-01",
        plannedExit: "2026-08-30",
        approvedReturn: "2026-08-30",
        cancelled: true,
      },
    ],
    history: [
      {
        id: "history-1",
        caseId: meetings.id,
        message:
          "Created a separate 10-day Vietnam meeting case; the technical placement remains on its work-assessment track.",
        at: "2026-10-18T09:10:00Z",
        actor: "Jeffrey Tang",
      },
      {
        id: "history-2",
        caseId: oldCase.id,
        message:
          "Recorded technical placement scope and retained earlier internal preparation tasks.",
        at: "2026-10-01T11:30:00Z",
        actor: "Jeffrey Tang",
      },
      {
        id: "history-3",
        caseId: eta.id,
        message:
          "Recorded an ETA result through explicit demo controls; no official application was sent by TripWire.",
        at: "2026-10-13T13:45:00Z",
        actor: "Jeffrey Tang",
      },
      {
        id: "history-4",
        caseId: short.id,
        message:
          "Requested portrait correction: full face and plain background to current portal specifications.",
        at: "2026-10-19T15:20:00Z",
        actor: "Jeffrey Tang",
      },
    ],
    notifications: [
      {
        id: "notification-1",
        title:
          "Daniel’s departure is within 24 hours; portrait correction remains open.",
        read: false,
        to: "/urgent",
      },
      {
        id: "notification-2",
        title: "Maya’s employment evidence is ready for review.",
        read: false,
        to: "/documents",
      },
      {
        id: "notification-3",
        title: "Casey’s November meeting case has been created.",
        read: true,
        to: "/cases/case-vn-meetings",
      },
    ],
    migrationLog: [
      "Workspace schema v3: separate case requirements, document versions and internal preparation tasks.",
    ],
  };
}
