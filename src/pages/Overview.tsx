import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  FileCheck2,
  Plane,
  MessageCircle,
  CalendarDays,
  Check,
  Sun,
  MoreHorizontal,
  ChevronRight,
  Sparkles,
  Clock3,
  MapPin,
} from "lucide-react";
import { useApp } from "../store";
import { Avatar, Badge, Card, Info, Status } from "../components/ui";
import { formatDate, inWindow } from "../domain/dates";

export default function OverviewPage() {
  const { state } = useApp(),
    navigate = useNavigate();
  const urgent = state.incidents.filter((i) => i.status !== "resolved");
  const reviews = state.documents.filter((d) => d.status === "submitted");
  const departing = state.cases.filter(
    (c) =>
      inWindow(c.start, state.clock, 3) &&
      c.requirements.some(
        (r) =>
          r.kind === "required" &&
          r.status !== "completed" &&
          r.status !== "na",
      ),
  );
  const questions = state.threads.filter(
    (t) =>
      t.audience === "employee" &&
      t.status !== "resolved" &&
      t.messages.filter((m) => m.audience === "employee").at(-1)?.author !==
        state.profile.name,
  );
  const metrics = [
    {
      label: "Urgent issues",
      count: urgent.length,
      detail: "Need your attention",
      icon: AlertTriangle,
      tone: "red",
      to: "/urgent",
      unit: "Unresolved urgent incidents. Acknowledgment does not resolve an incident.",
    },
    {
      label: "Documents to review",
      count: reviews.length,
      detail: "Ready for a closer look",
      icon: FileCheck2,
      tone: "blue",
      to: "/documents?status=submitted",
      unit: "Current document versions awaiting administrative review.",
    },
    {
      label: "Departing soon",
      count: departing.length,
      detail: "With open requirements",
      icon: Plane,
      tone: "purple",
      to: "/cases?queue=departing",
      unit: "Cases departing within the next 72 hours with incomplete required steps. Date-only travel has no invented flight time.",
    },
    {
      label: "Employee questions",
      count: questions.length,
      detail: "Waiting for your reply",
      icon: MessageCircle,
      tone: "amber",
      to: "/inbox",
      unit: "Unresolved employee conversations whose most recent message is from the employee. Unread is counted separately.",
    },
  ];
  const work = state.cases
    .flatMap((c) =>
      c.requirements
        .filter(
          (r) =>
            r.status !== "completed" &&
            r.status !== "na" &&
            r.party === "hr" &&
            (r.stage === "documents" || r.stage === "preparation"),
        )
        .map((r) => ({
          c,
          r,
          overdue: !!r.due && r.due < state.clock.slice(0, 10),
        })),
    )
    .sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) ||
        (a.r.due || "z").localeCompare(b.r.due || "z"),
    );
  const queue = [
    ...urgent
      .slice(0, 2)
      .map((i) => ({
        id: i.id,
        name: i.title,
        sub: i.location,
        employee: state.employees.find((e) => e.id === i.employeeId)!,
        caseId: i.caseId,
        case: state.cases.find((c) => c.id === i.caseId),
        context: "Time-sensitive",
        status: i.status,
        action: "View incident",
        to: "/urgent?incident=" + i.id,
        urgent: true,
      })),
    ...work
      .slice(0, 4)
      .map(({ c, r, overdue }) => ({
        id: r.id + c.id,
        name: r.name,
        sub: c.country + " · " + c.purpose,
        employee: state.employees.find((e) => e.id === c.employeeId)!,
        caseId: c.id,
        case: c,
        context: overdue
          ? "Overdue · " + formatDate(r.due!)
          : r.due
            ? "Due " + formatDate(r.due)
            : "Before departure",
        status: r.status,
        action: r.status === "submitted" ? "Review document" : "Open case",
        to: "/cases/" + c.id,
        urgent: false,
      })),
  ].slice(0, 5);
  const nextTrips = state.trips
    .filter((t) => !t.cancelled && t.plannedEntry >= state.clock.slice(0, 10))
    .sort((a, b) => a.plannedEntry.localeCompare(b.plannedEntry))
    .slice(0, 3);
  const ready = state.cases.filter((c) =>
    c.requirements
      .filter((r) => r.stage === "documents" && r.kind === "required")
      .every((r) => r.status === "completed" || r.status === "na"),
  ).length;
  return (
    <>
      <div className="overview-heading">
        <div>
          <div className="eyebrow">
            <span className="tiny-dot" /> YOUR WORKSPACE, AT A GLANCE
          </div>
          <h1>
            Good morning, Jeffrey<span className="heading-dot">.</span>
          </h1>
        </div>
        <div className="date-pill">
          <CalendarDays size={16} />
          {formatDate(state.clock)}
          <span className="date-pill-divider" />
          <Sun size={17} />
        </div>
      </div>
      <div className="metric-grid overview-metrics">
        {metrics.map((m) => (
          <Card key={m.label} className={"metric metric-" + m.tone}>
            <div className="metric-top">
              <span>{m.label}</span>
              <span className={"metric-icon tone-" + m.tone}>
                <m.icon size={19} />
              </span>
            </div>
            <div className="metric-number">
              <Link to={m.to} aria-label={`${m.count} ${m.label}`}>
                {String(m.count).padStart(2, "0")}
              </Link>
              <Info label={"Count details: " + m.label}>{m.unit}</Info>
            </div>
            <Link className="metric-bottom" to={m.to}>
              {m.detail}
              <ArrowUpRight size={16} />
            </Link>
          </Card>
        ))}
      </div>
      <div className="overview-work-grid">
        <Card className="today-card">
          <div className="section-head">
            <div>
              <div className="section-title-line">
                <h2>Today’s priorities</h2>
                <span className="count-pill">{queue.length}</span>
              </div>
              <p>A clear next step, for every open loop.</p>
            </div>
            <Link to="/cases" className="text-link compact-link">
              All cases <ArrowRight size={15} />
            </Link>
          </div>
          <div className="priority-columns">
            <span>WHAT NEEDS DOING</span>
            <span>ASSIGNED TO</span>
            <span>NEXT STEP</span>
          </div>
          <div className="priority-list">
            {queue.map((q) => (
              <div className="priority-item" key={q.id}>
                <div className="priority-main">
                  <span
                    className={
                      "priority-symbol " +
                      (q.urgent ? "priority-critical" : "priority-doc")
                    }
                  >
                    {q.urgent ? (
                      <AlertTriangle size={18} />
                    ) : (
                      <FileCheck2 size={18} />
                    )}
                  </span>
                  <div>
                    <Link className="priority-name" to={q.to}>
                      {q.name}
                    </Link>
                    <div className="priority-sub">
                      <span>{q.employee.name}</span>
                      <span>·</span>
                      <span>{q.case?.country}</span>
                      {q.urgent && <Badge tone="red">Urgent</Badge>}
                    </div>
                    <span
                      className={
                        "priority-context " +
                        (q.context.startsWith("Overdue") ? "danger-text" : "")
                      }
                    >
                      {q.context}
                    </span>
                  </div>
                </div>
                <div className="priority-owner">
                  <span className="mini-avatar">JT</span>
                  <span>Jeffrey Tang</span>
                </div>
                <Link className="action-link" to={q.to}>
                  {q.action}
                  <ChevronRight size={15} />
                </Link>
              </div>
            ))}
          </div>
          <div className="queue-footer">
            <span>
              <Check size={13} /> Your changes are saved automatically
            </span>
            <span>All times follow the workspace clock</span>
          </div>
        </Card>
        <div className="overview-aside">
          <Card className="departures-card">
            <div className="section-head">
              <div className="section-title-line">
                <h2>On the horizon</h2>
                <Plane size={18} className="muted" />
              </div>
              <p>The next departures on your radar.</p>
            </div>
            <div className="upcoming-list">
              {nextTrips.map((t) => {
                const e = state.employees.find((e) => e.id === t.employeeId)!;
                const d = new Date(t.plannedEntry + "T12:00:00Z");
                return (
                  <Link
                    className="upcoming-item"
                    to={"/cases/" + t.caseId}
                    key={t.id}
                  >
                    <span className="departure-calendar">
                      <small>
                        {d
                          .toLocaleString("en", {
                            month: "short",
                            timeZone: "UTC",
                          })
                          .toUpperCase()}
                      </small>
                      <strong>{d.getUTCDate()}</strong>
                    </span>
                    <div>
                      <strong>{e.name}</strong>
                      <span>
                        <MapPin size={12} />
                        {t.country}
                      </span>
                    </div>
                    <ArrowUpRight size={17} />
                  </Link>
                );
              })}
            </div>
            <Link className="aside-footer-link" to="/travel">
              Open travel dashboard
              <ArrowRight size={15} />
            </Link>
          </Card>
          <div className="guide-promo">
            <span className="guide-promo-icon">
              <Sparkles size={19} />
            </span>
            <div className="eyebrow">A LITTLE CLARITY GOES A LONG WAY</div>
            <h3>
              New destination?
              <br />
              Start with the guide.
            </h3>
            <p>
              Practical steps for your next business trip, all in one place.
            </p>
            <Link to="/guide">
              Explore travel guides <ArrowUpRight size={16} />
            </Link>
            <svg
              className="promo-lines"
              viewBox="0 0 150 120"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 110C110 95 24 5 140 10M28 122C134 107 48 17 164 22M-20 98C85 83-1-7 115-2"
                stroke="currentColor"
              />
            </svg>
          </div>
        </div>
      </div>
      <div className="insights-header">
        <div className="section-title-line">
          <h2>The bigger picture</h2>
          <span className="muted">A little perspective on what’s moving.</span>
        </div>
        <Info label="Insights counting convention">
          Charts count cases and planned departures. Select a chart bar to open
          matching records.
        </Info>
      </div>
      <div className="insights-grid">
        <Card className="insight-card">
          <div className="section-title-line">
            <span className="insight-icon">
              <FileCheck2 size={16} />
            </span>
            <h3>Case preparation</h3>
            <Link to="/cases" aria-label="View all case preparation">
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="stage-bars">
            {[
              {
                label: "Preparing",
                count: state.cases.length - ready,
                cls: "purple",
                to: "/cases?stage=preparing",
              },
              {
                label: "Documents ready",
                count: ready,
                cls: "green",
                to: "/cases?stage=ready",
              },
            ].map((s) => (
              <button key={s.label} onClick={() => navigate(s.to)}>
                <span>{s.label}</span>
                <span className="bar-track">
                  <i
                    className={s.cls}
                    style={{
                      width:
                        Math.max(5, (s.count / state.cases.length) * 100) + "%",
                    }}
                  />
                </span>
                <strong>{s.count}</strong>
              </button>
            ))}
          </div>
        </Card>
        <Card className="insight-card">
          <div className="section-title-line">
            <span className="insight-icon">
              <Plane size={16} />
            </span>
            <h3>Upcoming departures</h3>
            <Link to="/travel" aria-label="View upcoming departures">
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="departure-bars">
            {Array.from({ length: 6 }, (_, i) => {
              const start = new Date(state.clock);
              start.setUTCDate(start.getUTCDate() + i * 7);
              const end = new Date(start);
              end.setUTCDate(end.getUTCDate() + 7);
              const count = state.trips.filter(
                (t) =>
                  !t.cancelled &&
                  t.plannedEntry >= start.toISOString().slice(0, 10) &&
                  t.plannedEntry < end.toISOString().slice(0, 10),
              ).length;
              return (
                <button
                  key={i}
                  onClick={() =>
                    navigate(
                      "/travel?from=" +
                        start.toISOString().slice(0, 10) +
                        "&through=" +
                        end.toISOString().slice(0, 10),
                    )
                  }
                  aria-label={`${count} departures week of ${formatDate(start.toISOString())}`}
                >
                  <span>{count}</span>
                  <i style={{ height: 8 + count * 18 + "px" }} />
                  <small>
                    {start.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      timeZone: "UTC",
                    })}
                  </small>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
