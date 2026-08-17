export const scenario = {
  id: 'continuity-under-disruption-v1',
  title: 'Continuity Under Disruption',
  objective:
    'Maintain at least 90% of planned filtration-unit output through the disruption window without breaching quality, environmental, or safety limits.',
  acceptanceThreshold: 9,
  maxScore: 760,
  inspectionCount: 8,
  evidenceTotal: 16,
  risk: {
    id: 'solvent-release',
    name: 'Solvent flange leak',
    inherentLikelihood: 4,
    inherentImpact: 5,
    residualLikelihood: 2,
    residualImpact: 5,
  },
  risks: [
    {
      id: 'solvent-release',
      name: 'Solvent release from flange',
      statement:
        'Because flange sealing integrity may be degraded, solvent could escape during operation, causing worker exposure, ignition, shutdown, and production delay.',
      cause: 'Degraded gasket or incorrect flange bolt load',
      event: 'Solvent escapes from the process flange',
      consequences: ['Worker exposure', 'Fire or ignition', 'Shutdown', 'Production delay'],
      inherentLikelihood: 4,
      inherentImpact: 5,
      residualLikelihood: 2,
      residualImpact: 5,
      owner: 'Operations / Mechanical Integrity',
      treatment: 'Isolate the line, repair the flange, verify atmosphere, and restart under permit.',
    },
    {
      id: 'pipe-fatigue',
      name: 'Pipe fatigue / nozzle overload',
      statement:
        'Because pipe support restraint may be inadequate, startup vibration could create excessive movement and fatigue, causing a pipe or tank-nozzle failure, chemical release, equipment damage, and shutdown.',
      cause: 'Missing clamp restraint and possible alignment problem',
      event: 'Pipe movement exceeds the intended support condition',
      consequences: ['Fatigue failure', 'Nozzle damage', 'Chemical release', 'Shutdown'],
      inherentLikelihood: 3,
      inherentImpact: 5,
      residualLikelihood: 1,
      residualImpact: 5,
      owner: 'Mechanical Integrity',
      treatment: 'Hold startup until restraint and alignment are inspected and repaired.',
    },
    {
      id: 'electrical-fault',
      name: 'Electrical enclosure fault',
      statement:
        'Because an electrical cabinet entry is damaged and the circuit has a recent trip history, an electrical fault could occur, causing shock, fire, equipment trip, or production interruption.',
      cause: 'Damaged conduit/gland and unresolved trip history',
      event: 'Electrical fault occurs in the motor-control circuit',
      consequences: ['Shock', 'Electrical fire', 'Equipment trip', 'Production interruption'],
      inherentLikelihood: 3,
      inherentImpact: 5,
      residualLikelihood: 1,
      residualImpact: 5,
      owner: 'Electrical Maintenance',
      treatment: 'Lock out the circuit and require competent electrical inspection and repair before return to service.',
    },
    {
      id: 'environmental-release',
      name: 'Stormwater contamination',
      statement:
        'Because process-area drainage can route to stormwater, a solvent spill could enter the drain, causing environmental contamination, regulatory action, cleanup costs, and operational disruption.',
      cause: 'Unprotected stormwater drain within spill migration path',
      event: 'Released solvent enters the stormwater system',
      consequences: ['Environmental contamination', 'Regulatory action', 'Cleanup cost', 'Operational disruption'],
      inherentLikelihood: 3,
      inherentImpact: 4,
      residualLikelihood: 1,
      residualImpact: 4,
      owner: 'EHS / Operations',
      treatment: 'Protect the drain and establish temporary spill containment before work or startup.',
    },
    {
      id: 'emergency-access',
      name: 'Emergency access delay',
      statement:
        'Because stored materials encroach on service clearance, personnel could be delayed reaching isolation or electrical equipment during an incident, increasing consequence severity.',
      cause: 'Poor placement of stored conduit and pallet materials',
      event: 'Emergency or maintenance access is obstructed',
      consequences: ['Delayed isolation', 'Slower emergency response', 'Higher incident severity'],
      inherentLikelihood: 3,
      inherentImpact: 3,
      residualLikelihood: 1,
      residualImpact: 3,
      owner: 'Area Operations',
      treatment: 'Remove the obstruction and keep the marked clearance route available.',
    },
    {
      id: 'hose-disconnect',
      name: 'Temporary hose disconnect',
      statement:
        'Because a temporary flexible hose is in service without secondary retention, pressure or movement could disconnect the hose, causing a spray release, injury, and process interruption.',
      cause: 'Temporary hose connection without whip-check or secondary retention',
      event: 'Hose separates under pressure or vibration',
      consequences: ['Spray release', 'Worker injury', 'Process interruption', 'Delay'],
      inherentLikelihood: 3,
      inherentImpact: 4,
      residualLikelihood: 1,
      residualImpact: 4,
      owner: 'Operations / Temporary Works',
      treatment: 'Remove or secure the temporary hose with secondary retention before pressurized service.',
    },
  ],
  findings: [
    {
      id: 'flange-leak',
      label: 'Leaking process flange',
      riskId: 'solvent-release',
      evidence: [
        'Amber liquid is visible at the flange gasket line.',
        'Lower flange hardware and the adjacent pipe surface show fresh wet staining.',
        'A solvent release can create worker-exposure and flammable-vapour consequences before startup.',
      ],
      teaching:
        'The visible leak is evidence of an uncertain event already beginning to manifest. Record the cause, event, and consequences rather than describing only the hazard.',
    },
    {
      id: 'support-vibration',
      label: 'Damaged pipe support',
      riskId: 'pipe-fatigue',
      evidence: [
        'Fresh abrasion marks are visible where the pipe bears on the support saddle.',
        'One clamp fastener is missing from the restraint point.',
        'An operator reports increased vibration at startup, but last week\'s logged reading was below the alarm threshold.',
      ],
      teaching:
        'Contradictory evidence does not remove uncertainty. It should trigger investigation of support condition, alignment, and operating vibration before startup.',
    },
    {
      id: 'electrical-panel',
      label: 'Electrical cabinet entry',
      riskId: 'electrical-fault',
      evidence: [
        'The conduit/gland at the cabinet entry is visibly damaged and no longer provides a clean protected entry.',
        'Maintenance history records three unexplained motor-circuit trips during the past seven days.',
      ],
      teaching:
        'Physical damage plus trip history raises the likelihood of an electrical fault. Warning signage alone does not control the fault mechanism.',
    },
    {
      id: 'storm-drain',
      label: 'Process-area drain',
      riskId: 'environmental-release',
      evidence: [
        'Dark process staining reaches the edge of the drain route.',
        'The drainage identification indicates stormwater discharge rather than a contained process sump.',
      ],
      teaching:
        'The drain changes the consequence path of the flange release. Risks can be connected: one initiating event can affect safety, environment, schedule, and compliance objectives.',
    },
    {
      id: 'access-obstruction',
      label: 'Stored conduit in service route',
      riskId: 'emergency-access',
      evidence: [
        'Stored conduit and pallet material encroach on the electrical/emergency service clearance route.',
      ],
      teaching:
        'Housekeeping can affect risk when it changes response time or access to controls. The issue is the effect on objectives, not the untidiness itself.',
    },
    {
      id: 'rear-egress',
      label: 'Blocked rear egress route',
      riskId: 'emergency-access',
      evidence: [
        'Pallet stacks and a temporary barrier block the marked rear egress near the gate house.',
        'The route is part of the secondary emergency egress path away from the process pad.',
        'If the plant-side service route is also obstructed, response time degrades further.',
      ],
      teaching:
        'Multiple locations can feed the same residual risk pathway. Clearing one obstruction does not close residual emergency-access risk while another egress remains blocked.',
    },
    {
      id: 'temp-hose',
      label: 'Temporary transfer hose',
      riskId: 'hose-disconnect',
      evidence: [
        'A flexible transfer hose is connected at a temporary service point without a visible secondary retention device.',
        'The hose shows surface wear at the coupling and is not tagged as a controlled temporary modification.',
      ],
      teaching:
        'Temporary connections change the facility state. Uncertainty comes from whether the connection will hold under pressure or vibration — record the cause, event, and consequence path, not only the presence of a hose.',
    },
    {
      id: 'cosmetic-rust',
      label: 'Tank surface discoloration',
      riskId: null,
      falsePositive: true,
      evidence: [
        'The discoloration is dry surface oxidation; no active leak is visible and the recent thickness check is within the recorded acceptance range.',
      ],
      teaching:
        'This is an observation, not a material risk on the available evidence. Do not inflate the register by treating every defect or visual anomaly as a risk.',
    },
  ],
  treatmentActions: [
    {
      id: 'isolate-line',
      minutes: 8,
      label: 'Isolate the leaking solvent line and establish safe work control.',
      required: true,
      riskIds: ['solvent-release'],
    },
    {
      id: 'protect-drain',
      minutes: 4,
      label: 'Cover/protect the stormwater drain and place temporary spill containment.',
      required: true,
      riskIds: ['environmental-release', 'solvent-release'],
    },
    {
      id: 'clear-access',
      minutes: 2,
      label: 'Move stored materials out of marked service and emergency egress routes.',
      required: true,
      riskIds: ['emergency-access'],
    },
    {
      id: 'electrical-loto',
      minutes: 4,
      label: 'Lock out the affected electrical circuit and escalate to electrical maintenance.',
      required: true,
      riskIds: ['electrical-fault'],
    },
    {
      id: 'support-startup-hold',
      minutes: 1,
      label: 'Place a startup hold pending mechanical inspection/repair of the damaged support.',
      required: true,
      riskIds: ['pipe-fatigue'],
    },
    {
      id: 'secure-temp-hose',
      minutes: 3,
      label: 'Remove or secure the temporary hose with secondary retention before pressurized service.',
      required: true,
      riskIds: ['hose-disconnect'],
    },
    {
      id: 'warning-sign',
      minutes: 1,
      label: 'Place warning signs beside the flange and electrical cabinet, then continue startup.',
      required: false,
      riskIds: [],
    },
    {
      id: 'insurance-transfer',
      minutes: 1,
      label: 'Record the issues for insurance transfer and continue production.',
      required: false,
      riskIds: [],
    },
    {
      id: 'support-repair-now',
      minutes: 10,
      label: 'Attempt a full pipe-support repair immediately before isolating the leaking line.',
      required: false,
      riskIds: ['pipe-fatigue'],
    },
  ],
  treatmentBudgetMinutes: 23,
  stages: [
    {
      name: 'Context',
      prompt: 'Which statement best defines the objective of this pre-start walkdown?',
      options: [
        'Maintain safe, compliant production while protecting people, environment, schedule, and product quality.',
        'Find as many defects as possible, regardless of their effect on objectives.',
        'Eliminate every source of uncertainty before production starts.',
      ],
      correctIndex: 0,
      feedback:
        'Context starts with objectives. Under ISO 31000, risk is the effect of uncertainty on objectives; the inspection is not a defect-counting exercise.',
    },
    {
      name: 'Identify',
      prompt: 'Which inspected finding should NOT be entered as a material risk on the available evidence?',
      options: [
        'The leaking solvent flange.',
        'The damaged electrical cabinet entry and repeated circuit trips.',
        'The dry tank surface discoloration with acceptable recent thickness results.',
        'The missing pipe-support clamp fastener and vibration evidence.',
      ],
      correctIndex: 2,
      feedback:
        'The tank discoloration is a documented observation, but current evidence does not show a meaningful uncertain effect on objectives. The other findings support cause → event → consequence risk statements.',
    },
    {
      name: 'Analyze',
      prompt: 'Which inherent-risk prioritization best matches the collected evidence before added treatment?',
      options: [
        'Flange 20; pipe support 15; electrical 15; stormwater 12; temporary hose 12; emergency access 9.',
        'All six risks should be scored 25 simply because they occur in a process works.',
        'Emergency access 20; cosmetic rust 15; flange 9; electrical 6; stormwater 3.',
      ],
      correctIndex: 0,
      feedback:
        'Likelihood and impact must be assessed separately using the evidence. The flange is highest at 20; pipe-support and electrical risks follow at 15; environmental release and temporary hose are each 12; access delay is 9.',
    },
    {
      name: 'Evaluate',
      prompt: 'The acceptance threshold is 9. Which evaluation decision best follows the criteria?',
      options: [
        'Treat or escalate the risks above 9; document an explicit decision for the risk at 9 rather than silently accepting it.',
        'Accept every risk below 20 and start production immediately.',
        'Remove the environmental and access risks because they are consequences of other problems.',
      ],
      correctIndex: 0,
      feedback:
        'Evaluation compares analyzed risk with criteria. Scores above 9 require treatment/escalation here, and the score at 9 still needs an explicit documented acceptance or proportionate control decision.',
    },
    {
      name: 'Treat',
      type: 'portfolio',
      prompt: 'You have 23 minutes of immediate pre-start response capacity. Build the strongest control portfolio. Long repairs can follow, but startup can be held.',
      feedback:
        'The strongest immediate portfolio acts on each risk pathway: isolate the leak, protect the drain, clear access, lock out the electrical circuit, secure the temporary hose, and hold startup pending support repair. Together these actions use 22 of the 23 available minutes.',
    },
    {
      name: 'Monitor & Review',
      prompt: 'After immediate field treatment, the flange residual risk is L2 × I5 = 10; the other residual scores fall to 5, 5, 4, 4, and 3 across the remaining pathways. What should happen next?',
      options: [
        'Record residual risks, assign owners, obtain approval for the residual score of 10, and monitor gas readings, flange condition, vibration, electrical condition, and drain protection.',
        'Close every risk permanently because controls have been selected.',
        'Lower the flange impact rating until its residual score falls below the threshold.',
      ],
      correctIndex: 0,
      feedback:
        'Treatment does not erase uncertainty. Residual risk must be recorded and reviewed across every pathway — flange, support, electrical, drain, access, and temporary hose. The flange residual score remains above the threshold, so approval and active monitoring are required.',
    },
  ],
  debrief: {
    headline: 'A walkdown is a connected risk assessment, not a defect hunt.',
    lessons: [
      'The same solvent-release event can affect worker safety, fire risk, environmental compliance, schedule, and production objectives.',
      'The damaged support and electrical trip history are separate initiating mechanisms, so they belong as distinct risk threads rather than being hidden under the flange entry.',
      'The stormwater drain changes the consequence pathway of a spill and should be treated as part of the connected control strategy.',
      'The housekeeping obstruction matters because it can delay access to controls during an incident.',
      'Multiple locations can feed one residual pathway — clearing plant-side access does not close residual risk if rear egress remains blocked.',
      'Temporary hose connections are real initiating pathways — securing or removing them changes residual hose-disconnect likelihood before pressure is introduced.',
      'The cosmetic tank discoloration demonstrates why observations and defects should not automatically become risk-register entries.',
    ],
    counterfactual:
      'If the team repaired only the visible flange but ignored drainage, electrical condition, support vibration, temporary hose retention, and access routes, a future release or fault could still produce serious consequences through the untreated pathways.',
  },
};
