import type { Requirement, RouteGuide, RouteId } from "./types";
import { dateOnly } from "./dates";

export const TEMPLATE_VERSION = 3;
const checked = "2026-10-20";
const urls = {
  categories:
    "https://congan.haiphong.gov.vn/Phap-che-QLKH-CDS/Luat-sua-doi-bo-sung-mot-so-dieu-cua-Luat-Nhap-canh-xuat-canh-qua-canh-cu-tru-cua-nguoi-nuoc-ngoai-tai-Viet-Nam-so-512019QH14-12475.html",
  embassy: "https://vietnamembassy-usa.org/vi/node/6147",
  sponsor:
    "https://dichvucong.bocongan.gov.vn/public/link-to/chi-tiet-thu-tuc?ma-thu-tuc=26692",
  forms:
    "https://bocongan.gov.vn/bai-viet/nhung-diem-moi-theo-thong-tu-so-70-2026-tt-bca-1786525709",
  fees: "https://en.baochinhphu.vn/renewed-fees-on-entry-exit-transit-residence-in-viet-nam-111260401112530125.htm",
  evisa: "https://evisa.gov.vn/?option=MO",
  activities: "https://www.gov.uk/standard-visitor/visit-on-business",
  eta: "https://www.gov.uk/eta/apply",
  etaScope: "https://www.gov.uk/eta",
  visitor: "https://www.gov.uk/standard-visitor/apply-standard-visitor-visa",
  evidence:
    "https://www.gov.uk/government/publications/visitor-visa-guide-to-supporting-documents/guide-to-supporting-documents-visiting-the-uk",
};
const source = (label: string, url: string) => ({ label, url });
const sponsorSources = [
  source("Vietnam business categories (category reference)", urls.categories),
  source("Embassy checklist", urls.embassy),
  source("Sponsor entry-approval procedure", urls.sponsor),
  source("Current forms — Circular 70/2026, effective 1 July 2026", urls.forms),
  source("Government fee schedule — effective 1 April 2026", urls.fees),
];
const sponsored = (id: "vn-dn1" | "vn-dn2"): RouteGuide => ({
  id,
  country: "Vietnam",
  title:
    id === "vn-dn1"
      ? "DN1 · Sponsored business visit"
      : "DN2 · Services & commercial presence",
  short:
    id === "vn-dn1"
      ? "Meetings with an established Vietnamese host"
      : "Offering services or establishing commercial presence",
  purpose:
    id === "vn-dn1"
      ? "Business meetings with a legally established Vietnamese enterprise or organization."
      : "Offering services, establishing commercial presence or activities under a relevant international treaty.",
  scope:
    id === "vn-dn1"
      ? "Confirm nationality, current permission, host identity, activities and visa collection office before confirming DN1."
      : "Confirm the service activity, commercial-presence plan or treaty basis with the sponsor before confirming DN2.",
  excludes:
    "DN1 and DN2 are distinct categories. Neither establishes blanket employment permission. Hands-on technical work needs a separate work-authorization assessment.",
  fee: "USD25 single entry · USD50 multiple entry under 90 days",
  feeScope:
    "Government schedule reference, effective 1 April 2026; not an all-in consular quote. Confirm office charges, service, courier and payment costs with issuing office.",
  timing:
    "Sponsor foreign-mission collection branch: five working days after a complete dossier. Issuing-office time: confirm current. Internal targets T−21 / T−14 are company preparation targets.",
  officialUrl: urls.sponsor,
  sourceChecked: checked,
  sources: sponsorSources,
  steps: [
    "Confirm traveler, actual activities, host identity, intended entry/exit and collection office.",
    "Check current passport and photo records; confirm issuing-office requirements.",
    "Host checks company authorization/setup and prepares the current sponsor request (NA2).",
    "Review signed sponsor request and returned entry approval; prepare the traveler dossier.",
    "Applicant or authorized sponsor submits through the official channel; retain reference and date.",
    "Record the authority result separately; check traveler details, permission validity and departure arrangements.",
  ],
  employeeItems: [
    "Passport photo page; check six months validity before entry for the selected Embassy route",
    "Photograph(s) to the selected issuing office specifications",
    "Visa application details and office-specific application",
    "Payment / return envelope if required by the chosen collection method",
  ],
  hostItems: [
    id === "vn-dn1"
      ? "Host invitation and established Vietnamese organization details"
      : "Service/commercial-presence or treaty basis and host details",
    "Company authorization/setup evidence where applicable",
    "Current NA2 sponsor request; authorized signature and official account",
    "Returned sponsor entry approval, separate from the host invitation",
  ],
});
export const routeGuides: RouteGuide[] = [
  sponsored("vn-dn1"),
  sponsored("vn-dn2"),
  {
    id: "vn-evisa",
    country: "Vietnam",
    title: "E-visa · Short visit",
    short: "Separate online route to assess for the actual visit",
    purpose:
      "Eligible short visits through the official Vietnam electronic visa portal, for up to 90 days.",
    scope:
      "Check traveler eligibility, actual activities, entry point and passport details on the official portal.",
    excludes:
      "An e-visa is separate from DN1/DN2. Do not assume employment or hands-on work authorization. Sponsor-route forms are not automatic e-visa requirements.",
    fee: "USD25 single entry · USD50 multiple entry",
    feeScope:
      "Official e-visa fee reference; verify route, entry type and current payment conditions. Other charges are not included.",
    timing:
      "Confirm current processing guidance on the official portal; allow preparation time. No guaranteed approval or departure date.",
    officialUrl: urls.evisa,
    sourceChecked: checked,
    sources: [source("Vietnam official e-visa portal", urls.evisa)],
    steps: [
      "Check nationality, activities, passport and entry point against current official eligibility.",
      "Prepare passport image, portrait and intended trip details to portal specifications.",
      "Review every field and entry type with the traveler before opening the official portal.",
      "Applicant submits and pays on the official portal; record the reference when available.",
      "Record the authority result and check name, passport, entry point and validity before departure.",
    ],
    employeeItems: [
      "Passport image to portal specifications",
      "Portrait to portal specifications",
      "Intended dates, entry/exit point and accommodation details",
    ],
    hostItems: [
      "Host/accommodation details when relevant; no automatic NA2 sponsor request",
    ],
  },
  {
    id: "uk-eta",
    country: "United Kingdom",
    title: "ETA · Business meetings",
    short: "Electronic travel authorization for an eligible visitor",
    purpose:
      "Meetings, conferences and other permitted visitor activities for a traveler confirmed eligible for ETA.",
    scope:
      "Nationality and current UK status determine eligibility or exemption. Confirm the traveling passport; ETA is electronically linked to it.",
    excludes:
      "ETA does not establish permission for unrestricted work or guarantee entry. A replacement passport requires an eligibility/ETA check. No visa-sticker upload is required.",
    fee: "GBP20",
    feeScope:
      "Official ETA application fee reference. Payment is made through the official app or online service.",
    timing:
      "Usually within a day; may take three working days. Valid for two years or until passport expiry, whichever comes first. These are conditions and estimates, not guarantees.",
    officialUrl: urls.eta,
    sourceChecked: checked,
    sources: [
      source("ETA application, fee and validity", urls.eta),
      source("Eligibility and entry conditions", urls.etaScope),
      source("Permitted visitor business activities", urls.activities),
    ],
    steps: [
      "Confirm nationality, current status, permitted activities and ETA eligibility.",
      "Collect the traveling passport, email and payment method; check app/online photo conditions.",
      "Review the editable preparation summary. Traveler completes declarations and any required live face checks.",
      "Applicant or permitted representative applies using the official service and records the reference.",
      "Record the electronic result, passport linkage and validity; check departure requirements.",
    ],
    employeeItems: [
      "Traveling passport",
      "Face and passport photos for the chosen application method",
      "Email and payment method",
      "Traveler declarations and live face check when required",
    ],
    hostItems: [
      "Meeting purpose, UK host and intended travel details; supporting information if needed",
    ],
  },
  {
    id: "uk-visitor",
    country: "United Kingdom",
    title: "Standard Visitor · Business visit",
    short: "Visitor visa for a visa-required traveler",
    purpose:
      "Permitted business visitor activities, such as meetings and contract negotiation, for a traveler who requires a visa.",
    scope:
      "Confirm nationality, current status, purpose, funds and intended dates. Apply online before travel and attend the visa-centre appointment.",
    excludes:
      "Visitor permission does not allow unrestricted UK employment. Supporting evidence depends on individual circumstances; every item in general guidance is not mandatory.",
    fee: "GBP135 · standard six-month visa",
    feeScope:
      "Official standard six-month application fee reference. Optional service, appointment, translation and courier charges may differ; confirm current charges.",
    timing:
      "Complete the online application and visa-centre appointment before travel. Confirm current processing times; preparation and decision time are separate.",
    officialUrl: urls.visitor,
    sourceChecked: checked,
    sources: [
      source("Standard Visitor application and fee", urls.visitor),
      source(
        "Supporting evidence guidance — updated 8 October 2026",
        urls.evidence,
      ),
      source("Permitted business activities", urls.activities),
    ],
    steps: [
      "Confirm permitted business purpose and that a Standard Visitor visa is required.",
      "Prepare passport, proposed visit details and relevant purpose/funding evidence.",
      "Review application answers with the traveler and open the official online application.",
      "Applicant completes application, payment and visa-centre identity/biometric appointment.",
      "Retain reference and receipt; record authority decision and check validity before travel.",
    ],
    employeeItems: [
      "Current passport / travel document",
      "Application answers and identity appointment",
      "Funding and personal-circumstances evidence where relevant",
    ],
    hostItems: [
      "Invitation or meeting details where relevant",
      "Employer / funding confirmation where relevant",
    ],
  },
  {
    id: "work-review",
    country: "Vietnam",
    title: "Work authorization assessment",
    short: "Technical work, placement or employment",
    purpose:
      "Assess hands-on technical work, a longer placement or employment before selecting a work-permission route.",
    scope:
      "Confirm exact duties, duration, employer/host relationship, nationality, qualifications and current permission with a qualified adviser or relevant authority.",
    excludes:
      "A short business visitor checklist cannot determine a six-month engineering placement. DN1, DN2 and e-visa do not by themselves establish work authorization.",
    fee: "Confirm with issuing office",
    feeScope:
      "Route and government/consular charges remain unconfirmed. No all-in quote is recorded.",
    timing:
      "Route-dependent. Obtain an assessment before promising a filing or travel date. Internal action targets do not establish legal deadlines.",
    officialUrl: urls.categories,
    sourceChecked: checked,
    sources: [
      source("Vietnam work and business category reference", urls.categories),
      source("Current official forms and submission methods", urls.forms),
    ],
    steps: [
      "Document actual technical duties, duration, host/employer relationship and current permissions.",
      "Request an assigned work-authorization assessment; keep an explicit Unassigned state until a responder is chosen.",
      "Collect identity and relevant employment/qualification evidence as the selected route requires.",
      "Confirm the current authority route and forms before preparing a filing dossier.",
      "Keep an authority result and permission validity separate from the internal work plan.",
    ],
    employeeItems: [
      "Passport details",
      "Technical duties, qualifications and current permission where relevant",
    ],
    hostItems: [
      "Assignment scope, employer relationship and host details",
      "Work-authorization assessment and route-specific dossier once confirmed",
    ],
  },
  {
    id: "review",
    country: "Other destinations",
    title: "Route & activity review",
    short: "Confirm an appropriate route before filing",
    purpose:
      "A clear intake path when country, nationality, current status or activities require assessment.",
    scope:
      "Record traveler, destination, activities, host, dates and existing permissions. Assign a specific route question.",
    excludes:
      "No Vietnam or UK checklist is automatically copied to unsupported countries. No legal eligibility or fee is assumed.",
    fee: "Confirm with issuing office",
    feeScope: "Route and fees are not yet established.",
    timing:
      "Confirm the route, authority and processing estimate before setting a filing plan.",
    officialUrl: "",
    sourceChecked: checked,
    sources: [],
    steps: [
      "Confirm nationality, destination, activities, host and trip dates.",
      "Write the specific uncertainty and assign the review request.",
      "Check the relevant authority’s current route and document instructions.",
      "Create a route-specific dossier after the question is resolved.",
    ],
    employeeItems: [
      "Passport details and current permissions where relevant",
      "Actual purpose and intended dates",
    ],
    hostItems: [
      "Host identity and activity description",
      "Assigned route question and official authority source",
    ],
  },
];
export function getGuide(route: RouteId): RouteGuide {
  return (
    routeGuides.find((g) => g.id === route) ??
    routeGuides[routeGuides.length - 1]
  );
}

type Seed = Omit<Requirement, "id" | "assignee" | "status" | "due"> & {
  dueOffset?: number;
};
const req = (
  name: string,
  instruction: string,
  party: Requirement["party"],
  stage: Requirement["stage"],
  documentType?: Requirement["documentType"],
  kind: Requirement["kind"] = "required",
  dueOffset?: number,
): Seed => ({ name, instruction, party, stage, documentType, kind, dueOffset });
const passport = req(
  "Passport photo page",
  "Check the current passport version, full name, number and expiry for this trip.",
  "employee",
  "documents",
  "passport",
  "required",
  -21,
);
const routeReview = req(
  "Route and activity confirmation",
  "Confirm nationality, current permission, activity, host and intended dates before confirming this route.",
  "hr",
  "preparation",
  undefined,
  "required",
  -21,
);
const preparation = req(
  "TripWire application preparation draft",
  "Prefill and review traveler, host, purpose and dates. Export a preparation worksheet and dossier index; this is not an official form.",
  "hr",
  "preparation",
  undefined,
  "required",
  -14,
);
const submission = req(
  "Official submission reference",
  "After deliberate external submission, record reference, date and submitting actor. Local preparation does not submit an application.",
  "hr",
  "submission",
);
const decision = req(
  "Authority decision and validity record",
  "Record the actual authority outcome and verify identity, permission dates and conditions separately from document review.",
  "hr",
  "decision",
);
const departure = req(
  "Before-departure checks",
  "Check recorded permission, traveling passport, itinerary, host contact and approved return date.",
  "hr",
  "departure",
  undefined,
  "required",
  -2,
);
export function makeRequirements(route: RouteId, start: string): Requirement[] {
  let seeds: Seed[];
  if (route === "vn-dn1" || route === "vn-dn2")
    seeds = [
      routeReview,
      passport,
      req(
        "Visa photograph(s)",
        "Confirm photo size, count and age requirements with the selected issuing office before collection.",
        "employee",
        "documents",
        "photo",
        "required",
        -21,
      ),
      req(
        route === "vn-dn1"
          ? "Vietnam host invitation and contact details"
          : "Service / commercial-presence basis and host details",
        route === "vn-dn1"
          ? "Record established Vietnamese host identity, invitation, contact and meeting purpose. An invitation is not government approval."
          : "Record the actual service, commercial-presence or treaty basis; do not interchange DN1 and DN2.",
        "host",
        "documents",
        "invitation",
        "required",
        -21,
      ),
      req(
        "Company authorization / sponsor setup",
        "Host confirms whether organization setup evidence, an official account and authorized signature are required.",
        "host",
        "preparation",
        "authorization",
        "conditional",
        -21,
      ),
      req(
        "Sponsor request preparation (current NA2)",
        "Prepare sponsor facts against the current official instructions. Circular 70/2026 updated forms from 1 July 2026; obtain current forms from the authority.",
        "host",
        "preparation",
        undefined,
        "required",
        -14,
      ),
      req(
        "Signed / submitted sponsor request record",
        "Host retains the authorized signed request and its official submission record. TripWire cannot provide a company signature or government account.",
        "host",
        "submission",
        "authorization",
      ),
      req(
        "Returned sponsor entry approval",
        "Record the approval returned by the authority; check the traveler and collection office. Host invitation alone does not complete this step.",
        "host",
        "decision",
        "authorization",
      ),
      preparation,
      req(
        "Issuing-office application and delivery details",
        "Confirm current traveler form, original/copy passport rules, payment, and return envelope if mailing. Confirm charges with issuing office.",
        "employee",
        "preparation",
        undefined,
        "required",
        -14,
      ),
      submission,
      decision,
      departure,
    ];
  else if (route === "vn-evisa")
    seeds = [
      routeReview,
      passport,
      req(
        "Portrait for e-visa application",
        "Use the current official e-visa portal portrait specifications.",
        "employee",
        "documents",
        "photo",
        "required",
        -14,
      ),
      req(
        "Entry point and accommodation details",
        "Confirm intended entry/exit point, address, dates and single/multiple entry selection.",
        "employee",
        "preparation",
        undefined,
        "required",
        -14,
      ),
      preparation,
      submission,
      decision,
      departure,
    ];
  else if (route === "uk-eta")
    seeds = [
      routeReview,
      passport,
      req(
        "Face and passport photos for ETA",
        "Follow the chosen app or online method. The traveler completes any required live face checks; HR cannot automatically perform them.",
        "employee",
        "documents",
        "photo",
        "required",
        -14,
      ),
      req(
        "Email, payment method and traveler declarations",
        "Confirm a reachable email, payment method and traveler declarations without storing card details in TripWire.",
        "employee",
        "preparation",
        undefined,
        "required",
        -14,
      ),
      preparation,
      submission,
      req(
        "ETA electronic result and passport linkage",
        "Record the electronic result, linked passport and validity. An ETA does not require a visa-sticker upload and does not guarantee entry.",
        "hr",
        "decision",
      ),
      departure,
    ];
  else if (route === "uk-visitor")
    seeds = [
      routeReview,
      passport,
      req(
        "Business visit purpose and itinerary",
        "Record the permitted activity, intended dates, UK host and itinerary.",
        "employee",
        "documents",
        undefined,
        "required",
        -21,
      ),
      req(
        "Host invitation / meeting confirmation",
        "Provide an invitation or meeting details where relevant to explain the purpose.",
        "host",
        "documents",
        "invitation",
        "conditional",
        -21,
      ),
      req(
        "Funding and employment evidence",
        "Select relevant funding, personal circumstances and employer evidence. Do not request every document in the general guidance.",
        "employee",
        "documents",
        "other",
        "conditional",
        -21,
      ),
      preparation,
      req(
        "Visa-centre appointment and identity checks",
        "Applicant completes the online application and books/attends the required identity/biometric appointment.",
        "employee",
        "submission",
      ),
      submission,
      decision,
      departure,
    ];
  else if (route === "work-review")
    seeds = [
      req(
        "Technical duties and placement scope",
        "Describe hands-on duties, host/employer relationship, duration and proposed work location. Keep the work purpose explicit.",
        "hr",
        "preparation",
        undefined,
        "required",
        -21,
      ),
      passport,
      req(
        "Work-authorization route assessment",
        "Advice needed: confirm the work-permission route for the six-month technical placement. Assign the request before preparing route-specific forms.",
        "hr",
        "preparation",
        undefined,
        "required",
        -21,
      ),
      req(
        "Employment / qualification evidence inventory",
        "Identify relevant employment, qualifications and current permissions once the assessment establishes what is needed.",
        "employee",
        "documents",
        "other",
        "conditional",
        -14,
      ),
      departure,
    ];
  else
    seeds = [
      req(
        "Trip purpose and route question",
        "Confirm destination, nationality, current permission, actual activities, host and dates; record one specific unresolved route question.",
        "hr",
        "preparation",
        undefined,
        "required",
        -21,
      ),
      req(
        "Assigned route review",
        "Assign the specific uncertainty to a travel adviser or relevant authority; do not assume a route or document list.",
        "hr",
        "preparation",
        undefined,
        "required",
        -14,
      ),
    ];
  return seeds.map((seed, index) => {
    const { dueOffset, ...base } = seed;
    const due =
      dueOffset === undefined || !dateOnly(start)
        ? undefined
        : new Date(
            Date.parse(`${start.slice(0, 10)}T12:00:00Z`) +
              dueOffset * 86400000,
          )
            .toISOString()
            .slice(0, 10);
    return {
      ...base,
      id: `${route}-r${index + 1}`,
      assignee:
        seed.party === "hr"
          ? "Jeffrey Tang"
          : seed.party === "host"
            ? "Local host"
            : "Employee",
      status: "todo",
      due,
    };
  });
}
