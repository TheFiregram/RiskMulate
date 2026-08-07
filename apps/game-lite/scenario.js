export const scenario = {
  id: 'plant-walkdown-01',
  title: 'Chemical Plant Walkdown',
  objective:
    'Keep the blending plant operational without harming people, the environment, schedule, or product quality.',
  acceptanceThreshold: 9,
  risk: {
    name: 'Solvent flange leak',
    inherentLikelihood: 4,
    inherentImpact: 5,
    residualLikelihood: 2,
    residualImpact: 5,
  },
  stages: [
    {
      name: 'Context',
      prompt: 'Which statement best defines the inspection objective?',
      options: [
        'Maintain safe, compliant production and protect schedule and product quality.',
        'Find every physical defect in the plant.',
        'Eliminate all uncertainty before production starts.',
      ],
      correctIndex: 0,
      feedback:
        'Good context setting links risk work to objectives. Risk is the effect of uncertainty on objectives.',
    },
    {
      name: 'Identify',
      prompt: 'Which risk statement has a clear cause → event → consequence chain?',
      options: [
        'The pipe is dangerous.',
        'Because flange bolts may be under-torqued, solvent could leak, causing worker exposure, fire, shutdown, and delay.',
        'A leak might happen and be bad.',
      ],
      correctIndex: 1,
      feedback:
        'A useful risk statement separates the cause, uncertain event, and consequences.',
    },
    {
      name: 'Analyze',
      prompt: 'Assess the inherent risk before added controls.',
      options: [
        'Likelihood 1, Impact 2',
        'Likelihood 3, Impact 2',
        'Likelihood 4, Impact 5',
      ],
      correctIndex: 2,
      feedback:
        'A solvent leak near ignition sources is plausible and may cause severe harm and shutdown. Inherent score: 20.',
    },
    {
      name: 'Evaluate',
      prompt: 'The acceptance threshold is 9. What is the correct decision?',
      options: [
        'Accept the risk without action.',
        'Treat the risk before startup.',
        'Remove it from the register.',
      ],
      correctIndex: 1,
      feedback:
        'A score of 20 exceeds the threshold. The risk requires treatment and escalation.',
    },
    {
      name: 'Treat',
      prompt: 'Which treatment package is strongest for this scenario?',
      options: [
        'Isolate the line, replace the gasket, torque-test the flange, verify gas readings, then restart under permit.',
        'Add a warning sign beside the leak.',
        'Transfer the risk to an insurer and continue production.',
      ],
      correctIndex: 0,
      feedback:
        'This package reduces likelihood through engineering and procedural controls. Insurance does not control the hazardous event.',
    },
    {
      name: 'Monitor & Review',
      prompt: 'After treatment, likelihood is 2 and impact remains 5. What should happen next?',
      options: [
        'Close the risk permanently.',
        'Lower impact to 2 without evidence.',
        'Record residual score 10, seek approval, monitor gas readings and flange condition.',
      ],
      correctIndex: 2,
      feedback:
        'Residual risk remains above the threshold. Record it, assign ownership, gain approval, and monitor indicators.',
    },
  ],
};
