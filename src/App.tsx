import { useEffect, useRef, useState, Component, type ReactNode } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  BriefcaseBusiness,
  Plane,
  UsersRound,
  Files,
  Inbox,
  TriangleAlert,
  BookOpen,
  Settings2,
  Search,
  ChevronDown,
  Plus,
  Bell,
  Building2,
  ArrowUpRight,
  Command,
  Check,
  X,
  Menu,
  Download,
  RotateCcw,
  CalendarDays,
  CheckCheck,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { AppProvider, useApp } from "./store";
import {
  Button,
  Modal,
  Field,
  PageHeading,
  Card,
  Empty,
  Badge,
} from "./components/ui";
import OverviewPage from "./pages/Overview";
import { CasesPage, CaseDetailPage } from "./pages/Cases";
import { IntakePage } from "./pages/Intake";
import { TravelPage } from "./pages/Travel";
import { EmployeesPage, EmployeeDetailPage } from "./pages/Employees";
import { DocumentsPage } from "./pages/Documents";
import { InboxPage, UrgentPage } from "./pages/Support";
import GuidePage from "./pages/Guide";
import { formatDate } from "./domain/dates";
function TripWireLogo() {
  return (
    <Link to="/" className="brand" aria-label="TripWire home">
      <svg viewBox="0 0 45 42" fill="none" aria-hidden="true">
        <path
          d="M3 10.5l17 4.7 10.5-4.6-6 9.2 17.5 16.7-24.7-12.2-8.8 1.8 4.8-8.2L3 10.5z"
          fill="currentColor"
        />
        <path
          d="M13 17.8l-6 1.1 10.5 3.5 7-2.6"
          stroke="white"
          strokeWidth="1.2"
        />
      </svg>
      <span>
        TripWire<span className="brand-period">.</span>
      </span>
    </Link>
  );
}
const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/cases", label: "Cases", icon: BriefcaseBusiness },
  { to: "/travel", label: "Travel", icon: Plane },
  { to: "/employees", label: "Employees", icon: UsersRound },
  { to: "/documents", label: "Documents", icon: Files },
];
function LegacyRedirect() {
  const l = useLocation();
  return (
    <Navigate
      replace
      to={l.pathname.replace(/^\/assignments/, "/cases") + l.search + l.hash}
    />
  );
}
function Shell() {
  const { state, update } = useApp(),
    location = useLocation(),
    navigate = useNavigate();
  const [search, setSearch] = useState(""),
    [panel, setPanel] = useState<"workspace" | "notifications" | null>(null),
    [sidebar, setSidebar] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const unread = state.threads.filter(
      (t) => t.audience === "employee" && t.unread,
    ).length,
    alerts = state.notifications.filter((n) => !n.read).length,
    urgent = state.incidents.filter((i) => i.status !== "resolved").length;
  useEffect(() => {
    setSearch("");
    setSidebar(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        input.current?.focus();
      }
      if (e.key === "Escape") setSearch("");
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const results = search.trim().length
    ? state.employees
        .filter((e) =>
          (e.name + " " + e.employeeNumber)
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .slice(0, 4)
    : [];
  const caseResults = search.trim().length
    ? state.cases
        .filter((c) =>
          (
            c.country +
            " " +
            c.caseNumber +
            " " +
            state.employees.find((e) => e.id === c.employeeId)?.name
          )
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .slice(0, 3)
    : [];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {sidebar && (
        <div className="sidebar-scrim" onClick={() => setSidebar(false)} />
      )}
      <aside className={"sidebar " + (sidebar ? "sidebar-open" : "")}>
        <div className="sidebar-top">
          <TripWireLogo />
          <Link to="/cases/new" className="new-case-button">
            <span className="new-case-plus">
              <Plus size={22} />
            </span>
            <span>New case</span>
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <div className="nav-group-label">WORKSPACE</div>
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                "nav-item " + (isActive ? "active" : "")
              }
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.label === "Documents" &&
                state.documents.some((d) => d.status === "submitted") && (
                  <span className="nav-neutral-count">
                    {
                      state.documents.filter((d) => d.status === "submitted")
                        .length
                    }
                  </span>
                )}
            </NavLink>
          ))}
          <div className="nav-group-label support-label">SUPPORT</div>
          <NavLink
            to="/inbox"
            className={({ isActive }) =>
              "nav-item " + (isActive ? "active" : "")
            }
          >
            <Inbox size={19} />
            <span>Inbox</span>
            {unread > 0 && <span className="nav-neutral-count">{unread}</span>}
          </NavLink>
          <NavLink
            to="/urgent"
            className={({ isActive }) =>
              "nav-item " + (isActive ? "active" : "")
            }
          >
            <TriangleAlert size={19} />
            <span>Urgent</span>
            {urgent > 0 && <span className="urgent-count">{urgent}</span>}
          </NavLink>
          <div className="nav-guide-divider" />
          <NavLink
            to="/guide"
            className={({ isActive }) =>
              "nav-item " + (isActive ? "active" : "")
            }
          >
            <BookOpen size={19} />
            <span>Travel guide</span>
            <ArrowUpRight size={14} className="nav-guide-arrow" />
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="sidebar-note-orbit">↗</span>
            <p>
              A clearer path.
              <br />
              <strong>A smoother journey.</strong>
            </p>
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              "nav-item " + (isActive ? "active" : "")
            }
          >
            <Settings2 size={19} />
            <span>Settings</span>
          </NavLink>
          <div className="sidebar-footnote">
            Made for the way your team moves.
          </div>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            aria-label="Open navigation"
            onClick={() => setSidebar(!sidebar)}
          >
            <Menu size={20} />
          </button>
          <div className="global-search">
            <Search size={19} />
            <input
              ref={input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people, cases and more..."
              aria-label="Search people and cases"
            />
            <kbd>
              <Command size={11} />K
            </kbd>
            {search && (
              <div className="global-results">
                <div className="eyebrow">PEOPLE</div>
                {results.map((e) => (
                  <Link to={"/employees/" + e.id} key={e.id}>
                    <UsersRound size={16} />
                    <span>
                      {e.name}
                      <small>{e.employeeNumber}</small>
                    </span>
                    <ArrowUpRight size={15} />
                  </Link>
                ))}
                <div className="eyebrow">CASES</div>
                {caseResults.map((c) => (
                  <Link to={"/cases/" + c.id} key={c.id}>
                    <BriefcaseBusiness size={16} />
                    <span>
                      {state.employees.find((e) => e.id === c.employeeId)?.name}{" "}
                      · {c.country}
                      <small>{c.caseNumber}</small>
                    </span>
                  </Link>
                ))}
                {!results.length && !caseResults.length && (
                  <p>No matching people or cases.</p>
                )}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <button
              className="workspace-switch"
              onClick={() => setPanel("workspace")}
            >
              <span className="workspace-icon">
                <Building2 size={17} />
              </span>
              <span>
                Northstar <small>Manufacturing</small>
              </span>
              <ChevronDown size={14} />
            </button>
            <span className="topbar-divider" />
            <Link
              to="/inbox"
              className="icon-btn topbar-icon"
              aria-label={`Inbox, ${unread} unread employee messages`}
            >
              <Inbox size={20} />
              {unread > 0 && (
                <span className="notification-number">{unread}</span>
              )}
            </Link>
            <button
              className="icon-btn topbar-icon"
              aria-label={`Notifications, ${alerts} unacknowledged`}
              onClick={() => setPanel("notifications")}
            >
              <Bell size={20} />
              {alerts > 0 && <span className="notification-dot" />}
            </button>
            <span className="topbar-divider" />
            <details className="account-menu">
              <summary>
                <span className="account-avatar">JT</span>
                <span className="account-name">
                  Jeffrey Tang<small>Workspace admin</small>
                </span>
                <ChevronDown size={13} />
              </summary>
              <div className="account-popover">
                <strong>Jeffrey Tang</strong>
                <small>jeffrey@northstar.example</small>
                <Badge tone="purple">Demo environment</Badge>
                <Link to="/settings">
                  <Settings2 size={15} />
                  Workspace settings
                </Link>
                <span className="muted">
                  Local workspace · no external actions sent
                </span>
              </div>
            </details>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <div className="page-transition" key={location.pathname}>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/cases" element={<CasesPage />} />
              <Route path="/cases/new" element={<IntakePage />} />
              <Route path="/cases/:id" element={<CaseDetailPage />} />
              <Route path="/travel" element={<TravelPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/employees/:id" element={<EmployeeDetailPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/urgent" element={<UrgentPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route
                path="/travel-guide"
                element={<Navigate replace to="/guide" />}
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/assignments/*" element={<LegacyRedirect />} />
              <Route
                path="*"
                element={
                  <>
                    <Empty title="That page is a little off course." />
                    <Link className="btn btn-primary" to="/">
                      Back to Overview
                    </Link>
                  </>
                }
              />
            </Routes>
          </div>
          <footer className="app-footer">
            <span>TripWire. Every step, together.</span>
            <span>
              <span className="tiny-dot" />
              Workspace up to date
            </span>
          </footer>
        </main>
      </div>
      {panel === "workspace" && (
        <Modal title="Your workspace" onClose={() => setPanel(null)}>
          <div className="workspace-profile">
            <span className="workspace-icon">
              <Building2 size={28} />
            </span>
            <h3>Northstar Manufacturing</h3>
            <p>A shared place for your people, cases and travel.</p>
            <Badge tone="green">Current workspace</Badge>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setPanel(null);
              navigate("/settings");
            }}
          >
            Workspace settings
            <ArrowRight size={15} />
          </Button>
        </Modal>
      )}
      {panel === "notifications" && (
        <Modal title="Notifications" onClose={() => setPanel(null)}>
          <p>
            Workspace alerts. Acknowledging an alert does not resolve an urgent
            incident.
          </p>
          <div className="stack">
            {state.notifications.map((n) => (
              <div className="notification-item" key={n.id}>
                <span
                  className={
                    "notification-indicator " + (!n.read ? "unread" : "")
                  }
                />
                <Link to={n.to} onClick={() => setPanel(null)}>
                  {n.title}
                </Link>
                <Button
                  variant="ghost"
                  disabled={n.read}
                  onClick={() =>
                    update((s) => {
                      s.notifications.find((x) => x.id === n.id)!.read = true;
                    }, "Notification acknowledged")
                  }
                >
                  {n.read ? "Acknowledged" : "Acknowledge"}
                </Button>
              </div>
            ))}
          </div>
        </Modal>
      )}
      <Toasts />
    </div>
  );
}
function SettingsPage() {
  const { state, update, reset, notify } = useApp();
  const [confirm, setConfirm] = useState(false),
    [clock, setClock] = useState(state.clock.slice(0, 16));
  function backup() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    a.download = "tripwire-workspace-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    notify("Workspace backup downloaded");
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="Workspace settings"
        description="Your people, preferences and workspace controls."
      />
      <div className="settings-grid">
        <Card className="padded">
          <h2>Workspace</h2>
          <div className="settings-line">
            <span>Company</span>
            <strong>Northstar Manufacturing</strong>
          </div>
          <div className="settings-line">
            <span>Administrator</span>
            <strong>Jeffrey Tang · JT</strong>
          </div>
          <div className="settings-line">
            <span>Environment</span>
            <Badge tone="purple">Demo environment</Badge>
          </div>
          <p className="muted">
            This browser stores your workspace locally. No email, payments or
            authority submissions are sent. Document previews contain metadata
            only.
          </p>
        </Card>
        <Card className="padded">
          <h2>Workspace clock</h2>
          <p>
            All date windows and urgency checks use this fixed clock. Changing
            it does not change deadlines, permissions or approval dates.
          </p>
          <Field label="Configured date and time (UTC)">
            <input
              type="datetime-local"
              value={clock}
              onChange={(e) => setClock(e.target.value)}
            />
          </Field>
          <Button
            onClick={() => {
              if (!clock) return;
              update((s) => {
                s.clock = new Date(clock + "Z").toISOString();
              }, "Workspace clock updated");
            }}
          >
            <CalendarDays size={16} />
            Save clock
          </Button>
        </Card>
        <Card className="padded">
          <h2>Your data</h2>
          <p>Keep a local JSON backup of your workspace and version history.</p>
          <Button variant="secondary" onClick={backup}>
            <Download size={16} />
            Export workspace backup
          </Button>
          <details>
            <summary>Migration history</summary>
            <ul>
              {state.migrationLog.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </details>
        </Card>
        <Card className="padded">
          <h2>Start a fresh demonstration</h2>
          <p>
            Reset replaces this browser’s changes with the known demonstration
            fixtures. Export a backup first if you need to keep your work.
          </p>
          <Button variant="danger" onClick={() => setConfirm(true)}>
            <RotateCcw size={15} />
            Reset demo workspace
          </Button>
        </Card>
      </div>
      {confirm && (
        <Modal title="Reset this workspace?" onClose={() => setConfirm(false)}>
          <div className="callout callout-amber">
            This removes your local changes and restores the original demo
            employees, cases, documents, messages and incidents. This cannot be
            undone without your exported backup.
          </div>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Keep my workspace
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                reset();
                setConfirm(false);
              }}
            >
              Confirm reset
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Toasts() {
  const [toast, setToast] = useState("");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const show = (e: Event) => {
      setToast((e as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setToast(""), 4800);
    };
    window.addEventListener("tripwire:toast", show);
    return () => {
      window.removeEventListener("tripwire:toast", show);
      clearTimeout(timer);
    };
  }, []);
  return (
    <div className="toast-region" aria-live="polite">
      {toast && (
        <div className="toast">
          <span className="toast-check">
            <Check size={15} />
          </span>
          {toast}
          <button
            className="icon-btn"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="fatal-error">
        <h1>Let’s get you back on track.</h1>
        <p>
          The workspace encountered an error. Your saved data has not been
          reset.
        </p>
        <Button onClick={() => window.location.reload()}>
          Reload workspace
        </Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
