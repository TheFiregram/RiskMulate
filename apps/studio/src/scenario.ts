export type RiskKey =
  | "security"
  | "operations"
  | "finance"
  | "legal"
  | "trust"
  | "safety"
  | "evidence";
export type RiskState = Record<RiskKey, number>;

export interface Action {
  id: string;
  label: string;
  detail: string;
  station: StationId;
  effects: Partial<RiskState>;
  followup: string;
}

export type StationId =
  | "cctv"
  | "evidence"
  | "comms"
  | "network"
  | "news"
  | "risk"
  | "employee"
  | "executive";

export const stations: Record<StationId, { label: string; code: string; description: string }> = {
  risk: {
    label: "Risk Dashboard",
    code: "RISK / 06",
    description: "Live threat correlation and operational exposure.",
  },
  news: {
    label: "News Monitor",
    code: "MEDIA / 05",
    description: "Breaking coverage, rumours, and public sentiment.",
  },
  employee: {
    label: "Employee Directory",
    code: "PEOPLE / 07",
    description: "Identity, access, trust, and interview status.",
  },
  executive: {
    label: "Executive Briefing",
    code: "EXEC / 08",
    description: "Convene leadership and commit strategic decisions.",
  },
  evidence: {
    label: "Evidence Board",
    code: "FORENSICS / 02",
    description: "Inspect, tag, and preserve the emerging chain of custody.",
  },
  network: {
    label: "Network Control",
    code: "SYSTEMS / 03",
    description: "Aegis infrastructure, segmentation and recovery controls.",
  },
  comms: {
    label: "Crisis Comms",
    code: "COMMS / 04",
    description: "Department channels, executive calls, and public response.",
  },
  cctv: {
    label: "CCTV Wall",
    code: "SECURITY / 05",
    description: "Procedural reconstruction of after-hours badge activity.",
  },
};

export const actions: Action[] = [
  {
    id: "preserve",
    label: "Preserve transfer image",
    detail: "Freeze a forensic copy before the unstable server rotates its logs.",
    station: "evidence",
    effects: { evidence: 16, security: -4, operations: -3 },
    followup:
      "Maya: Forensic image sealed. The transfer used Lena's credentials—but not her workstation.",
  },
  {
    id: "verify",
    label: "Verify contractor badge",
    detail: "Ask physical security to reconcile the after-hours access trail.",
    station: "cctv",
    effects: { evidence: 10, security: -7 },
    followup:
      "Iris: Camera 07 shows Noah Grant tailgating before the badge event. Timestamp offset confirmed.",
  },
  {
    id: "isolate",
    label: "Segment finance servers",
    detail: "Contain outbound traffic at the cost of acquisition operations.",
    station: "network",
    effects: { security: -20, operations: -14, finance: 8 },
    followup:
      "Marcus: Segment isolated. Malware beacon stopped; the board's transaction desk is now offline.",
  },
  {
    id: "legal",
    label: "Open privileged response",
    detail: "Bring Legal into the evidence workflow and protect the investigation.",
    station: "comms",
    effects: { legal: -17, evidence: 6, trust: -2 },
    followup:
      "Daniel: Hold notices are moving. Do not confront Lena until we know who cloned her token.",
  },
  {
    id: "transparent",
    label: "Prepare controlled disclosure",
    detail: "Put Sofia ahead of the journalist with a verified holding statement.",
    station: "comms",
    effects: { trust: 17, legal: -6, finance: 5 },
    followup: "Sofia: Statement is ready. We acknowledge disruption without naming an employee.",
  },
  {
    id: "accuse",
    label: "Suspend Lena publicly",
    detail: "Act decisively on the apparent insider before all telemetry is verified.",
    station: "employee",
    effects: { security: -5, trust: -23, legal: 24, evidence: -15 },
    followup:
      "Elena: Lena denies it. Her counsel says she was on a flight when the token was used.",
  },
];

export const evidence = [
  {
    id: "transfer",
    time: "08:42",
    title: "2.4 GB outbound transfer",
    source: "DLP SENSOR",
    body: "Encrypted acquisition archive staged through FIN-SRV-04. User token: LPRICE. Device fingerprint does not match Lena's assigned hardware.",
  },
  {
    id: "badge",
    time: "22:17",
    title: "Contractor badge anomaly",
    source: "PHYSICAL ACCESS",
    body: "Noah Grant's expired contractor badge opened Level 4. Camera clock drift: +03:14. A second silhouette entered in the door cycle.",
  },
  {
    id: "usb",
    time: "07:58",
    title: "Unregistered USB record",
    source: "ENDPOINT LOG",
    body: "Mass-storage serial appears on Lena's laptop. Manager report says IT issued a recovery key yesterday, but the serials conflict.",
  },
  {
    id: "ledger",
    time: "09:03",
    title: "Black ledger payment",
    source: "FINANCE CONTROL",
    body: "Three consulting payments split below approval threshold. Beneficiary resolves to a dormant vendor connected to Grant.",
  },
];

export const initialRisks: RiskState = {
  security: 61,
  operations: 88,
  finance: 33,
  legal: 29,
  trust: 76,
  safety: 92,
  evidence: 44,
};

export function outcome(completed: string[], risks: RiskState) {
  if (completed.includes("accuse"))
    return {
      title: "WRONG TARGET",
      tone: "critical",
      text: "A public accusation shattered the investigation. Lena's token was cloned; the coordinated actors used the distraction to erase their exit trail.",
    };
  if (
    completed.includes("preserve") &&
    completed.includes("verify") &&
    completed.includes("isolate")
  )
    return {
      title: "COORDINATED THREAT",
      tone: "success",
      text: "The contractor access, cloned token, and malware beacon converge. Aegis contains a coordinated attack and preserves the evidence needed to identify the network.",
    };
  if (risks.security > 70 || risks.operations < 55)
    return {
      title: "OPERATIONAL COLLAPSE",
      tone: "critical",
      text: "The intrusion outpaced containment. Finance systems failed as the acquisition documents surfaced across public channels.",
    };
  if (completed.includes("transparent"))
    return {
      title: "CONTROLLED DISCLOSURE",
      tone: "warning",
      text: "Aegis contains the immediate incident and controls the first public account, but regulatory scrutiny has begun.",
    };
  return {
    title: "SILENT CONTAINMENT",
    tone: "success",
    text: "The immediate leak is contained without public confirmation, though the architect of the intrusion remains uncertain.",
  };
}
