import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ArrowUpRight,
  Globe2,
  BookOpen,
  ArrowRight,
  FileText,
  CheckCircle2,
  Clock3,
  Coins,
  Compass,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { routeGuides } from "../domain/templates";
import {
  PageHeading,
  Card,
  Badge,
  Drawer,
  ExternalLink,
  Field,
} from "../components/ui";
export default function GuidePage() {
  const [search, setSearch] = useState(""),
    [country, setCountry] = useState("All countries"),
    [nationality, setNationality] = useState("All nationalities"),
    [purpose, setPurpose] = useState("All purposes"),
    [open, setOpen] = useState<string | null>(null);
  const guide = routeGuides.find((g) => g.id === open);
  const guides = routeGuides.filter(
    (g) =>
      g.id !== "work-review" &&
      g.id !== "review" &&
      (country === "All countries" || g.country === country) &&
      (purpose === "All purposes" ||
        (purpose === "Work"
          ? g.purpose.toLowerCase().includes("work")
          : !g.purpose.toLowerCase().includes("technical"))) &&
      (g.title + " " + g.country + " " + g.short)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE KNOW-HOW, A SMOOTHER JOURNEY"
        title="Travel guide"
        description="Find your route. Understand the steps. Prepare with confidence."
      />
      <div className="guide-hero">
        <div>
          <span className="guide-hero-tag">
            <Compass size={15} /> YOUR NEXT CHAPTER STARTS HERE
          </span>
          <h2>
            Good journeys start
            <br />
            with clear information.
          </h2>
          <p>
            Practical business travel guides for your team.
            <br />
            From the first question to the final document check.
          </p>
        </div>
        <div className="guide-illustration" aria-hidden="true">
          <Globe2 size={150} strokeWidth={0.65} />
          <span className="floating-passport">
            <BookOpen size={42} strokeWidth={1.2} />
          </span>
          <span className="floating-check">
            <CheckCircle2 size={26} />
          </span>
        </div>
      </div>
      <div className="toolbar guide-filters">
        <label className="search-input">
          <Search size={17} />
          <input
            aria-label="Search travel guides"
            placeholder="Where are you headed?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option>All countries</option>
          <option>Vietnam</option>
          <option>United Kingdom</option>
        </select>
        <select
          aria-label="Nationality"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
        >
          <option>All nationalities</option>
          <option>United States</option>
          <option>India</option>
          <option>United Kingdom</option>
          <option>Other nationality</option>
        </select>
        <select
          aria-label="Purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        >
          <option>All purposes</option>
          <option>Business meetings</option>
          <option>Work</option>
        </select>
      </div>
      {nationality !== "All nationalities" && (
        <div className="callout">
          Showing route education for {nationality} travelers. Nationality and
          current permission must be checked in intake; a guide selection does
          not establish eligibility.
        </div>
      )}
      <div className="section-head">
        <div>
          <h2>Explore your options</h2>
          <p>
            Source-backed starting points, tailored to the purpose of travel.
          </p>
        </div>
        <span className="muted">{guides.length} route guides</span>
      </div>
      <div className="guide-card-grid">
        {guides.map((g) => (
          <Card className="guide-card" key={g.id}>
            <div
              className={
                "country-visual " +
                (g.country === "Vietnam" ? "vietnam-visual" : "uk-visual")
              }
            >
              <div className="country-flag">
                {g.country === "Vietnam" ? "🇻🇳" : "🇬🇧"}
              </div>
              <span>{g.country}</span>
              <span className="country-map-decoration">
                <Globe2 size={110} strokeWidth={0.5} />
              </span>
            </div>
            <div className="guide-card-body">
              <Badge tone="purple">
                {g.id === "uk-eta"
                  ? "Electronic authorization"
                  : g.id === "vn-evisa"
                    ? "Electronic visa"
                    : "Visa route"}
              </Badge>
              <h3>{g.title}</h3>
              <p>{g.short}</p>
              <div className="guide-card-meta">
                <span>
                  <Clock3 size={14} />
                  {g.timing.split(".")[0]}
                </span>
                <span>
                  <Coins size={14} />
                  {g.fee}
                </span>
              </div>
              <button className="guide-card-link" onClick={() => setOpen(g.id)}>
                Read guide
                <ArrowUpRight size={17} />
              </button>
            </div>
          </Card>
        ))}
      </div>
      {guides.length === 0 && (
        <div className="empty">
          <Compass />
          <h3>This route needs a closer look</h3>
          <p>
            We’ll collect the trip details and create a specific advice request.
          </p>
          <Link className="btn btn-primary" to="/cases/new?route=review">
            Start a case for review
            <ArrowRight size={15} />
          </Link>
        </div>
      )}
      <div className="guide-legal">
        <ShieldCheck size={20} />
        <p>
          TripWire provides administrative tools and general information. We are
          not a law firm and do not provide legal advice. Requirements and fees
          can change; confirm your circumstances with the relevant authority or
          a qualified adviser.
        </p>
      </div>
      {guide && (
        <Drawer title={guide.title} onClose={() => setOpen(null)}>
          <Badge tone="purple">{guide.country}</Badge>
          <h3>Overview</h3>
          <p>{guide.scope}</p>
          <div className="callout callout-amber">{guide.excludes}</div>
          <h3>Who this route is for</h3>
          <p>{guide.purpose}</p>
          <h3>Documents</h3>
          <h4>Employee supplies</h4>
          <ul className="check-list">
            {guide.employeeItems.map((x) => (
              <li key={x}>
                <FileText size={16} />
                {x}
              </li>
            ))}
          </ul>
          <h4>HR / host supplies</h4>
          <ul className="check-list">
            {guide.hostItems.map((x) => (
              <li key={x}>
                <FileText size={16} />
                {x}
              </li>
            ))}
          </ul>
          <h3>Step by step</h3>
          <ol className="numbered-steps">
            {guide.steps.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
          <h3>Fees & timing</h3>
          <div className="summary-box">
            <strong>{guide.fee}</strong>
            <p>{guide.feeScope}</p>
            <p>{guide.timing}</p>
            <p>
              Total charges: <strong>Confirm with issuing office.</strong>{" "}
              Courier, service and payment charges are excluded unless
              confirmed.
            </p>
          </div>
          <h3>Before departure</h3>
          <p>
            Check the decision, passport match, permitted activity, validity,
            entry conditions and travel dates. Preparation completion does not
            establish permission to travel or work.
          </p>
          <h3>Official sources</h3>
          <p className="muted">
            Research supplied as checked {guide.sourceChecked}. Confirm current
            office and form requirements before filing.
          </p>
          <div className="stack">
            {guide.sources.map((s) => (
              <ExternalLink href={s.url} key={s.url}>
                {s.label}
              </ExternalLink>
            ))}
          </div>
          <div className="sticky-drawer-action">
            <Link
              to={"/cases/new?route=" + guide.id}
              className="btn btn-primary"
              onClick={() => setOpen(null)}
            >
              Start case using this guide
              <ArrowRight size={16} />
            </Link>
            <ExternalLink href={guide.officialUrl}>
              Official application <ChevronRight size={14} />
            </ExternalLink>
          </div>
        </Drawer>
      )}
    </>
  );
}
