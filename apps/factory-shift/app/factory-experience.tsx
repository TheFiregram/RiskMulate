"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FactoryScene from "./factory-scene";
import {
  DECISIONS,
  EVIDENCE_POINTS,
  OUTCOMES,
  evidenceById,
  type DecisionId,
  type EvidenceId,
  type ScenarioPhase,
} from "./scenario-data";

type TabletApp = "work" | "inspection" | "messages" | "risk" | "decision";

const apps: { id: TabletApp; label: string; glyph: string }[] = [
  { id: "work", label: "Work order", glyph: "WO" },
  { id: "inspection", label: "Evidence", glyph: "EV" },
  { id: "messages", label: "Messages", glyph: "MS" },
  { id: "risk", label: "Risk register", glyph: "RR" },
  { id: "decision", label: "Decision", glyph: "DC" },
];

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function FactoryExperience() {
  const [started, setStarted] = useState(false);
  const [tabletOpen, setTabletOpen] = useState(false);
  const [activeApp, setActiveApp] = useState<TabletApp>("work");
  const [phase, setPhase] = useState<ScenarioPhase>("briefing");
  const [distance, setDistance] = useState(25.5);
  const [captured, setCaptured] = useState<EvidenceId[]>([]);
  const [focusedTarget, setFocusedTarget] = useState<EvidenceId | null>(null);
  const [targetDistance, setTargetDistance] = useState(0);
  const [lastCapture, setLastCapture] = useState<EvidenceId | null>(null);
  const [choice, setChoice] = useState<DecisionId | null>(null);
  const [confirmedChoice, setConfirmedChoice] = useState<DecisionId | null>(null);
  const [outcomeStage, setOutcomeStage] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(11 * 60 + 42);
  const [runId, setRunId] = useState(0);

  const startedRef = useRef(started);
  const tabletRef = useRef(tabletOpen);
  const phaseRef = useRef(phase);
  const focusedRef = useRef(focusedTarget);
  const capturedRef = useRef(captured);

  useEffect(() => { startedRef.current = started; }, [started]);
  useEffect(() => { tabletRef.current = tabletOpen; }, [tabletOpen]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { focusedRef.current = focusedTarget; }, [focusedTarget]);
  useEffect(() => { capturedRef.current = captured; }, [captured]);

  const focusedEvidence = useMemo(() => evidenceById(focusedTarget), [focusedTarget]);
  const outcome = confirmedChoice ? OUTCOMES[confirmedChoice] : null;

  const toggleTablet = useCallback(() => {
    if (!startedRef.current || phaseRef.current === "consequence") return;
    setTabletOpen((open) => !open);
  }, []);

  const onNearChange = useCallback((_near: boolean, nextDistance: number) => {
    setDistance(nextDistance);
  }, []);

  const onTargetChange = useCallback((target: EvidenceId | null, nextDistance: number) => {
    setFocusedTarget((current) => (current === target ? current : target));
    if (target) setTargetDistance(nextDistance);
  }, []);

  const captureInspection = useCallback((requested?: EvidenceId) => {
    const target = requested ?? focusedRef.current;
    if (!target || phaseRef.current !== "inspection" || tabletRef.current) return;
    if (capturedRef.current.includes(target)) return;
    const next = [...capturedRef.current, target];
    capturedRef.current = next;
    setCaptured(next);
    setLastCapture(target);
  }, []);

  useEffect(() => {
    if (!lastCapture) return;
    const timer = window.setTimeout(() => setLastCapture((current) => current === lastCapture ? null : current), 2800);
    return () => window.clearTimeout(timer);
  }, [lastCapture]);

  useEffect(() => {
    if (captured.length !== EVIDENCE_POINTS.length || phase !== "inspection") return;
    const timer = window.setTimeout(() => {
      setPhase("decision");
      setActiveApp("decision");
      setTabletOpen(true);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [captured.length, phase]);

  useEffect(() => {
    if (!started || phase === "briefing" || phase === "debrief") return;
    const timer = window.setInterval(() => setSecondsRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phase, started]);

  useEffect(() => {
    if (phase !== "consequence" || !confirmedChoice) return;
    const timers = [
      window.setTimeout(() => setOutcomeStage(1), 1350),
      window.setTimeout(() => setOutcomeStage(2), 3100),
      window.setTimeout(() => {
        setPhase("debrief");
        setActiveApp("decision");
        setTabletOpen(true);
      }, 5700),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [confirmedChoice, phase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "KeyT" && !event.repeat) toggleTablet();
      if (event.code === "KeyE" && !event.repeat) captureInspection();
      if (event.code === "Escape" && tabletRef.current && phaseRef.current !== "consequence") setTabletOpen(false);
      if (event.code === "F9" && !event.repeat && startedRef.current) {
        event.preventDefault();
        const completeEvidence = EVIDENCE_POINTS.map((point) => point.id);
        capturedRef.current = completeEvidence;
        setCaptured(completeEvidence);
        if (phaseRef.current === "decision") {
          setChoice("transfer");
          setConfirmedChoice("transfer");
          setPhase("debrief");
        } else {
          setPhase("decision");
        }
        setActiveApp("decision");
        setTabletOpen(true);
      }
      if (event.code === "Enter" && !startedRef.current) {
        setStarted(true);
        setTabletOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [captureInspection, toggleTablet]);

  const beginShift = () => {
    setStarted(true);
    setTabletOpen(true);
  };

  const acceptWorkOrder = () => {
    setPhase("inspection");
    setActiveApp("inspection");
    setTabletOpen(false);
  };

  const confirmDecision = () => {
    if (!choice) return;
    setConfirmedChoice(choice);
    setOutcomeStage(0);
    setPhase("consequence");
    setTabletOpen(false);
  };

  const restartScenario = () => {
    setStarted(false);
    setTabletOpen(false);
    setActiveApp("work");
    setPhase("briefing");
    setDistance(25.5);
    setCaptured([]);
    capturedRef.current = [];
    setFocusedTarget(null);
    setLastCapture(null);
    setChoice(null);
    setConfirmedChoice(null);
    setOutcomeStage(0);
    setSecondsRemaining(11 * 60 + 42);
    setRunId((value) => value + 1);
  };

  const objective = phase === "briefing"
    ? { title: "Review the work order", detail: "Priority: operational risk", progress: 14 }
    : phase === "inspection"
      ? { title: "Build the P-204 fault picture", detail: `${captured.length} of 4 observations · ${distance.toFixed(1)} m to P-204`, progress: 30 + captured.length * 10 }
      : phase === "decision"
        ? { title: "Select an operating response", detail: "Balance safety, continuity, and asset condition", progress: 78 }
        : phase === "consequence"
          ? { title: "Observe the plant response", detail: outcome?.stages[outcomeStage] ?? "Command in progress", progress: 92 }
          : { title: "Review the causal chain", detail: "Scenario complete", progress: 100 };

  const newlyCaptured = evidenceById(lastCapture);

  return (
    <main className={`experience-shell phase-${phase} ${tabletOpen ? "tablet-active" : ""}`}>
      <FactoryScene
        key={runId}
        started={started}
        tabletOpen={tabletOpen}
        scenarioPhase={phase}
        captured={captured}
        decision={confirmedChoice}
        onNearChange={onNearChange}
        onTargetChange={onTargetChange}
      />
      <div className="sun-wash" aria-hidden="true" />
      <div className="lens-flare" aria-hidden="true"><i /><i /><i /></div>
      <div className="cinema-bars" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <div className="world-shade" aria-hidden="true" />
      <div className="asset-credit">
        Props <a href="https://www.meshy.ai" target="_blank" rel="noreferrer">Meshy</a>
        <span>·</span>
        CC0 environment <a href="https://polyhaven.com" target="_blank" rel="noreferrer">Poly Haven</a>
        <span>+</span>
        <a href="https://ambientcg.com" target="_blank" rel="noreferrer">ambientCG</a>
      </div>

      {!started && (
        <section className="start-screen">
          <div className="start-meta"><span>06:42</span><span>18°C</span><span>DAWN SHIFT</span></div>
          <div className="start-kicker"><span /> TRAINING SIMULATION · PLAYABLE BUILD 03</div>
          <h1>FACTORY<br /><em>SHIFT</em></h1>
          <p>East filtration is twelve minutes from restart. Pump P-204 is running hot. Read the floor, weigh conflicting evidence, and make the call.</p>
          <button className="primary-action" onClick={beginShift}><span>Begin shift</span><b>ENTER</b></button>
          <div className="control-grid">
            <span><kbd>WASD</kbd> Move</span><span><kbd>MOUSE</kbd> Look</span>
            <span><kbd>T</kbd> Tablet</span><span><kbd>E</kbd> Inspect</span>
          </div>
          <div className="location-stamp"><i /> Kestrel Valley · East Process Yard</div>
        </section>
      )}

      {started && (
        <>
          <header className="hud-top">
            <div className="site-id"><span className={`live-dot ${phase === "consequence" ? "alert" : ""}`} /><div><b>EAST FILTRATION</b><small>KESTREL VALLEY · ZONE 2</small></div></div>
            <div className="weather-readout"><span>DAWN</span><b>18°</b><i>NE 08</i></div>
            <div className="shift-clock"><small>RESTART WINDOW</small><b>{formatCountdown(secondsRemaining)}</b></div>
          </header>
          <section className="objective-panel">
            <small>CURRENT OBJECTIVE</small>
            <strong>{objective.title}</strong>
            <div className="objective-track"><i style={{ width: `${objective.progress}%` }} /></div>
            <span>{objective.detail}</span>
          </section>
          {!tabletOpen && phase === "inspection" && <div className={`reticle ${focusedTarget ? "has-target" : ""}`}><i /><i /><span /></div>}

          {phase === "inspection" && !tabletOpen && (
            <aside className="evidence-hud" aria-label="Inspection progress">
              <small>P-204 WALKDOWN</small>
              {EVIDENCE_POINTS.map((point) => (
                <div key={point.id} className={`${captured.includes(point.id) ? "done" : ""} ${focusedTarget === point.id ? "focused" : ""}`}>
                  <i>{captured.includes(point.id) ? "✓" : point.code}</i><span>{point.worldLabel}</span>
                </div>
              ))}
            </aside>
          )}

          {phase === "inspection" && !tabletOpen && focusedEvidence && (
            <button className="world-prompt" onClick={() => captureInspection(focusedEvidence.id)}>
              <kbd>E</kbd><span><b>{focusedEvidence.prompt.toUpperCase()}</b><small>{focusedEvidence.title} · {targetDistance.toFixed(1)} m</small></span>
            </button>
          )}

          {phase === "inspection" && !tabletOpen && !focusedEvidence && captured.length === 0 && (
            <div className="floor-tip"><b>FLOOR WALKDOWN</b><span>Follow the amber equipment tags. Aim at a component and press E.</span></div>
          )}

          {newlyCaptured && !tabletOpen && (
            <aside className="capture-toast"><span>+ EVIDENCE {newlyCaptured.code}</span><strong>{newlyCaptured.reading}</strong><p>{newlyCaptured.detail}</p></aside>
          )}

          {phase === "consequence" && outcome && (
            <section className={`outcome-sequence tone-${outcome.tone}`}>
              <small>COMMAND EXECUTION · {outcome.label.toUpperCase()}</small>
              <h2>{outcome.stages[outcomeStage]}</h2>
              <div>{outcome.stages.map((stage, index) => <span key={stage} className={index < outcomeStage ? "complete" : index === outcomeStage ? "active" : ""}><i>{index + 1}</i>{stage}</span>)}</div>
            </section>
          )}

          {!tabletOpen && phase !== "consequence" && <button className="tablet-toggle" onClick={toggleTablet}><kbd>T</kbd> OPEN TABLET</button>}
        </>
      )}

      <div className={`tablet-rig ${tabletOpen ? "is-open" : ""}`} aria-hidden={!tabletOpen}>
        <div className="forearm forearm-left" /><div className="forearm forearm-right" />
        <div className="glove glove-left"><i /><i /><i /></div><div className="glove glove-right"><i /><i /><i /></div>
        <div className="tablet-case">
          <span className="case-bolt bolt-1" /><span className="case-bolt bolt-2" /><span className="case-bolt bolt-3" /><span className="case-bolt bolt-4" />
          <span className="bumper bumper-tl" /><span className="bumper bumper-tr" /><span className="bumper bumper-bl" /><span className="bumper bumper-br" />
          <div className="tablet-camera" />
          <div className="tablet-screen">
            <header className="tablet-status"><div className="brand-mark"><span>F</span> OPERATIONS OS</div><div><span>06:42</span><span>ZONE NET · 82%</span><i className="battery"><b /></i></div></header>
            <div className="tablet-body">
              <nav className="app-rail" aria-label="Tablet applications">
                {apps.map((app) => {
                  const locked = app.id === "decision" && captured.length < EVIDENCE_POINTS.length;
                  return <button key={app.id} disabled={locked} className={activeApp === app.id ? "active" : ""} onClick={() => setActiveApp(app.id)}><i>{app.glyph}</i><span>{app.label}</span>{app.id === "messages" && <b>1</b>}{app.id === "decision" && locked && <em>LOCKED</em>}</button>;
                })}
              </nav>
              <section className="app-window">
                {activeApp === "work" && (
                  <>
                    <div className="window-heading"><div><small>WORK ORDER · WO-4821</small><h2>Restart East Filtration</h2></div><span className="priority-tag">P1 · {formatCountdown(secondsRemaining)}</span></div>
                    <div className="briefing-grid">
                      <article className="brief-card lead-card"><small>SHIFT BRIEF</small><p>Restore Line 2 before the storage header falls below minimum. P-204 shows abnormal vibration during warm-up.</p><div className="constraint"><span>QUALITY LIMIT</span><b>No contaminated output</b></div></article>
                      <article className="brief-card asset-card"><small>ASSET</small><h3>P-204</h3><p>Centrifugal process pump<br />Status: running / degraded</p><span className="mini-trend"><i /><i /><i /><i /><i /><i /></span></article>
                      <article className="brief-card"><small>YOUR CALL</small><h3>Act with incomplete evidence</h3><p>Inspect four physical points, choose a response, then see the plant react.</p></article>
                    </div>
                    {phase === "briefing" ? <button className="tablet-primary" onClick={acceptWorkOrder}><span>Accept work order</span><b>01</b></button> : <div className="accepted-strip"><span>✓</span><div><b>WORK ORDER ACTIVE</b><small>{captured.length < 4 ? `Walkdown in progress · ${captured.length}/4 logged` : "Evidence complete · decision pending"}</small></div></div>}
                  </>
                )}

                {activeApp === "inspection" && (
                  <>
                    <div className="window-heading"><div><small>INSPECTION · P-204</small><h2>Evidence board</h2></div><span className="capture-count">{captured.length}/4 CAPTURED</span></div>
                    <p className="section-note">Observations are evidence, not answers. Look for agreement, contradiction, and a viable control.</p>
                    <div className="evidence-list detailed">
                      {EVIDENCE_POINTS.map((item) => {
                        const open = captured.includes(item.id);
                        return <article key={item.id} className={open ? "unlocked" : "locked"}><span className="evidence-code">{item.id}</span><div><h3>{open ? item.title : item.worldLabel}</h3><p>{open ? item.detail : "Not logged. Inspect the marked component in the yard."}</p>{open && <small>{item.significance}</small>}</div><i>{open ? "✓" : "—"}</i></article>;
                      })}
                    </div>
                    <div className={`inspection-footer ${captured.length === 4 ? "ready" : ""}`}><span className="pulse-icon" /><p><b>{captured.length === 4 ? "Case ready:" : "Next:"}</b> {captured.length === 4 ? "compare the three operating responses." : "lower the tablet and continue the P-204 walkdown."}</p></div>
                    {captured.length === 4 && <button className="tablet-primary compact" onClick={() => setActiveApp("decision")}><span>Open decision console</span><b>→</b></button>}
                  </>
                )}

                {activeApp === "messages" && (
                  <>
                    <div className="window-heading"><div><small>MESSAGES</small><h2>Shift channel</h2></div><span className="neutral-tag">1 NEW</span></div>
                    <div className="message-thread">
                      <article className={captured.includes("EV-03") ? "contradicted" : ""}><span>NK</span><div><small>N. KAMARA · NIGHT OPERATOR · 06:31</small><p>P-204 is louder on startup, but it has sounded like this all week. No seal leak seen.</p>{captured.includes("EV-03") && <b>CONTRADICTED BY EV-03 · ACTIVE TRACE LEAK</b>}</div></article>
                      <article className="system-message"><span>SYS</span><div><small>ASSET MONITOR · 06:39</small><p>Vibration trend crossed the advisory band. Reading: 11.8 mm/s.</p></div></article>
                    </div>
                  </>
                )}

                {activeApp === "risk" && (
                  <>
                    <div className="window-heading"><div><small>RISK REGISTER</small><h2>Live operating risks</h2></div><span className="priority-tag">3 OPEN</span></div>
                    <div className="risk-table">
                      <div className="risk-head"><span>RISK</span><span>SEVERITY</span><span>AVAILABLE CONTROL</span></div>
                      <div><span><b>R-14</b> Bearing failure during restart</span><span className="risk-high">HIGH</span><span>{captured.includes("EV-04") ? "Warm transfer to P-205" : "Standby path unverified"}</span></div>
                      <div><span><b>R-08</b> Storage header below minimum</span><span className="risk-med">MEDIUM</span><span>{formatCountdown(secondsRemaining)} restart window</span></div>
                      <div><span><b>R-03</b> Seal release to drain</span><span className={captured.includes("EV-03") ? "risk-med" : ""}>{captured.includes("EV-03") ? "RISING" : "UNKNOWN"}</span><span>Visual condition check</span></div>
                    </div>
                  </>
                )}

                {activeApp === "decision" && phase !== "debrief" && (
                  <>
                    <div className="window-heading"><div><small>DECISION CONSOLE · WO-4821</small><h2>Choose the operating response</h2></div><span className="capture-count">4/4 EVIDENCE</span></div>
                    <div className="decision-context"><span>KNOWN</span><b>Failure indicators are converging</b><span>CONSTRAINT</span><b>{formatCountdown(secondsRemaining)} to restart</b><span>OPTION</span><b>P-205 standby path verified</b></div>
                    <div className="decision-grid">
                      {DECISIONS.map((option) => <button key={option.id} className={`decision-card ${choice === option.id ? "selected" : ""}`} onClick={() => setChoice(option.id)}><header><span>{option.number}</span><div><small>RESPONSE</small><h3>{option.title}</h3></div><i>{choice === option.id ? "●" : "○"}</i></header><p>{option.command}</p><dl><div><dt>PROTECTS</dt><dd>{option.protects}</dd></div><div><dt>EXPOSES</dt><dd>{option.exposes}</dd></div><div><dt>CONTROL</dt><dd>{option.control}</dd></div></dl></button>)}
                    </div>
                    <div className="decision-submit"><p>{choice ? "Command package ready. The plant will respond to this choice." : "Select the response you can defend from the evidence."}</p><button disabled={!choice} onClick={confirmDecision}>AUTHORIZE RESPONSE <span>→</span></button></div>
                  </>
                )}

                {activeApp === "decision" && phase === "debrief" && outcome && (
                  <section className={`debrief tone-${outcome.tone}`}>
                    <div className="window-heading"><div><small>AFTER ACTION REVIEW · WO-4821</small><h2>{outcome.label}</h2></div><span className="outcome-score">CONTROL QUALITY <b>{outcome.score}</b></span></div>
                    <div className="debrief-verdict"><i /><div><small>ASSESSMENT</small><h3>{outcome.verdict}</h3></div></div>
                    <div className="causal-chain">
                      <article><small>01 · CAUSE</small><p>Outer-race wear, overdue lubrication, and seal degradation create a developing mechanical fault.</p></article>
                      <article><small>02 · EVENT</small><p>{outcome.event}</p></article>
                      <article><small>03 · CONSEQUENCE</small><p>{outcome.consequence}</p></article>
                      <article><small>04 · TREATMENT</small><p>{outcome.treatment}</p></article>
                      <article><small>05 · RESIDUAL RISK</small><p>{outcome.residual}</p></article>
                    </div>
                    <div className="debrief-bottom">
                      <div className="metric-panel"><h3>Decision lenses</h3>{["Safety", "Continuity", "Asset protection"].map((label, index) => <div key={label}><span>{label}</span><i><b style={{ width: `${outcome.metrics[index]}%` }} /></i><strong>{outcome.metrics[index]}</strong></div>)}</div>
                      <div className="counterfactuals"><h3>Other available paths</h3>{DECISIONS.filter((item) => item.id !== confirmedChoice).map((item) => <article key={item.id}><span>{item.number}</span><div><b>{item.title}</b><small>{OUTCOMES[item.id].verdict}</small></div><strong>{OUTCOMES[item.id].score}</strong></article>)}</div>
                    </div>
                    <button className="tablet-primary replay" onClick={restartScenario}><span>Run scenario again</span><b>↻</b></button>
                  </section>
                )}
              </section>
            </div>
          </div>
        </div>
        {phase !== "consequence" && <button className="tablet-close" onClick={() => setTabletOpen(false)}><kbd>T</kbd> LOWER TABLET</button>}
      </div>
    </main>
  );
}
