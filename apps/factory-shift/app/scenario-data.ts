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

export type FilterDecisionId = "push" | "bypass" | "backwash";

export type FilterDecisionOption = {
  id: FilterDecisionId;
  number: string;
  title: string;
  command: string;
  protects: string;
  exposes: string;
  control: string;
};

export const FILTER_EVIDENCE = [
  { code: "F1", label: "Differential pressure", value: "2.6 bar", meaning: "Above the 2.2 bar backwash trigger." },
  { code: "F2", label: "Finished-water turbidity", value: "0.21 NTU", meaning: "Quality is compliant before intervention." },
  { code: "F3", label: "Backwash status", value: "+9 h overdue", meaning: "Media loading is the credible restriction." },
  { code: "F4", label: "Clearwell buffer", value: "68%", meaning: "Enough stored water exists for one controlled wash." },
] as const;

export const FILTER_DECISIONS: FilterDecisionOption[] = [
  {
    id: "push",
    number: "01",
    title: "Push through F-201",
    command: "Hold the current valve lineup and increase feed pressure.",
    protects: "Immediate filtration rate",
    exposes: "Media breakthrough and pump load",
    control: "Stop at 2.9 bar or 0.30 NTU",
  },
  {
    id: "bypass",
    number: "02",
    title: "Open the bypass",
    command: "Route flow around F-201 until the restart target is met.",
    protects: "Throughput and clearwell level",
    exposes: "Finished-water quality",
    control: "Blend only while turbidity remains compliant",
  },
  {
    id: "backwash",
    number: "03",
    title: "Controlled backwash",
    command: "Draw from the clearwell, isolate F-201, and complete the wash cycle.",
    protects: "Quality and sustainable throughput",
    exposes: "Temporary buffer drawdown",
    control: "Resume feed after 1.1 bar clean-bed proof",
  },
];

export type FilterOutcome = {
  id: FilterDecisionId;
  label: string;
  verdict: string;
  score: number;
  tone: "poor" | "balanced" | "critical";
  event: string;
  consequence: string;
  treatment: string;
  residual: string;
  lesson: string;
  metrics: {
    throughput: number;
    buffer: number;
    quality: number;
    openRisks: number;
  };
};

export const FILTER_OUTCOMES: Record<FilterDecisionId, FilterOutcome> = {
  push: {
    id: "push",
    label: "Restriction forced online",
    verdict: "Short-term flow protected; filter integrity deteriorated",
    score: 43,
    tone: "poor",
    event: "Feed pressure drives the loaded media beyond its stable operating band.",
    consequence: "Differential pressure reaches 3.0 bar and turbidity begins to rise as the bed channels.",
    treatment: "The line is stopped for an unplanned wash after control limits are crossed.",
    residual: "High: F-201 remains unstable and the clearwell has lost recovery time.",
    lesson: "Increasing effort cannot remove a physical restriction; it transfers stress into the wider system.",
    metrics: { throughput: 58, buffer: 34, quality: 78, openRisks: 4 },
  },
  bypass: {
    id: "bypass",
    label: "F-201 bypassed",
    verdict: "Output maximized by crossing the quality boundary",
    score: 31,
    tone: "critical",
    event: "Unfiltered flow enters the finished-water header faster than blending can control it.",
    consequence: "Throughput rises, but turbidity exceeds the release criterion and the batch is quarantined.",
    treatment: "The bypass is shut and the affected volume is diverted for reprocessing.",
    residual: "Critical: production volume exists, yet none of it can be released.",
    lesson: "A continuity response fails when it preserves output by violating the product objective.",
    metrics: { throughput: 96, buffer: 67, quality: 48, openRisks: 5 },
  },
  backwash: {
    id: "backwash",
    label: "F-201 restored",
    verdict: "Temporary drawdown restored stable production capacity",
    score: 91,
    tone: "balanced",
    event: "The clearwell supports the line while F-201 completes a controlled backwash.",
    consequence: "Buffer falls for six minutes, then filtration returns at a proven 1.1 bar differential.",
    treatment: "F-201 returns to duty and the overdue wash becomes a monitored recurring control.",
    residual: "Low: throughput is stable with one-hour media and turbidity checks assigned.",
    lesson: "A deliberate short interruption can protect both product quality and sustained factory output.",
    metrics: { throughput: 79, buffer: 54, quality: 99, openRisks: 1 },
  },
};

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
  lesson: string;
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
    lesson: "Monitoring is not treatment when the failure pathway is already active and worsening.",
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
    lesson: "A proportionate response can protect continuity while removing the degrading asset from service.",
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
    lesson: "Eliminating equipment risk can create a new continuity exposure that still needs treatment.",
    metrics: [98, 34, 92],
  },
};

export function evidenceById(id: EvidenceId | null) {
  return EVIDENCE_POINTS.find((point) => point.id === id) ?? null;
}
