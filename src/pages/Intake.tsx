import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Globe2,
  Search,
  ShieldQuestion,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ExternalLink,
  Field,
  PageHeading,
} from "../components/ui";
import { useApp } from "../store";
import { addHistory, createCase } from "../domain/operations";
import { getGuide } from "../domain/templates";
import { formatDate } from "../domain/dates";
import type { RouteId } from "../domain/types";

type Activity = "meetings" | "services" | "work" | "other";
type Eligibility = "" | "eta" | "visa" | "exempt" | "unsure";

function dateAfter(value: string, days: number) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const activityOptions: { value: Activity; title: string; detail: string }[] = [
  {
    value: "meetings",
    title: "Meetings & business visits",
    detail: "Meet colleagues, attend meetings, or negotiate a contract.",
  },
  {
    value: "services",
    title: "Services & commercial presence",
    detail: "Offer services or establish a commercial presence.",
  },
  {
    value: "work",
    title: "Hands-on work or placement",
    detail: "Technical delivery, paid work, an assignment, or a placement.",
  },
  {
    value: "other",
    title: "Another activity / not sure",
    detail: "Describe the plan so the correct route can be reviewed.",
  },
];

function describesWork(value: string) {
  const terms =
    /\b(?:hands[- ]?on|technical work|engineering (?:placement|work|assignment)|install(?:ation|ing)?|maintenance|paid work|employment|on[- ]site delivery|provid(?:e|ing) services)\b/gi;
  return value.split(/[.;\n]/).some((clause) => {
    for (const match of clause.matchAll(terms)) {
      const before = clause.slice(0, match.index);
      // A short explicit exclusion such as “No hands-on technical work” is not a work activity.
      if (
        !/\b(?:no|without|not|won['’]t|will not)\s+(?:[\w-]+\s+){0,3}$/i.test(
          before,
        )
      )
        return true;
    }
    return false;
  });
}

export function IntakePage() {
  const { state, update, notify } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeParam = searchParams.get("route") || "";
  const countryParam =
    searchParams.get("country") ||
    (routeParam.startsWith("vn-")
      ? "Vietnam"
      : routeParam.startsWith("uk-")
        ? "United Kingdom"
        : routeParam === "review"
          ? ""
          : "Vietnam");
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState(
    searchParams.get("employee") || "",
  );
  const [country, setCountry] = useState(
    ["Vietnam", "United Kingdom"].includes(countryParam)
      ? countryParam
      : "Other",
  );
  const [otherCountry, setOtherCountry] = useState(
    countryParam === "Vietnam" || countryParam === "United Kingdom"
      ? ""
      : countryParam,
  );
  const [host, setHost] = useState("");
  const [start, setStart] = useState(dateAfter(state.clock, 21));
  const [end, setEnd] = useState(dateAfter(state.clock, 30));
  const [activity, setActivity] = useState<Activity>(
    routeParam === "vn-dn2"
      ? "services"
      : routeParam === "work-review"
        ? "work"
        : "meetings",
  );
  const [activityDetail, setActivityDetail] = useState("");
  const [nationality, setNationality] = useState("");
  const [passportNationality, setPassportNationality] = useState("");
  const [eligibility, setEligibility] = useState<Eligibility>("");
  const [currentPermission, setCurrentPermission] = useState("unknown");
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [evisaComparison, setEvisaComparison] = useState(
    routeParam === "vn-evisa",
  );
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const employee = state.employees.find((item) => item.id === employeeId);
  const destination = country === "Other" ? otherCountry.trim() : country;
  const travelNationality = nationality || employee?.nationality || "";
  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.employees.filter(
      (item) =>
        !query ||
        `${item.name} ${item.email} ${item.employeeNumber} ${item.department}`
          .toLowerCase()
          .includes(query),
    );
  }, [state.employees, search]);

  const reviewQuestion = useMemo(() => {
    if (activity === "work")
      return `Which work or employment permission is required for ${activityDetail.trim() || "the planned hands-on work or placement"} in ${destination || "the destination"}? Confirm the employer, duties, duration and any exemption before selecting a route.`;
    if (activity === "meetings" && describesWork(activityDetail))
      return `The activity details mention “${activityDetail.trim()}”. Confirm whether the duties include hands-on work, service delivery or employment, and which permission covers them in ${destination || "the destination"}.`;
    if (activity === "other")
      return `Which permission covers ${activityDetail.trim() || "the proposed activities"} in ${destination || "the destination"}? Confirm the actual duties and host before choosing a route.`;
    if (!["Vietnam", "United Kingdom"].includes(destination))
      return `Which entry and business-activity requirements apply to a ${travelNationality || "nationality not yet recorded"} traveler visiting ${destination || "the destination"} for ${activityOptions.find((item) => item.value === activity)?.title.toLowerCase()}?`;
    if (!travelNationality.trim())
      return `Confirm the traveler’s nationality and traveling passport before selecting an entry route for ${destination}.`;
    if (!host.trim() || /^(to confirm|unknown|tbc)$/i.test(host.trim()))
      return `Who is the legal host for this ${destination} visit, and what activities will they support? Confirm the organization and contact before selecting the route.`;
    if (
      destination === "Vietnam" &&
      evisaComparison &&
      (Date.parse(end) - Date.parse(start)) / 86400000 + 1 > 90
    )
      return "The planned stay exceeds the official e-visa route’s stated maximum of 90 days. Which permission covers the full visit and its actual activities?";
    if (destination === "United Kingdom") {
      if (activity === "services")
        return "Do the proposed services or commercial-presence activities fall within permitted UK visitor activities, or is a work route required? Confirm the actual duties and any payment.";
      if (!travelNationality.trim() || !passportNationality.trim())
        return "Confirm the traveler’s nationality and the nationality of the passport they will use before checking UK ETA, visa or exemption eligibility.";
      if (currentPermission !== "none")
        return currentPermission === "yes"
          ? "Does the traveler’s existing UK immigration permission or exemption cover this visit and these activities? Check the permission and traveling passport before applying."
          : "Does the traveler already hold UK permission or an exemption? Confirm this before deciding whether an ETA or visitor visa is needed.";
      if (!eligibilityChecked || !eligibility || eligibility === "unsure")
        return `Check GOV.UK for the traveling ${passportNationality} passport and current circumstances: is an ETA, Standard Visitor visa or exemption applicable?`;
      if (eligibility === "exempt")
        return "What is the basis for the UK entry-permission exemption, and which evidence should the traveler carry? Confirm it against the traveling passport and planned activities.";
    }
    return "";
  }, [
    activity,
    activityDetail,
    destination,
    travelNationality,
    passportNationality,
    currentPermission,
    eligibility,
    eligibilityChecked,
    host,
    start,
    end,
    evisaComparison,
  ]);

  const route: RouteId = reviewQuestion
    ? activity === "work" && destination === "Vietnam"
      ? "work-review"
      : "review"
    : destination === "Vietnam"
      ? evisaComparison
        ? "vn-evisa"
        : activity === "services"
          ? "vn-dn2"
          : "vn-dn1"
      : eligibility === "eta"
        ? "uk-eta"
        : "uk-visitor";
  const guide = getGuide(route);
  const purpose =
    activity === "meetings"
      ? "Business meetings"
      : activity === "services"
        ? "Services and commercial presence"
        : activity === "work"
          ? "Technical work / employment assessment"
          : activityDetail.trim() || "Activities to confirm";
  const dateError =
    !start || !end
      ? "Enter both trip dates."
      : end < start
        ? "The return date must be on or after the entry date."
        : "";

  function chooseEmployee(id: string) {
    const selected = state.employees.find((item) => item.id === id);
    setEmployeeId(id);
    setNationality(selected?.nationality || "");
    setPassportNationality(selected?.nationality || "");
    setEligibilityChecked(false);
    setConfirmed(false);
    setError("");
  }

  function preset() {
    const casey =
      state.employees.find((item) => /casey chen/i.test(item.name)) ||
      state.employees[0];
    if (casey) chooseEmployee(casey.id);
    setCountry("Vietnam");
    setHost("Northstar Vietnam, Ho Chi Minh City");
    setStart(dateAfter(state.clock, 21));
    setEnd(dateAfter(state.clock, 30));
    setActivity("meetings");
    setActivityDetail(
      "Business meetings with the local host. No hands-on technical work.",
    );
    setEvisaComparison(false);
    setConfirmed(false);
    setError("");
    setStep(casey ? 1 : 0);
    notify("Short business-trip preset applied. Review the host and dates.");
  }

  function next() {
    if (step === 0 && !employee)
      return setError("Select an employee to continue.");
    if (step === 1) {
      if (!destination) return setError("Enter the destination country.");
      if (!host.trim())
        return setError(
          "Enter a host organization or contact. If it is unknown, enter “To confirm”.",
        );
      if (dateError) return setError(dateError);
      if (
        (activity === "work" || activity === "other") &&
        !activityDetail.trim()
      )
        return setError(
          "Briefly describe the planned activities so the review question is specific.",
        );
    }
    if (step === 1) setConfirmed(false);
    setError("");
    setStep((value) => Math.min(value + 1, 2));
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function finish() {
    if (!employee || !confirmed)
      return setError("Confirm the answer review before creating the case.");
    let createdId = "";
    update((draft) => {
      const created = createCase(draft, {
        employeeId,
        country: destination,
        purpose,
        host: host.trim(),
        start,
        end,
        route,
      });
      createdId = created.id;
      created.routeConfirmed = false;
      created.intake = {
        nationality: travelNationality.trim(),
        passportNationality: passportNationality.trim(),
        currentPermission,
        eligibility,
        eligibilityChecked,
        activity,
        activityDetail: activityDetail.trim(),
      };
      if (reviewQuestion) {
        created.reviewQuestion = reviewQuestion;
        const reviewItems = created.requirements.filter((item) =>
          /assigned route review|work-authorization route assessment/i.test(
            item.name,
          ),
        );
        reviewItems.forEach((item) => {
          item.assignee = "Unassigned";
          item.status = "requested";
        });
        draft.threads.push({
          id: `thread-review-${crypto.randomUUID()}`,
          title: "Advice needed: confirm the appropriate entry route",
          employeeId,
          caseId: created.id,
          audience: "internal",
          assignee: "Unassigned",
          unread: false,
          status: "open",
          requirementIds: reviewItems.map((item) => item.id),
          messages: [
            {
              id: `message-${crypto.randomUUID()}`,
              author: draft.profile.name,
              body: reviewQuestion,
              at: draft.clock,
              audience: "internal",
            },
          ],
        });
      }
      addHistory(
        draft,
        `Intake reviewed: ${purpose}; host ${host.trim()}; ${start} to ${end}; nationality ${travelNationality || "to confirm"}.${destination === "United Kingdom" ? ` Traveling passport nationality: ${passportNationality || "to confirm"}; current UK permission: ${currentPermission}; declared eligibility: ${eligibility || "not yet checked"}; official eligibility check confirmed: ${eligibilityChecked ? "yes" : "no"}.` : ""}${activityDetail ? ` Activity details: ${activityDetail.trim()}` : ""} Proposed route requires confirmation.`,
        created.id,
      );
    }, "Case created with a named preparation checklist.");
    if (createdId) navigate(`/cases/${createdId}`);
  }

  return (
    <div className="intake-page">
      <Link to="/cases" className="back-link">
        <ArrowLeft size={15} />
        Cases
      </Link>
      <PageHeading
        eyebrow="START SOMETHING WELL PREPARED"
        title="New case"
        description="A few details. A clear path to the right documents."
      />
      <div className="intake-steps" aria-label="Case intake progress">
        {["Choose employee", "Plan the trip", "Review & create"].map(
          (label, index) => (
            <button
              key={label}
              className={`intake-step ${step === index ? "active" : ""} ${step > index ? "complete" : ""}`}
              onClick={() => {
                if (index < step) {
                  setStep(index);
                  setError("");
                }
              }}
              disabled={index > step}
              aria-current={step === index ? "step" : undefined}
            >
              <span>{step > index ? <Check size={15} /> : index + 1}</span>
              {label}
              {index < 2 && (
                <ChevronRight className="intake-step-chevron" size={16} />
              )}
            </button>
          ),
        )}
      </div>
      <div className="intake-layout">
        <Card className="intake-main">
          {step === 0 && (
            <>
              <div className="section-heading">
                <div>
                  <h2>Who is traveling?</h2>
                  <p className="muted">
                    Search your employee directory. We’ll reuse the details
                    already on file.
                  </p>
                </div>
                <UserRound size={22} />
              </div>
              <label className="search-input intake-search">
                <Search size={18} />
                <input
                  aria-label="Search employees"
                  placeholder="Search name, employee number or email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <div className="intake-employees" aria-label="Choose an employee">
                {filteredEmployees.slice(0, 12).map((item) => (
                  <button
                    key={item.id}
                    className={`intake-employee ${employeeId === item.id ? "selected" : ""}`}
                    onClick={() => chooseEmployee(item.id)}
                    aria-pressed={employeeId === item.id}
                  >
                    <Avatar employee={item} />
                    <span className="intake-employee-name">
                      <strong>{item.name}</strong>
                      <small>
                        {item.employeeNumber} · {item.department}
                      </small>
                    </span>
                    <span className="muted intake-employee-office">
                      {item.homeOffice}
                    </span>
                    {employeeId === item.id ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <span className="selection-circle" />
                    )}
                  </button>
                ))}
                {filteredEmployees.length === 0 && (
                  <div className="empty">
                    <Search size={25} />
                    <h3>No employees found</h3>
                    <p>Try a name, email address or employee number.</p>
                  </div>
                )}
              </div>
              {filteredEmployees.length > 12 && (
                <p className="muted">
                  Showing 12 of {filteredEmployees.length} employees. Search to
                  narrow the list.
                </p>
              )}
            </>
          )}
          {step === 1 && (
            <>
              <div className="section-heading">
                <div>
                  <h2>Tell us about the trip</h2>
                  <p className="muted">
                    Activities and the traveling passport determine what needs
                    checking.
                  </p>
                </div>
                <Globe2 size={22} />
              </div>
              {employee && (
                <div className="intake-selected">
                  <Avatar employee={employee} size="sm" />
                  <strong>{employee.name}</strong>
                  <span className="muted">{employee.employeeNumber}</span>
                  <button className="text-link" onClick={() => setStep(0)}>
                    Change
                  </button>
                </div>
              )}
              <div className="grid-2">
                <Field label="Destination country">
                  <select
                    value={country}
                    onChange={(event) => {
                      setCountry(event.target.value);
                      setEligibilityChecked(false);
                    }}
                  >
                    <option>Vietnam</option>
                    <option>United Kingdom</option>
                    <option>Other</option>
                  </select>
                </Field>
                {country === "Other" ? (
                  <Field label="Country name">
                    <input
                      value={otherCountry}
                      onChange={(event) => setOtherCountry(event.target.value)}
                      placeholder="Enter destination"
                    />
                  </Field>
                ) : (
                  <Field
                    label="Host organization or contact"
                    hint="Use the legal host name if known."
                  >
                    <input
                      value={host}
                      onChange={(event) => setHost(event.target.value)}
                      placeholder="e.g. local company or office"
                    />
                  </Field>
                )}
                {country === "Other" && (
                  <Field label="Host organization or contact">
                    <input
                      value={host}
                      onChange={(event) => setHost(event.target.value)}
                      placeholder="Host name or To confirm"
                    />
                  </Field>
                )}
                <Field label="Planned entry">
                  <input
                    type="date"
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                  />
                </Field>
                <Field label="Planned return">
                  <input
                    type="date"
                    value={end}
                    min={start}
                    onChange={(event) => setEnd(event.target.value)}
                  />
                </Field>
              </div>
              {dateError && <p className="field-error">{dateError}</p>}
              <fieldset className="intake-activities">
                <legend>What will the employee do?</legend>
                <div className="grid-2">
                  {activityOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`intake-activity ${activity === option.value ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="activity"
                        value={option.value}
                        checked={activity === option.value}
                        onChange={() => {
                          setActivity(option.value);
                          setConfirmed(false);
                        }}
                      />
                      <span>
                        <strong>{option.title}</strong>
                        <small>{option.detail}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field
                label={
                  activity === "work" || activity === "other"
                    ? "Describe the activities"
                    : "Activity details (optional)"
                }
                hint={
                  activity === "work"
                    ? "Include duties, employer and whether the employee will be paid locally."
                    : undefined
                }
              >
                <textarea
                  rows={2}
                  value={activityDetail}
                  onChange={(event) => setActivityDetail(event.target.value)}
                  placeholder="A short description helps the coordinator confirm the route."
                />
              </Field>
              {country === "Vietnam" &&
                activity !== "work" &&
                activity !== "other" && (
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={evisaComparison}
                      onChange={(event) =>
                        setEvisaComparison(event.target.checked)
                      }
                    />
                    <span>
                      Assess the separate e-visa route instead of a sponsored
                      business route
                      <small>
                        Activities and entry conditions still need confirmation.
                        An e-visa does not establish work permission.
                      </small>
                    </span>
                  </label>
                )}
              {country === "United Kingdom" && (
                <div className="intake-uk stack">
                  <div>
                    <h3>Check UK entry eligibility</h3>
                    <p className="muted">
                      Nationality, the traveling passport and existing
                      permission affect whether an ETA, visitor visa or
                      exemption applies.
                    </p>
                  </div>
                  <div className="grid-2">
                    <Field label="Employee nationality">
                      <input
                        value={travelNationality}
                        onChange={(event) => {
                          setNationality(event.target.value);
                          setEligibilityChecked(false);
                        }}
                        placeholder="Nationality"
                      />
                    </Field>
                    <Field label="Nationality of traveling passport">
                      <input
                        value={passportNationality}
                        onChange={(event) => {
                          setPassportNationality(event.target.value);
                          setEligibilityChecked(false);
                        }}
                        placeholder="Passport nationality"
                      />
                    </Field>
                    <Field label="Existing UK permission or exemption?">
                      <select
                        value={currentPermission}
                        onChange={(event) => {
                          setCurrentPermission(event.target.value);
                          setEligibilityChecked(false);
                        }}
                      >
                        <option value="unknown">Not yet confirmed</option>
                        <option value="none">
                          Confirmed: no existing permission or exemption
                        </option>
                        <option value="yes">
                          Yes — needs checking against this visit
                        </option>
                      </select>
                    </Field>
                    <Field label="Official eligibility check indicates">
                      <select
                        value={eligibility}
                        onChange={(event) => {
                          setEligibility(event.target.value as Eligibility);
                          setEligibilityChecked(false);
                        }}
                      >
                        <option value="">Select after checking</option>
                        <option value="eta">
                          Eligible to apply for an ETA
                        </option>
                        <option value="visa">
                          Standard Visitor visa required
                        </option>
                        <option value="exempt">An exemption may apply</option>
                        <option value="unsure">
                          I’m not sure — request review
                        </option>
                      </select>
                    </Field>
                  </div>
                  <ExternalLink href="https://www.gov.uk/check-uk-visa">
                    Check the current GOV.UK requirements
                  </ExternalLink>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={eligibilityChecked}
                      onChange={(event) =>
                        setEligibilityChecked(event.target.checked)
                      }
                    />
                    <span>
                      I checked the traveling passport, nationality and current
                      circumstances against official guidance.
                    </span>
                  </label>
                </div>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <div className="section-heading">
                <div>
                  <h2>Ready for a clear next step</h2>
                  <p className="muted">
                    Review the facts and proposed route before creating the
                    checklist.
                  </p>
                </div>
                <FileText size={22} />
              </div>
              {employee && (
                <div className="intake-review-person">
                  <Avatar employee={employee} size="lg" />
                  <div>
                    <h3>{employee.name}</h3>
                    <p className="muted">
                      {employee.employeeNumber} · {employee.department}
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => setStep(0)}>
                    Edit employee
                  </Button>
                </div>
              )}
              <dl className="intake-review-grid">
                <div>
                  <dt>Destination</dt>
                  <dd>{destination}</dd>
                </div>
                <div>
                  <dt>Purpose</dt>
                  <dd>{purpose}</dd>
                </div>
                <div>
                  <dt>Trip dates</dt>
                  <dd>
                    {formatDate(start)} – {formatDate(end)}
                  </dd>
                </div>
                <div>
                  <dt>Host</dt>
                  <dd>{host}</dd>
                </div>
                <div>
                  <dt>Nationality</dt>
                  <dd>{travelNationality || "To confirm"}</dd>
                </div>
                <div>
                  <dt>Assigned to</dt>
                  <dd>{state.profile.name}</dd>
                </div>
              </dl>
              <button className="text-link" onClick={() => setStep(1)}>
                Edit trip details <ArrowRight size={14} />
              </button>
              <div
                className={`callout intake-route ${reviewQuestion ? "callout-amber" : ""}`}
              >
                <div className="row">
                  <ShieldQuestion size={20} />
                  <strong>
                    {reviewQuestion
                      ? "Advice needed before selecting a route"
                      : guide.title}
                  </strong>
                  <Badge tone={reviewQuestion ? "amber" : "purple"}>
                    {reviewQuestion ? "Review required" : "Proposed route"}
                  </Badge>
                </div>
                <p>{reviewQuestion || guide.scope}</p>
                {!reviewQuestion && <p className="muted">{guide.excludes}</p>}
                <p className="muted">
                  {reviewQuestion
                    ? "We’ll create a specific, unassigned review request alongside the case. You can begin gathering facts while the route is checked."
                    : "The coordinator must confirm the route and issuing-office requirements. A prepared checklist does not grant permission to travel."}
                </p>
              </div>
              <div className="intake-generation">
                <h3>What happens when you create this case</h3>
                <ul>
                  <li>
                    <CheckCircle2 size={17} />A route-specific list of named
                    documents and preparation steps
                  </li>
                  <li>
                    <CheckCircle2 size={17} />
                    Employee, HR and host assignments, with internal action
                    targets
                  </li>
                  <li>
                    <CheckCircle2 size={17} />
                    Document reuse and requests for the items still missing
                  </li>
                </ul>
                <p className="muted">
                  Requests are prepared locally. No email, payment or official
                  application is sent.
                </p>
              </div>
              <label className="checkbox-row intake-confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>
                  I reviewed these details and understand that the proposed
                  route needs confirmation.
                </span>
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="intake-footer">
            <Button
              variant="ghost"
              onClick={() =>
                step === 0 ? navigate("/cases") : setStep((value) => value - 1)
              }
            >
              <ArrowLeft size={16} />
              {step === 0 ? "Cancel" : "Back"}
            </Button>
            {step < 2 ? (
              <Button onClick={next}>
                Continue
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button onClick={finish} disabled={!confirmed}>
                Create case
                <Check size={17} />
              </Button>
            )}
          </div>
        </Card>
        <aside className="intake-aside stack">
          <Card className="intake-preset">
            <span className="intake-aside-icon">
              <Sparkles size={22} />
            </span>
            <Badge tone="purple">A useful starting point</Badge>
            <h3>Short business trip</h3>
            <p>
              A 10-day Vietnam meeting trip with Casey Chen. Review the host and
              dates, then build the document checklist.
            </p>
            <Button variant="secondary" onClick={preset}>
              Use business-trip preset
              <ArrowRight size={16} />
            </Button>
          </Card>
          <div className="intake-help">
            <h3>Built around the actual trip.</h3>
            <p>
              <BriefcaseBusiness size={18} />A meeting visit and a work
              placement follow different paths.
            </p>
            <p>
              <CalendarDays size={18} />
              Trip dates inform internal targets, not guaranteed processing.
            </p>
            <p>
              <ShieldQuestion size={18} />
              Uncertain details become a specific question for review.
            </p>
          </div>
          {step > 0 && employee && (
            <Card className="intake-summary">
              <span className="eyebrow">YOUR CASE SO FAR</span>
              <h3>{employee.name}</h3>
              <p>{destination || "Destination to confirm"}</p>
              <p className="muted">
                {formatDate(start)} – {formatDate(end)}
              </p>
              <Badge tone={reviewQuestion ? "amber" : "purple"}>
                {reviewQuestion ? "Route needs review" : guide.short}
              </Badge>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

export default IntakePage;
