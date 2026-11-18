import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe2,
  MapPin,
  Plane,
  SlidersHorizontal,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { useApp } from "../store";
import type { Trip } from "../domain/types";
import {
  actualDays,
  dateOnly,
  daysInclusive,
  formatDate,
  inWindow,
  plannedDays,
  returnStatus,
} from "../domain/dates";
import { addHistory } from "../domain/operations";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Info,
  Modal,
  PageHeading,
} from "../components/ui";

const statusLabels = {
  within: "Within approved dates",
  approaching: "Approaching approved return",
  past: "Past approved return date",
} as const;
const addDay = (date: string) => {
  const value = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
};
const previousDay = (date: string) => {
  const value = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
};
const later = (a: string, b: string) => (a > b ? a : b);
function presence(trip: Trip, today: string) {
  if (trip.cancelled) return "cancelled";
  if (
    trip.actualEntry &&
    trip.actualEntry <= today &&
    (!trip.actualExit || trip.actualExit > today)
  )
    return "abroad";
  if (trip.actualExit && trip.actualExit <= today) return "returned";
  return "upcoming";
}
function extraDays(trip: Trip, today: string) {
  if (trip.cancelled || !trip.actualEntry) return 0;
  const end =
    trip.actualExit && trip.actualExit < today ? trip.actualExit : today;
  const start = later(trip.actualEntry, addDay(trip.approvedReturn));
  return end >= start ? daysInclusive(start, end) : 0;
}
function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function TravelPage() {
  const { state, update } = useApp();
  const [params] = useSearchParams();
  const [country, setCountry] = useState(params.get("country") || "all");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState(params.get("status") || "all");
  const [window, setWindow] = useState(
    params.get("from") || params.get("through") ? "plannedEntryRange" : "all",
  );
  const [rangeStart, setRangeStart] = useState(
    dateOnly(params.get("from") || ""),
  );
  const [rangeEnd, setRangeEnd] = useState(
    dateOnly(params.get("through") || "")
      ? previousDay(params.get("through")!)
      : "",
  );
  const [editing, setEditing] = useState<Trip | null>(null);
  const [extending, setExtending] = useState<Trip | null>(null);
  const today = dateOnly(state.clock);
  const year = Number(today.slice(0, 4));
  const activeTrips = state.trips.filter((trip) => !trip.cancelled);
  const abroadCount = new Set(
    activeTrips
      .filter((trip) => presence(trip, today) === "abroad")
      .map((trip) => trip.employeeId),
  ).size;
  const upcomingCount = activeTrips.filter(
    (trip) => !trip.actualEntry && inWindow(trip.plannedEntry, state.clock, 30),
  ).length;
  const returnCount = activeTrips.filter(
    (trip) =>
      presence(trip, today) === "abroad" &&
      inWindow(trip.plannedExit, state.clock, 30),
  ).length;
  const actualYtd = state.employees.reduce(
    (total, employee) =>
      total +
      actualDays(
        activeTrips.filter((trip) => trip.employeeId === employee.id),
        state.clock,
        year,
      ),
    0,
  );
  const visible = useMemo(
    () =>
      state.trips
        .filter((trip) => {
          const employee = state.employees.find(
            (item) => item.id === trip.employeeId,
          );
          if (country !== "all" && trip.country !== country) return false;
          if (department !== "all" && employee?.department !== department)
            return false;
          if (
            status === "past" ||
            status === "approaching" ||
            status === "within"
          ) {
            if (trip.cancelled || returnStatus(trip, state.clock) !== status)
              return false;
          } else if (status !== "all" && presence(trip, today) !== status)
            return false;
          if (status !== "cancelled" && trip.cancelled) return false;
          if (
            window.startsWith("entry") &&
            !inWindow(
              trip.actualEntry || trip.plannedEntry,
              state.clock,
              Number(window.slice(5)),
            )
          )
            return false;
          if (
            window.startsWith("exit") &&
            !inWindow(
              trip.actualExit || trip.plannedExit,
              state.clock,
              Number(window.slice(4)),
            )
          )
            return false;
          if (
            window === "plannedEntryRange" &&
            ((rangeStart && trip.plannedEntry < rangeStart) ||
              (rangeEnd && trip.plannedEntry > rangeEnd))
          )
            return false;
          if (window === "custom") {
            const entry = trip.actualEntry || trip.plannedEntry;
            const exit = trip.actualExit || trip.plannedExit;
            if (
              (rangeStart && exit < rangeStart) ||
              (rangeEnd && entry > rangeEnd)
            )
              return false;
          }
          return true;
        })
        .sort(
          (a, b) =>
            a.country.localeCompare(b.country) ||
            a.plannedEntry.localeCompare(b.plannedEntry),
        ),
    [state, country, department, status, window, rangeStart, rangeEnd, today],
  );
  const countries = Array.from(
    new Set(state.trips.map((trip) => trip.country)),
  ).sort();
  const departments = Array.from(
    new Set(state.employees.map((employee) => employee.department)),
  ).sort();
  const groups = Array.from(new Set(visible.map((trip) => trip.country)));
  const filtersActive =
    country !== "all" ||
    department !== "all" ||
    status !== "all" ||
    window !== "all";

  return (
    <>
      <PageHeading
        eyebrow="PEOPLE & MOVEMENT"
        title="Travel"
        description="A clear view of who's away, what's coming up, and time abroad."
        action={
          <Badge tone="purple">
            <CalendarDays size={13} />
            As of {formatDate(today)}
          </Badge>
        }
      />
      <div className="metric-grid">
        <Card>
          <div className="metric-top">
            <span>Employees abroad</span>
            <Globe2 size={19} />
          </div>
          <div className="metric-value">{abroadCount}</div>
          <div className="metric-footer">Recorded entries · open stays</div>
        </Card>
        <Card>
          <div className="metric-top">
            <span>Departures coming up</span>
            <Plane size={19} />
          </div>
          <div className="metric-value">{upcomingCount}</div>
          <div className="metric-footer">In the next 30 days</div>
        </Card>
        <Card>
          <div className="metric-top">
            <span>Upcoming returns</span>
            <ArrowDownLeft size={19} />
          </div>
          <div className="metric-value">{returnCount}</div>
          <div className="metric-footer">Planned in the next 30 days</div>
        </Card>
        <Card>
          <div className="metric-top">
            <span>
              Actual days abroad YTD{" "}
              <Info label="How actual days abroad are counted">
                Total employee-days in {year}. Entry and exit dates count
                inclusively. Each employee's overlapping stays and country
                transitions are counted once; open stays stop at the demo date.
                Cancelled trips are excluded. This is a reporting convention,
                not tax advice.
              </Info>
            </span>
            <CalendarDays size={19} />
          </div>
          <div className="metric-value">{actualYtd.toLocaleString()}</div>
          <div className="metric-footer">Recorded employee-days · {year}</div>
        </Card>
      </div>
      <Card className="travel-filter-card">
        <div className="section-heading">
          <div>
            <h2>Travel overview</h2>
            <p className="muted">
              Plan around people, destinations and company-approved dates.
            </p>
          </div>
          <SlidersHorizontal size={19} />
        </div>
        <div className="toolbar travel-filters">
          <Field label="Country">
            <select
              aria-label="Country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              <option value="all">All countries</option>
              {countries.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Department">
            <select
              aria-label="Department"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <option value="all">All departments</option>
              {departments.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              aria-label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All active travel</option>
              <option value="abroad">Currently abroad</option>
              <option value="upcoming">Upcoming</option>
              <option value="returned">Returned</option>
              <option value="within">Within approved dates</option>
              <option value="approaching">Approaching approved return</option>
              <option value="past">Past approved return date</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
          <Field label="Date window">
            <select
              aria-label="Date window"
              value={window}
              onChange={(event) => setWindow(event.target.value)}
            >
              <option value="all">All dates</option>
              {[30, 90, 180].map((days) => (
                <option key={`entry${days}`} value={`entry${days}`}>
                  Entry in next {days} days
                </option>
              ))}
              {[30, 90, 180].map((days) => (
                <option key={`exit${days}`} value={`exit${days}`}>
                  Exit in next {days} days
                </option>
              ))}
              <option value="custom">Custom travel range</option>
              <option value="plannedEntryRange">
                Custom planned entry range
              </option>
            </select>
          </Field>
          {filtersActive && (
            <Button
              variant="ghost"
              onClick={() => {
                setCountry("all");
                setDepartment("all");
                setStatus("all");
                setWindow("all");
                setRangeStart("");
                setRangeEnd("");
              }}
            >
              Reset
            </Button>
          )}
        </div>
        {(window === "custom" || window === "plannedEntryRange") && (
          <div className="toolbar">
            <Field label="From">
              <input
                type="date"
                value={rangeStart}
                max={rangeEnd || undefined}
                onChange={(event) => setRangeStart(event.target.value)}
              />
            </Field>
            <Field label="To">
              <input
                type="date"
                value={rangeEnd}
                min={rangeStart || undefined}
                onChange={(event) => setRangeEnd(event.target.value)}
              />
            </Field>
            <span className="muted">
              {window === "plannedEntryRange"
                ? "Includes planned entries within these dates."
                : "Includes stays that overlap these dates."}
            </span>
          </div>
        )}
      </Card>
      {!visible.length && (
        <Card>
          <Empty title="No travel matches these filters">
            Try a different destination, status or date window.
          </Empty>
        </Card>
      )}
      {groups.map((destination) => {
        const trips = visible.filter((trip) => trip.country === destination);
        const recorded = state.employees.reduce(
          (sum, employee) =>
            sum +
            actualDays(
              trips.filter((trip) => trip.employeeId === employee.id),
              state.clock,
              year,
            ),
          0,
        );
        return (
          <Card className="country-travel-card" key={destination}>
            <div className="section-heading">
              <div className="country-title">
                <span className="country-icon">
                  <MapPin size={20} />
                </span>
                <div>
                  <h2>{destination}</h2>
                  <span className="muted">
                    {trips.length} {trips.length === 1 ? "trip" : "trips"} ·{" "}
                    {recorded} actual employee-days YTD
                  </span>
                </div>
              </div>
              <Badge>
                {new Set(trips.map((trip) => trip.employeeId)).size} employees
              </Badge>
            </div>
            <div className="table-wrap">
              <table className="data-table travel-table">
                <thead>
                  <tr>
                    <th>Employee / case</th>
                    <th>Travel dates</th>
                    <th>Time abroad</th>
                    <th>Company-approved return</th>
                    <th>Permission expiry</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => {
                    const employee = state.employees.find(
                      (item) => item.id === trip.employeeId,
                    );
                    const caseItem = state.cases.find(
                      (item) => item.id === trip.caseId,
                    );
                    const progress = returnStatus(trip, state.clock);
                    const statusIcon =
                      progress === "past" ? (
                        <AlertCircle size={12} />
                      ) : progress === "approaching" ? (
                        <Clock3 size={12} />
                      ) : (
                        <CheckCircle2 size={12} />
                      );
                    const extra = extraDays(trip, today);
                    const actual = actualDays([trip], state.clock);
                    return (
                      <tr key={trip.id}>
                        <td>
                          <div className="person-cell">
                            {employee && (
                              <Avatar employee={employee} size="sm" />
                            )}
                            <div>
                              <Link
                                className="name-link"
                                to={`/employees/${trip.employeeId}`}
                              >
                                {employee?.name || "Employee record"}
                              </Link>
                              <Link
                                className="table-subtext text-link"
                                to={`/cases/${trip.caseId}`}
                              >
                                {caseItem?.caseNumber || "Open case"}
                                <ArrowUpRight size={11} />
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            {formatDate(trip.actualEntry || trip.plannedEntry)}{" "}
                            – {formatDate(trip.actualExit || trip.plannedExit)}
                          </div>
                          <span className="table-subtext">
                            {presence(trip, today) === "abroad"
                              ? "Currently abroad · actual entry"
                              : presence(trip, today) === "returned"
                                ? "Returned · actual dates"
                                : trip.cancelled
                                  ? "Cancelled"
                                  : "Planned dates"}
                            {trip.actualEntry && !trip.actualExit
                              ? " · exit not recorded"
                              : ""}
                          </span>
                        </td>
                        <td>
                          <strong>
                            {actual} actual {actual === 1 ? "day" : "days"}
                          </strong>
                          <span className="table-subtext">
                            {trip.cancelled ? 0 : plannedDays([trip])} planned
                            days
                          </span>
                          {extra > 0 && (
                            <span className="table-subtext">
                              {extra} {extra === 1 ? "day" : "days"} beyond
                              approved return
                            </span>
                          )}
                        </td>
                        <td>
                          <div>{formatDate(trip.approvedReturn)}</div>
                          {!trip.cancelled && (
                            <Badge
                              tone={
                                progress === "past"
                                  ? "red"
                                  : progress === "approaching"
                                    ? "amber"
                                    : "green"
                              }
                            >
                              {statusIcon}
                              {statusLabels[progress]}
                            </Badge>
                          )}
                        </td>
                        <td>
                          <div>
                            {trip.permissionExpiry
                              ? formatDate(trip.permissionExpiry)
                              : "Not recorded"}
                          </div>
                          <span className="table-subtext">
                            Separate from company dates
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <Button
                              variant="secondary"
                              disabled={trip.cancelled}
                              onClick={() => setEditing(trip)}
                            >
                              Record travel
                            </Button>
                            <Button
                              variant="ghost"
                              disabled={trip.cancelled}
                              onClick={() => setExtending(trip)}
                            >
                              Extend return
                            </Button>
                          </div>
                          {extra > 0 && (
                            <div className="table-subtext">
                              <Wallet size={12} /> Estimate:{" "}
                              {trip.dailyBudget !== undefined && trip.currency
                                ? money(extra * trip.dailyBudget, trip.currency)
                                : "Not available"}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
      {editing && (
        <RecordTravel
          trip={editing}
          today={today}
          onClose={() => setEditing(null)}
          onSave={(values) => {
            update((draft) => {
              const trip = draft.trips.find((item) => item.id === editing.id);
              if (trip) {
                Object.assign(trip, values);
                addHistory(
                  draft,
                  `Recorded actual travel dates for ${trip.country}; daily budget ${values.dailyBudget !== undefined && values.currency ? `${values.dailyBudget} ${values.currency}` : "not recorded"}.`,
                  trip.caseId,
                );
              }
            }, "Travel record updated");
            setEditing(null);
          }}
        />
      )}
      {extending && (
        <ExtendReturn
          trip={extending}
          today={today}
          approver={state.profile.name}
          onClose={() => setExtending(null)}
          onSave={(target, approver, approvedAt, note) => {
            update((draft) => {
              const trip = draft.trips.find((item) => item.id === extending.id);
              if (trip) {
                const previous = trip.approvedReturn;
                trip.approvedReturn = target;
                addHistory(
                  draft,
                  `Company return extension approved by ${approver} on ${approvedAt}: ${previous} → ${target}. ${note} Permission expiry unchanged (${trip.permissionExpiry || "not recorded"}).`,
                  trip.caseId,
                );
              }
            }, "Company-approved return updated");
            setExtending(null);
          }}
        />
      )}
    </>
  );
}

function RecordTravel({
  trip,
  today,
  onClose,
  onSave,
}: {
  trip: Trip;
  today: string;
  onClose: () => void;
  onSave: (
    values: Pick<
      Trip,
      "actualEntry" | "actualExit" | "dailyBudget" | "currency"
    >,
  ) => void;
}) {
  const [entry, setEntry] = useState(trip.actualEntry || "");
  const [exit, setExit] = useState(trip.actualExit || "");
  const [budget, setBudget] = useState(trip.dailyBudget?.toString() || "");
  const [currency, setCurrency] = useState(trip.currency || "");
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!entry && exit) {
      setError("Record an actual entry date before recording an exit.");
      return;
    }
    if (entry > today || exit > today) {
      setError("Actual travel dates cannot be after the reporting date.");
      return;
    }
    if (exit && exit < entry) {
      setError("Exit must be on or after entry.");
      return;
    }
    if (
      (budget !== "" &&
        (!Number.isFinite(Number(budget)) || Number(budget) < 0)) ||
      (budget !== "" && !/^[A-Z]{3}$/.test(currency.trim().toUpperCase())) ||
      (budget === "" && currency.trim())
    ) {
      setError(
        "Enter a non-negative daily budget with a three-letter currency, or leave both blank.",
      );
      return;
    }
    onSave({
      actualEntry: entry || undefined,
      actualExit: exit || undefined,
      dailyBudget: budget === "" ? undefined : Number(budget),
      currency: currency.trim().toUpperCase() || undefined,
    });
  }
  return (
    <Modal title="Record actual travel" onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted">
          Record physical entry and exit for {trip.country}. Leave exit blank
          for an open stay.
        </p>
        <div className="grid-2">
          <Field label="Actual entry">
            <input
              type="date"
              value={entry}
              max={today}
              onChange={(event) => setEntry(event.target.value)}
            />
          </Field>
          <Field label="Actual exit">
            <input
              type="date"
              value={exit}
              min={entry || undefined}
              max={today}
              onChange={(event) => setExit(event.target.value)}
            />
          </Field>
        </div>
        <div className="form-section">
          <h3>Extra cost estimate</h3>
          <p className="muted">
            Additional recorded days beyond the company-approved return × your
            daily budget. This does not record actual expenses.
          </p>
          <div className="grid-2">
            <Field label="Daily budget">
              <input
                type="number"
                min="0"
                step="0.01"
                value={budget}
                placeholder="Not recorded"
                onChange={(event) => setBudget(event.target.value)}
              />
            </Field>
            <Field label="Currency">
              <input
                value={currency}
                maxLength={3}
                placeholder="e.g. USD"
                onChange={(event) =>
                  setCurrency(event.target.value.toUpperCase())
                }
              />
            </Field>
          </div>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save travel record</Button>
        </div>
      </form>
    </Modal>
  );
}

function ExtendReturn({
  trip,
  today,
  approver: defaultApprover,
  onClose,
  onSave,
}: {
  trip: Trip;
  today: string;
  approver: string;
  onClose: () => void;
  onSave: (
    target: string,
    approver: string,
    date: string,
    note: string,
  ) => void;
}) {
  const [target, setTarget] = useState("");
  const [approver, setApprover] = useState(defaultApprover);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  return (
    <Modal title="Approve company return extension" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (
            target <= trip.approvedReturn ||
            !approver.trim() ||
            !note.trim() ||
            !date ||
            date > today
          ) {
            setError(
              "Enter a later return date, approval date, approver and approval note.",
            );
            return;
          }
          onSave(target, approver.trim(), date, note.trim());
        }}
      >
        <div className="callout callout-blue">
          <CalendarDays size={19} />
          <div>
            <strong>Company approval applies to return planning.</strong>
            <p>
              Permission expiry stays{" "}
              {trip.permissionExpiry
                ? formatDate(trip.permissionExpiry)
                : "Not recorded"}
              . Confirm any separate permission requirements through the linked
              case.
            </p>
          </div>
        </div>
        <div className="grid-2">
          <Field label="New approved return">
            <input
              required
              type="date"
              min={addDay(trip.approvedReturn)}
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </Field>
          <Field label="Approval date">
            <input
              required
              type="date"
              max={today}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
          <Field label="Approved by">
            <input
              required
              value={approver}
              onChange={(event) => setApprover(event.target.value)}
            />
          </Field>
          <Field label="Current approved return">
            <input readOnly value={formatDate(trip.approvedReturn)} />
          </Field>
        </div>
        <Field label="Approval note">
          <textarea
            required
            rows={3}
            value={note}
            placeholder="Record the reason and approval context"
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Record approved extension</Button>
        </div>
      </form>
    </Modal>
  );
}

export default TravelPage;
