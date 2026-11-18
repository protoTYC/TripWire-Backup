import {
  useEffect,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import {
  Check,
  Clock3,
  Circle,
  FileCheck2,
  AlertCircle,
  Minus,
  X,
  ArrowUpRight,
  Inbox,
} from "lucide-react";
import type { Employee } from "../domain/types";
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return <button className={`btn btn-${variant} ${className}`} {...props} />;
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "purple" | "green" | "amber" | "red" | "blue";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Status({ status }: { status: string }) {
  const map: Record<
    string,
    [
      string,
      typeof Check,
      "neutral" | "purple" | "green" | "amber" | "red" | "blue",
    ]
  > = {
    completed: ["Completed", Check, "green"],
    reviewed: ["Reviewed", Check, "green"],
    todo: ["Not started", Circle, "neutral"],
    requested: ["Requested", Clock3, "amber"],
    submitted: ["Awaiting review", FileCheck2, "blue"],
    correction: ["Needs correction", AlertCircle, "red"],
    na: ["Not applicable", Minus, "neutral"],
    open: ["Open", AlertCircle, "red"],
    acknowledged: ["Acknowledged", Clock3, "amber"],
    "in-progress": ["In progress", Clock3, "purple"],
    resolved: ["Resolved", Check, "green"],
    awaiting: ["Awaiting reply", Clock3, "amber"],
  };
  const [label, Icon, tone] = map[status] || [status, Circle, "neutral"];
  return (
    <Badge tone={tone}>
      <Icon size={12} />
      {label}
    </Badge>
  );
}
export function Avatar({
  employee,
  size = "md",
}: {
  employee: Pick<Employee, "name" | "initials" | "color">;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={`avatar avatar-${size}`}
      style={{ background: employee.color, color: "#fff" }}
      aria-label={employee.name}
    >
      {employee.initials}
    </span>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-heading-action">{action}</div>}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Info({
  children,
  label = "About this count",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <details className="info">
      <summary aria-label={label}>i</summary>
      <div>{children}</div>
    </details>
  );
}
export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a className="text-link" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={14} />
    </a>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <Dialog title={title} onClose={onClose} wide={wide}>
      {children}
    </Dialog>
  );
}
export function Drawer({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog title={title} onClose={onClose} drawer>
      {children}
    </Dialog>
  );
}
function Dialog({
  title,
  children,
  onClose,
  wide = false,
  drawer = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = ref.current;
    panel?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close.current();
      }
      if (e.key === "Tab" && panel) {
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>(
            'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
          ),
        ).filter((el) => el.offsetParent !== null);
        const first = focusables[0],
          last = focusables.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === panel)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, []);
  return (
    <div
      className={`modal-backdrop ${drawer ? "drawer-backdrop" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "modal-wide" : ""} ${drawer ? "drawer" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">TRIPWIRE WORKSPACE</span>
            <h2>{title}</h2>
          </div>
          <button
            className="icon-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
