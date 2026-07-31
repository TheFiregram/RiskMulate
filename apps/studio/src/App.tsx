const modules = [
  "Simulation Engine",
  "Rule Engine",
  "Event Engine",
  "Asset Engine",
  "AI Engine",
  "Plugin Manager",
  "Analytics Engine",
  "Replay Engine",
  "Reporting Engine",
];

export function App() {
  return (
    <main className="shell">
      <p className="eyebrow">Offline simulation workspace</p>
      <h1>RiskMulator Studio</h1>
      <p className="status">Project foundation initialized. No simulation is running.</p>
      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading">Foundation modules</h2>
        <ul>
          {modules.map((module) => (
            <li key={module}>{module}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
