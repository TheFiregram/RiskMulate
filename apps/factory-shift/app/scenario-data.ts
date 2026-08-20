export type EvidenceId = "EV-01" | "EV-02" | "EV-03" | "EV-04";
export type DecisionId = "monitor" | "transfer" | "repair";
export type ScenarioPhase = "briefing" | "inspection" | "decision" | "consequence" | "debrief";

export type EvidencePoint = {
  id: EvidenceId;
  code: string;
  worldLabel: string;
  title: string;
  prompt: string;
  detail: string;
  reading: string;
  significance: string;
  position: readonly [number, number, number];
  range: number;
};

export const EVIDENCE_POINTS: EvidencePoint[] = [
  {
    id: "EV-01",
    code: "01",
    worldLabel: "VIBRATION",
    title: "Vibration transmitter",
    prompt: "Read local vibration",
    detail: "P-204 reads 11.8 mm/s RMS. The advisory limit is 9.0; automatic trip is 12.5.",
    reading: "11.8 mm/s",
    significance: "Close to trip, yet still inside the automatic protection limit.",
    position: [-0.35, 2.42, -8.72],
    range: 5.4,
  },
  {
    id: "EV-02",
    code: "02",
    worldLabel: "BEARING",
    title: "Drive-end bearing housing",
    prompt: "Check bearing condition",
    detail: "Surface temperature is 78°C with a repeating mechanical knock. Lubrication service is 16 days overdue.",
    reading: "78°C · periodic knock",
    significance: "The pattern supports mechanical wear, not a harmless change in operating load.",
    position: [-1.4, 1.72, -8.76],
    range: 5.0,
  },
  {
    id: "EV-03",
    code: "03",
    worldLabel: "SEAL",
    title: "Mechanical seal drain",
    prompt: "Inspect seal and drain",
    detail: "Fresh process mist is escaping at the seal. The drain tray contains a new wet patch.",
    reading: "Active trace leak",
    significance: "This contradicts the night operator report and shows the fault is changing.",
    position: [2.28, 1.7, -9.48],
    range: 4.8,
  },
  {
    id: "EV-04",
    code: "04",
    worldLabel: "STANDBY LINE",
    title: "P-205 isolation and readiness",
    prompt: "Verify standby path",
    detail: "P-205 passed its 05:58 remote test. Suction is open, discharge is shut, and the line is ready for a warm transfer.",
    reading: "Standby verified",
    significance: "A controlled alternative exists without leaving the filtration line unsupported.",
    position: [5.55, 2.42, -9.98],
    range: 5.6,
  },
];

export type DecisionOption = {
  id: DecisionId;
  number: string;
  title: string;
  command: string;
  protects: string;
  exposes: string;
  control: string;
};

export const DECISIONS: DecisionOption[] = [
  {
    id: "monitor",
    number: "01",
    title: "Continue P-204",
    command: "Keep P-204 online under strict monitoring.",
    protects: "Restart window and immediate flow",
    exposes: "Bearing and seal deterioration",
    control: "Trip at 12.2 mm/s or any leak increase",
  },
  {
    id: "transfer",
    number: "02",
    title: "Transfer to P-205",
    command: "Start P-205, prove discharge pressure, then isolate P-204.",
    protects: "Process continuity and damaged asset",
    exposes: "Short pressure dip during handover",
    control: "Hold P-204 until P-205 reaches 4.8 bar",
  },
  {
    id: "repair",
    number: "03",
    title: "Stop and repair",
    command: "Isolate P-204 and defer restart for planned maintenance.",
    protects: "People, equipment, and containment",
    exposes: "Storage header and restart deadline",
    control: "Lockout, drain, inspect bearing and seal",
  },
];

export type DecisionOutcome = {
  id: DecisionId;
  label: string;
  verdict: string;
  score: number;
  tone: "poor" | "balanced" | "safe";
  stages: readonly [string, string, string];
  event: string;
  consequence: string;
  treatment: string;
  residual: string;
  metrics: readonly [number, number, number];
};

export const OUTCOMES: Record<DecisionId, DecisionOutcome> = {
  monitor: {
    id: "monitor",
    label: "P-204 held online",
    verdict: "Production protected; mechanical control failed",
    score: 46,
    tone: "poor",
    stages: ["Monitoring limit armed", "Vibration rises through 12.2 mm/s", "P-204 trips before manual transfer"],
    event: "The damaged bearing accelerates under restart load and the seal leak grows.",
    consequence: "Automatic protection trips P-204. Header pressure collapses during an unplanned transfer.",
    treatment: "The trip prevents a larger equipment failure, yet the response arrives after control is lost.",
    residual: "High: P-204 is damaged and Line 2 misses the stable restart window.",
    metrics: [42, 55, 31],
  },
  transfer: {
    id: "transfer",
    label: "Warm transfer to P-205",
    verdict: "Controlled recovery with the strongest risk balance",
    score: 92,
    tone: "balanced",
    stages: ["P-205 starts against closed discharge", "Discharge pressure proves at 4.9 bar", "Flow transfers; P-204 is isolated"],
    event: "The standby pump takes load before the degraded pump leaves service.",
    consequence: "Header pressure dips for 42 seconds. Filtration remains inside its quality limit.",
    treatment: "P-204 is removed from duty and released for bearing and seal work.",
    residual: "Low: P-205 carries the line with inspection due after the first operating hour.",
    metrics: [91, 88, 94],
  },
  repair: {
    id: "repair",
    label: "P-204 isolated for repair",
    verdict: "Safe equipment choice with an operational cost",
    score: 77,
    tone: "safe",
    stages: ["P-204 stop command accepted", "Suction and discharge isolated", "Maintenance lockout established"],
    event: "The degraded asset is removed before the bearing or seal can fail further.",
    consequence: "No spill or equipment damage occurs. The storage header falls below its restart minimum.",
    treatment: "Maintenance receives a stable, isolated asset and a clear fault trail.",
    residual: "Medium: the batch is delayed and Line 2 needs a revised restart plan.",
    metrics: [98, 34, 92],
  },
};

export function evidenceById(id: EvidenceId | null) {
  return EVIDENCE_POINTS.find((point) => point.id === id) ?? null;
}
