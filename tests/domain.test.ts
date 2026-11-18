import { describe, expect, it } from "vitest";
import {
  actualDays,
  daysInclusive,
  plannedDays,
  returnStatus,
  unionDays,
} from "../src/domain/dates";
import { createInitialState } from "../src/domain/fixtures";
import {
  compatibleDocument,
  createCase,
  createEmployee,
  linkDocument,
  replaceDocument,
} from "../src/domain/operations";
import {
  loadWorkspace,
  migrateState,
  STORAGE_KEY,
} from "../src/domain/migration";
import { makeRequirements } from "../src/domain/templates";
import type { Trip } from "../src/domain/types";

const trip = (fields: Partial<Trip> = {}): Trip => ({
  id: "t",
  employeeId: "e",
  caseId: "c",
  country: "Vietnam",
  plannedEntry: "2026-01-01",
  plannedExit: "2026-01-03",
  approvedReturn: "2026-01-03",
  cancelled: false,
  ...fields,
});
describe("calendar reporting", () => {
  it("counts inclusively, merges overlap and clips physical presence at clock/year", () => {
    expect(daysInclusive("2026-01-01", "2026-01-03")).toBe(3);
    expect(daysInclusive("2026-01-03", "2026-01-01")).toBe(0);
    expect(
      unionDays([
        { start: "2026-01-01", end: "2026-01-03" },
        { start: "2026-01-03", end: "2026-01-05" },
      ]),
    ).toBe(5);
    expect(
      actualDays(
        [
          trip({ actualEntry: "2025-12-30", actualExit: "2026-01-02" }),
          trip({
            id: "b",
            country: "United Kingdom",
            actualEntry: "2026-01-02",
            actualExit: "2026-01-04",
          }),
          trip({ id: "c", actualEntry: "2026-10-19" }),
          trip({
            id: "d",
            actualEntry: "2026-02-01",
            actualExit: "2026-02-10",
            cancelled: true,
          }),
        ],
        "2026-10-20T10:00:00Z",
        2026,
      ),
    ).toBe(6);
  });
  it("keeps planned movement separate and compares only company-approved return dates", () => {
    expect(
      plannedDays([
        trip(),
        trip({
          id: "b",
          plannedEntry: "2026-01-03",
          plannedExit: "2026-01-05",
        }),
        trip({ id: "cancel", cancelled: true }),
      ]),
    ).toBe(5);
    expect(actualDays([trip()], "2026-10-20T10:00:00Z")).toBe(0);
    expect(
      returnStatus(
        trip({
          actualEntry: "2026-10-01",
          approvedReturn: "2026-10-19",
          permissionExpiry: "2027-01-01",
        }),
        "2026-10-20",
      ),
    ).toBe("past");
    expect(
      returnStatus(trip({ approvedReturn: "2026-10-22" }), "2026-10-20"),
    ).toBe("approaching");
    expect(
      returnStatus(
        trip({ actualExit: "2026-10-18", approvedReturn: "2026-10-19" }),
        "2026-10-20",
      ),
    ).toBe("within");
  });
});
describe("case/document operations", () => {
  it("uses distinct route templates and preserves Casey technical work", () => {
    const state = createInitialState();
    expect(state.cases.find((c) => c.id === "assignment-2")?.route).toBe(
      "work-review",
    );
    expect(
      state.cases
        .find((c) => c.id === "assignment-2")
        ?.internalTasks.some((t) => t.legacy),
    ).toBe(true);
    expect(state.cases.find((c) => c.id === "case-vn-meetings")?.route).toBe(
      "vn-dn1",
    );
    expect(makeRequirements("review", "2026-99-99").every((r) => !r.due)).toBe(
      true,
    );
    expect(
      makeRequirements("uk-eta", "2026-11-01").some((r) =>
        r.name.toLowerCase().includes("sticker"),
      ),
    ).toBe(false);
    expect(
      makeRequirements("vn-evisa", "2026-11-01").some((r) =>
        r.name.includes("NA2"),
      ),
    ).toBe(false);
    expect(
      makeRequirements("vn-dn1", "2026-11-01").map((r) => r.name),
    ).not.toEqual(makeRequirements("vn-dn2", "2026-11-01").map((r) => r.name));
  });
  it("reuses only the current reviewed compatible version; replacement invalidates linked uses", () => {
    const s = createInitialState(),
      c = s.cases.find((c) => c.id === "case-vn-meetings")!,
      d = s.documents.find(
        (d) => d.employeeId === c.employeeId && d.type === "passport",
      )!;
    const r = c.requirements.find((r) => r.documentType === "passport")!;
    expect(compatibleDocument(d, c)).toBe(true);
    linkDocument(s, c.id, r.id, d.id);
    const linkedVersion = r.versionId;
    expect(r.status).toBe("completed");
    replaceDocument(s, d.id, "Casey-passport-replacement.pdf", "2035-01-01");
    expect(d.currentVersionId).not.toBe(linkedVersion);
    expect(d.versions.some((v) => v.id === linkedVersion)).toBe(true);
    expect(r.status).toBe("correction");
    expect(r.versionId).toBe(linkedVersion);
    expect(compatibleDocument(d, c)).toBe(false);
  });
  it("requires passport expiry and route validity, stable unique IDs survive deletion", () => {
    const s = createInitialState(),
      c = s.cases.find((c) => c.id === "case-vn-meetings")!,
      d = s.documents.find(
        (d) => d.employeeId === c.employeeId && d.type === "passport",
      )!;
    expect(compatibleDocument({ ...d, expiry: undefined }, c)).toBe(false);
    expect(compatibleDocument({ ...d, expiry: "2026-11-25" }, c)).toBe(false);
    const created = createEmployee(s, {
      name: "Jordan Lane",
      email: "jordan@northstar.example",
      department: "Operations",
      homeOffice: "Austin",
      nationality: "United States",
    });
    s.employees.splice(s.employees.indexOf(created), 1);
    const next = createEmployee(s, {
      name: "Jamie Lane",
      email: "jamie@northstar.example",
      department: "Operations",
      homeOffice: "Austin",
      nationality: "United States",
    });
    expect(next.employeeNumber).not.toBe(created.employeeNumber);
    const input = {
      employeeId: c.employeeId,
      country: "Vietnam",
      purpose: "Business meetings",
      host: "Sao Mai",
      start: "2026-11-01",
      end: "2026-11-10",
      route: "vn-dn1" as const,
    };
    const a = createCase(s, input),
      b = createCase(s, input);
    expect(a.id).not.toBe(b.id);
    expect(a.caseNumber).not.toBe(b.caseNumber);
  });
  it("requires a new passport assessment without erasing the recorded authority result", () => {
    const state = createInitialState();
    const c = state.cases.find((item) => item.id === "case-uk-completed")!;
    const passport = state.documents.find((item) => item.id === "document-13")!;
    const previousVersion = passport.currentVersionId;
    const previousDecision = structuredClone(c.decision!);
    const previousFields = structuredClone(c.draft!.fields);
    const unrelated = structuredClone(
      state.cases.find((item) => item.id === "case-uk-eta")!,
    );

    replaceDocument(state, passport.id, "Ethan-new-passport.pdf", "2035-01-01");

    expect(c.decision).toMatchObject({
      ...previousDecision,
      needsRevalidation: true,
      passportVersionId: previousVersion,
    });
    expect(c.draft).toMatchObject({
      fields: previousFields,
      needsReview: true,
    });
    expect(c.routeConfirmed).toBe(false);
    expect(
      c.requirements
        .filter(
          (item) =>
            ["preparation", "decision", "departure"].includes(item.stage) &&
            item.status !== "na",
        )
        .every((item) => item.status === "correction"),
    ).toBe(true);
    expect(
      c.requirements.find((item) => item.documentType === "passport"),
    ).toMatchObject({ status: "correction", versionId: previousVersion });
    expect(state.cases.find((item) => item.id === unrelated.id)).toEqual(
      unrelated,
    );
    expect(
      state.history.some(
        (event) =>
          event.caseId === c.id &&
          event.message.includes(previousDecision.reference) &&
          event.message.includes("passport"),
      ),
    ).toBe(true);
    const restored = migrateState(state);
    expect(restored.cases.find((item) => item.id === c.id)?.decision).toEqual(
      c.decision,
    );
    expect(migrateState(restored)).toEqual(restored);
  });
  it("does not reuse a company authorization as a signed sponsor request or authority approval", () => {
    const state = createInitialState();
    const c = state.cases.find((item) => item.id === "case-vn-meetings")!;
    const document = state.documents.find((item) => item.id === "document-3")!;
    const setup = c.requirements.find(
      (item) => item.name === "Company authorization / sponsor setup",
    )!;
    const request = c.requirements.find(
      (item) => item.name === "Signed / submitted sponsor request record",
    )!;
    const approval = c.requirements.find(
      (item) => item.name === "Returned sponsor entry approval",
    )!;
    Object.assign(setup, {
      documentId: document.id,
      versionId: document.currentVersionId,
      status: "completed",
    });

    expect(compatibleDocument(document, c)).toBe(false);
    expect(() => linkDocument(state, c.id, request.id, document.id)).toThrow(
      "needs review",
    );
    expect(() => linkDocument(state, c.id, approval.id, document.id)).toThrow(
      "needs review",
    );
    expect(request.status).toBe("todo");
    expect(approval.status).toBe("todo");
    const restored = migrateState(state);
    expect(
      restored.cases
        .find((item) => item.id === c.id)
        ?.requirements.find((item) => item.id === setup.id)?.status,
    ).toBe("completed");
  });
});
describe("safe migration", () => {
  it("preserves record IDs, custom requirements, messages and historical versions during version upgrades", () => {
    const s = createInitialState();
    s.version = 1;
    s.cases[0].templateVersion = 1;
    s.cases[0].requirements.push({
      id: "custom-r",
      name: "Client invitation attachment",
      instruction: "Confirm reception",
      kind: "conditional",
      party: "host",
      assignee: "Host",
      status: "completed",
      stage: "documents",
    });
    const updated = migrateState(s);
    expect(updated.version).toBe(3);
    expect(updated.cases[0].id).toBe(s.cases[0].id);
    expect(
      updated.cases[0].requirements.find((r) => r.id === "custom-r")?.status,
    ).toBe("completed");
    expect(updated.documents[0].versions).toEqual(s.documents[0].versions);
    expect(updated.threads).toEqual(s.threads);
    expect(migrateState(updated)).toEqual(updated);
  });
  it("moves genuine legacy generic tasks out of the named-document checklist without deleting them", () => {
    const s = createInitialState();
    s.version = 1;
    s.cases[0].templateVersion = 0;
    s.cases[0].requirements.push({
      id: "legacy-facts",
      name: "Confirm assignment facts",
      instruction: "Check dates",
      kind: "required",
      party: "hr",
      assignee: "Avery Morgan",
      status: "completed",
      stage: "preparation",
    });
    const migrated = migrateState(s);
    expect(
      migrated.cases[0].requirements.some((r) => r.id === "legacy-facts"),
    ).toBe(false);
    expect(
      migrated.cases[0].internalTasks.find((t) => t.id === "legacy-facts"),
    ).toMatchObject({ status: "completed", legacy: true });
  });

  it("keeps configured admin IDs and unique display numbers while correcting profile labels", () => {
    const s = createInitialState();
    s.version = 1;
    s.profile = {
      id: "retained-admin-id",
      name: "Avery Morgan",
      initials: "AM",
    };
    s.employees[1].employeeNumber = s.employees[0].employeeNumber;
    const migrated = migrateState(s);
    expect(migrated.profile).toEqual({
      id: "retained-admin-id",
      name: "Jeffrey Tang",
      initials: "JT",
    });
    expect(new Set(migrated.employees.map((e) => e.employeeNumber)).size).toBe(
      migrated.employees.length,
    );
    const highest = migrated.counters.employee;
    const next = createEmployee(migrated, {
      name: "New Employee",
      email: "new@northstar.example",
      department: "Operations",
      homeOffice: "Austin",
      nationality: "United States",
    });
    expect(Number(next.employeeNumber.slice(-6))).toBeGreaterThan(highest);
  });
  it("retains unreadable input when quarantine storage is unavailable, and never downgrades newer schemas", () => {
    let original = "not json";
    const blocked = {
      getItem: (key: string) => (key === STORAGE_KEY ? original : null),
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        original = "";
      },
    };
    const recovered = loadWorkspace(blocked);
    expect(original).toBe("not json");
    expect(recovered.migrationLog.at(-1)).toContain("persistence is paused");
    expect(() =>
      migrateState({ ...createInitialState(), version: 99 }),
    ).toThrow("newer application");
  });

  it("quarantines malformed persistent storage and recovers a usable workspace", () => {
    const entries = new Map([[STORAGE_KEY, '{"bad":']]);
    const storage = {
      getItem: (k: string) => entries.get(k) ?? null,
      setItem: (k: string, v: string) => {
        entries.set(k, v);
      },
      removeItem: (k: string) => {
        entries.delete(k);
      },
    };
    const recovered = loadWorkspace(storage);
    expect(recovered.cases.length).toBeGreaterThan(0);
    expect(
      [...entries].some(
        ([k, v]) =>
          k.startsWith(`${STORAGE_KEY}.quarantine.`) && v === '{"bad":',
      ),
    ).toBe(true);
    expect(
      recovered.migrationLog.some((x) => x.toLowerCase().includes("quarantin")),
    ).toBe(true);
  });
  it.each([
    ["threads", "messages", undefined],
    [
      "threads",
      "messages",
      [
        {
          id: "bad-message",
          author: "Employee",
          body: 123,
          at: "2026-10-20T10:00:00Z",
          audience: "employee",
        },
      ],
    ],
    [
      "threads",
      "messages",
      [
        {
          id: "bad-message",
          author: "Employee",
          body: "Question",
          at: "2026-10-20T10:00:00Z",
          audience: "public",
        },
      ],
    ],
    ["incidents", "notes", undefined],
    [
      "incidents",
      "notes",
      [{ text: "Incident note", at: "2026-10-20T10:00:00Z", actor: 123 }],
    ],
    [
      "incidents",
      "notes",
      [{ text: "Incident note", at: "invalid date", actor: "Jeffrey Tang" }],
    ],
    ["incidents", "documentIds", undefined],
  ] as const)(
    "quarantines malformed nested %s.%s without overwriting the stored input",
    (collection, field, badValue) => {
      const state = createInitialState();
      (state[collection] as unknown as Record<string, unknown>[])[0][field] =
        badValue;
      const raw = JSON.stringify(state);
      const entries = new Map([[STORAGE_KEY, raw]]);
      const storage = {
        getItem: (key: string) => entries.get(key) ?? null,
        setItem: (key: string, value: string) => {
          entries.set(key, value);
        },
        removeItem: (key: string) => {
          entries.delete(key);
        },
      };

      expect(() => migrateState(state)).toThrow();
      const recovered = loadWorkspace(storage);
      expect(
        [...entries].some(
          ([key, value]) =>
            key.startsWith(`${STORAGE_KEY}.quarantine.`) && value === raw,
        ),
      ).toBe(true);
      expect(
        recovered.threads.every((thread) => Array.isArray(thread.messages)),
      ).toBe(true);
      expect(
        recovered.incidents.every((incident) => Array.isArray(incident.notes)),
      ).toBe(true);
    },
  );
});
