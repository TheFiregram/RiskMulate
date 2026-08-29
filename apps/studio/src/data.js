export const BUILDINGS = {
  command: {
    id: 'command', name: 'Site Office', category: 'management', cost: 0, buildTime: 0, workers: 0,
    description: 'Coordinates the site and unlocks construction.', footprint: [2, 2], color: '#b9955d', roof: '#d7bd86',
  },
  generator: {
    id: 'generator', name: 'Generator House', category: 'utility', cost: 1100000, buildTime: 8, workers: 1,
    description: 'Supplies 110 kW of site electricity.', footprint: [2, 2], color: '#55756d', roof: '#78948b', output: { energy: 110 },
  },
  rawTank: {
    id: 'rawTank', name: 'Raw Material Tank', category: 'storage', cost: 850000, buildTime: 7, workers: 0,
    description: 'Stores feedstock for the process line.', footprint: [2, 2], color: '#73817c', roof: '#aab4af', capacity: 900,
  },
  pump: {
    id: 'pump', name: 'Pump Station', category: 'production', cost: 1350000, buildTime: 9, workers: 1,
    description: 'Moves feedstock into processing.', footprint: [2, 2], color: '#6a8f84', roof: '#9db6ad', energyUse: 24,
  },
  processor: {
    id: 'processor', name: 'Process Hall', category: 'production', cost: 2900000, buildTime: 13, workers: 3,
    description: 'Converts raw material into saleable product.', footprint: [3, 2], color: '#b28e5b', roof: '#d3b67a', energyUse: 52,
  },
  warehouse: {
    id: 'warehouse', name: 'Warehouse', category: 'storage', cost: 1750000, buildTime: 10, workers: 2,
    description: 'Stores and dispatches finished units.', footprint: [3, 2], color: '#8a6e58', roof: '#b79b7c', capacity: 1800,
  },
  maintenance: {
    id: 'maintenance', name: 'Maintenance Bay', category: 'support', cost: 1500000, buildTime: 10, workers: 2,
    description: 'Enables preventive maintenance and faster repairs.', footprint: [2, 2], color: '#766d62', roof: '#a79b8d',
  },
  clinic: {
    id: 'clinic', name: 'Worker Clinic', category: 'safety', cost: 950000, buildTime: 8, workers: 1,
    description: 'Reduces the consequence of worker health events.', footprint: [2, 2], color: '#a55d50', roof: '#d28b7c',
  },
};

export const BUILD_ORDER = ['generator', 'rawTank', 'pump', 'processor', 'warehouse', 'maintenance', 'clinic'];

export const INITIAL_RISK = {
  id: 'R-001',
  title: 'Single-source electrical supply',
  cause: 'The factory depends on one generator with no alternate supply.',
  event: 'The generator fails during production.',
  consequence: 'The process line stops, delivery slips and restart costs are incurred.',
  objective: 'Production reliability',
  likelihood: 3,
  impact: 4,
  inherentLikelihood: 3,
  inherentImpact: 4,
  status: 'unidentified',
  treatment: null,
  residualLikelihood: null,
  residualImpact: null,
};

export const PUMP_RISK = {
  id: 'R-002',
  title: 'Pump degradation during operation',
  cause: 'Pump condition deteriorates under sustained load without preventive maintenance.',
  event: 'The process pump fails during the contract run.',
  consequence: 'Production stops and the delivery objective is threatened.',
  objective: 'Production and reliability',
  likelihood: 4,
  impact: 4,
  inherentLikelihood: 4,
  inherentImpact: 4,
  status: 'unidentified',
  treatment: null,
  residualLikelihood: null,
  residualImpact: null,
};

export const TREATMENTS = {
  'R-001': [
    { id: 'backup', name: 'Install backup generator', type: 'Mitigate', cost: 1450000, likelihood: 1, impact: 2, note: 'Adds redundancy and lowers downtime severity.' },
    { id: 'maintenance', name: 'Preventive generator service', type: 'Mitigate', cost: 260000, likelihood: 2, impact: 4, note: 'Lowers failure likelihood but leaves a single point of failure.' },
    { id: 'accept', name: 'Accept current exposure', type: 'Accept', cost: 0, likelihood: 3, impact: 4, note: 'No control added. Exposure remains above preferred criteria.' },
  ],
  'R-002': [
    { id: 'overhaul', name: 'Preventive pump overhaul', type: 'Mitigate', cost: 420000, likelihood: 2, impact: 4, note: 'Restores condition and lowers failure likelihood.' },
    { id: 'monitor', name: 'Condition monitoring', type: 'Mitigate', cost: 180000, likelihood: 3, impact: 4, note: 'Earlier warning improves intervention timing.' },
    { id: 'accept', name: 'Accept current exposure', type: 'Accept', cost: 0, likelihood: 4, impact: 4, note: 'Keeps production running without additional control.' },
  ],
};

export const PAD_LAYOUT = [
  { id: 'pad-1', gx: -5, gy: -1 },
  { id: 'pad-2', gx: -2, gy: -4 },
  { id: 'pad-3', gx: 2, gy: -4 },
  { id: 'pad-4', gx: 5, gy: -1 },
  { id: 'pad-5', gx: 4, gy: 3 },
  { id: 'pad-6', gx: 0, gy: 5 },
  { id: 'pad-7', gx: -4, gy: 3 },
];
