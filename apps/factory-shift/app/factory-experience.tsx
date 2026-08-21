"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import FactoryScene, { type TouchControls } from "./factory-scene";
import {
  DECISIONS,
  EVIDENCE_POINTS,
  FILTER_DECISIONS,
  FILTER_EVIDENCE,
  FILTER_OUTCOMES,
  OUTCOMES,
  evidenceById,
  type DecisionId,
  type EvidenceId,
  type FilterDecisionId,
  type ScenarioPhase,
} from "./scenario-data";

type TabletApp = "work" | "plant" | "inspection" | "messages" | "risk" | "decision";

const apps: { id: TabletApp; label: string; glyph: string }[] = [
  { id: "work", label: "Work order", glyph: "WO" },
  { id: "plant", label: "Plant network", glyph: "PN" },
  { id: "inspection", label: "Evidence", glyph: "EV" },
  { id: "messages", label: "Messages", glyph: "MS" },
  { id: "risk", label: "Risk register", glyph: "RR" },
  { id: "decision", label: "Decision", glyph: "DC" },
];

const PRESENTATION_STEPS = ["Brief", "Observe", "Decide", "Act", "Review"] as const;

const PHASE_STEP: Record<ScenarioPhase, number> = {
  briefing: 0,
  inspection: 1,
  decision: 2,
  consequence: 3,
  debrief: 4,
};

const PRESENTER_GUIDE: Record<ScenarioPhase, { title: string; note: string }> = {
  briefing: {
    title: "Frame the operating tension",
    note: "The plant needs flow in twelve minutes, yet P-204 is degrading. The player must protect more than one objective.",
  },
  inspection: {
    title: "Turn observations into evidence",
    note: "Four field readings establish condition, contradict an operator assumption, and reveal a viable standby control.",
  },
  decision: {
    title: "Make the trade-off visible",
    note: "Each response protects one objective and exposes another. The player must defend a proportionate treatment.",
  },
  consequence: {
    title: "Let the factory answer",
    note: "The selected control changes equipment state, process continuity, and the risk left after treatment.",
  },
  debrief: {
    title: "Close the reasoning loop",
    note: "Use the causal chain and counterfactual scores to show why the decision worked—and what remained at risk.",
  },
};

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
  const [presenterOpen, setPresenterOpen] = useState(false);
  const [operationsActive, setOperationsActive] = useState(false);
  const [filterChoice, setFilterChoice] = useState<FilterDecisionId | null>(null);
  const [confirmedFilterChoice, setConfirmedFilterChoice] = useState<FilterDecisionId | null>(null);

  const startedRef = useRef(started);
  const tabletRef = useRef(tabletOpen);
  const phaseRef = useRef(phase);
  const focusedRef = useRef(focusedTarget);
  const capturedRef = useRef(captured);
  const touchControlsRef = useRef<TouchControls>({ forward: 0, side: 0, yawDelta: 0, pitchDelta: 0 });
  const movePointerRef = useRef<number | null>(null);
  const moveOriginRef = useRef({ x: 0, y: 0 });
  const lookPointerRef = useRef<number | null>(null);
  const lookPositionRef = useRef({ x: 0, y: 0 });
  const joystickKnobRef = useRef<HTMLSpanElement>(null);

  useEffect(() => { startedRef.current = started; }, [started]);
  useEffect(() => { tabletRef.current = tabletOpen; }, [tabletOpen]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { focusedRef.current = focusedTarget; }, [focusedTarget]);
  useEffect(() => { capturedRef.current = captured; }, [captured]);

  const focusedEvidence = useMemo(() => evidenceById(focusedTarget), [focusedTarget]);
  const outcome = confirmedChoice ? OUTCOMES[confirmedChoice] : null;
  const filterOutcome = confirmedFilterChoice ? FILTER_OUTCOMES[confirmedFilterChoice] : null;
  const plantMetrics = filterOutcome?.metrics ?? (
    confirmedChoice === "monitor"
      ? { throughput: 52, buffer: 41, quality: 93, openRisks: 4 }
      : confirmedChoice === "transfer"
        ? { throughput: 92, buffer: 68, quality: 99, openRisks: 2 }
        : confirmedChoice === "repair"
          ? { throughput: 37, buffer: 35, quality: 99, openRisks: 2 }
          : { throughput: 71, buffer: 64, quality: 98, openRisks: 3 }
  );

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

  const resetTouchMovement = useCallback(() => {
    movePointerRef.current = null;
    touchControlsRef.current.forward = 0;
    touchControlsRef.current.side = 0;
    if (joystickKnobRef.current) joystickKnobRef.current.style.transform = "translate(0px, 0px)";
  }, []);

  const handleMoveStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    movePointerRef.current = event.pointerId;
    moveOriginRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (movePointerRef.current !== event.pointerId) return;
    event.preventDefault();
    const maxDistance = 38;
    const rawX = event.clientX - moveOriginRef.current.x;
    const rawY = event.clientY - moveOriginRef.current.y;
    const length = Math.hypot(rawX, rawY) || 1;
    const scale = Math.min(1, maxDistance / length);
    const x = rawX * scale;
    const y = rawY * scale;
    touchControlsRef.current.side = x / maxDistance;
    touchControlsRef.current.forward = -y / maxDistance;
    if (joystickKnobRef.current) joystickKnobRef.current.style.transform = `translate(${x}px, ${y}px)`;
  }, []);

  const handleMoveEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (movePointerRef.current !== event.pointerId) return;
    resetTouchMovement();
  }, [resetTouchMovement]);

  const handleLookStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    lookPointerRef.current = event.pointerId;
    lookPositionRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleLook = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (lookPointerRef.current !== event.pointerId) return;
    event.preventDefault();
    const deltaX = event.clientX - lookPositionRef.current.x;
    const deltaY = event.clientY - lookPositionRef.current.y;
    lookPositionRef.current = { x: event.clientX, y: event.clientY };
    touchControlsRef.current.yawDelta -= deltaX * 0.0042;
    touchControlsRef.current.pitchDelta -= deltaY * 0.0036;
  }, []);

  const handleLookEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (lookPointerRef.current !== event.pointerId) return;
    lookPointerRef.current = null;
  }, []);

  useEffect(() => {
    if (!tabletOpen && phase === "inspection") return;
    resetTouchMovement();
    lookPointerRef.current = null;
    touchControlsRef.current.yawDelta = 0;
    touchControlsRef.current.pitchDelta = 0;
  }, [phase, resetTouchMovement, tabletOpen]);

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

  const loadCompletedWalkdown = useCallback(() => {
    const completeEvidence = EVIDENCE_POINTS.map((point) => point.id);
    startedRef.current = true;
    phaseRef.current = "decision";
    tabletRef.current = true;
    capturedRef.current = completeEvidence;
    setStarted(true);
    setCaptured(completeEvidence);
    setLastCapture(null);
    setChoice(null);
    setConfirmedChoice(null);
    setOperationsActive(false);
    setFilterChoice(null);
    setConfirmedFilterChoice(null);
    setOutcomeStage(0);
    setPhase("decision");
    setActiveApp("decision");
    setTabletOpen(true);
  }, []);

  const runRecommendedResponse = useCallback(() => {
    startedRef.current = true;
    phaseRef.current = "consequence";
    tabletRef.current = false;
    setStarted(true);
    setChoice("transfer");
    setConfirmedChoice("transfer");
    setOutcomeStage(0);
    setPhase("consequence");
    setActiveApp("decision");
    setTabletOpen(false);
  }, []);

  const openRecommendedDebrief = useCallback(() => {
    const completeEvidence = EVIDENCE_POINTS.map((point) => point.id);
    startedRef.current = true;
    phaseRef.current = "debrief";
    tabletRef.current = true;
    capturedRef.current = completeEvidence;
    setStarted(true);
    setCaptured(completeEvidence);
    setLastCapture(null);
    setChoice("transfer");
    setConfirmedChoice("transfer");
    setOperationsActive(false);
    setFilterChoice(null);
    setConfirmedFilterChoice(null);
    setOutcomeStage(2);
    setPhase("debrief");
    setActiveApp("decision");
    setTabletOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "KeyP" && !event.repeat && startedRef.current) setPresenterOpen((open) => !open);
      if (event.code === "KeyT" && !event.repeat) toggleTablet();
      if (event.code === "KeyE" && !event.repeat) captureInspection();
      if (event.code === "Escape" && tabletRef.current && phaseRef.current !== "consequence") setTabletOpen(false);
      if (event.code === "F9" && !event.repeat && startedRef.current) {
        event.preventDefault();
        if (phaseRef.current === "decision") {
          openRecommendedDebrief();
        } else if (phaseRef.current !== "debrief") {
          loadCompletedWalkdown();
        }
      }
      if (event.code === "Enter" && !startedRef.current) {
        setStarted(true);
        setTabletOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [captureInspection, loadCompletedWalkdown, openRecommendedDebrief, toggleTablet]);

  const beginShift = () => {
    startedRef.current = true;
    tabletRef.current = true;
    setStarted(true);
    setTabletOpen(true);
  };

  const beginGuidedDemo = () => {
    setPresenterOpen(true);
    beginShift();
  };

  const acceptWorkOrder = () => {
    phaseRef.current = "inspection";
    tabletRef.current = false;
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

  const continueToOperations = () => {
    setOperationsActive(true);
    setFilterChoice(null);
    setConfirmedFilterChoice(null);
    setActiveApp("plant");
    setTabletOpen(true);
    setPresenterOpen(false);
  };

  const authorizeFilterResponse = () => {
    if (!filterChoice) return;
    setConfirmedFilterChoice(filterChoice);
  };

  const restartScenario = () => {
    startedRef.current = false;
    tabletRef.current = false;
    phaseRef.current = "briefing";
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
    setOperationsActive(false);
    setFilterChoice(null);
    setConfirmedFilterChoice(null);
    setOutcomeStage(0);
    setSecondsRemaining(11 * 60 + 42);
    setPresenterOpen(false);
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
  const presentationStep = PHASE_STEP[phase];
  const presenterGuide = PRESENTER_GUIDE[phase];
  const residualLevel = outcome?.tone === "balanced" ? "LOW" : outcome?.tone === "safe" ? "MEDIUM" : "HIGH";
  const pumpNode = !confirmedChoice
    ? { label: "P-204 DEGRADED", tone: "warning" }
    : confirmedChoice === "monitor"
      ? { label: "P-204 TRIPPED", tone: "danger" }
      : confirmedChoice === "transfer"
        ? { label: "P-205 ONLINE", tone: "stable" }
        : { label: "P-204 LOCKOUT", tone: "offline" };
  const filterNode = !filterOutcome
    ? { label: operationsActive ? "F-201 RESTRICTED" : "F-201 WATCH", tone: "warning" }
    : filterOutcome.id === "backwash"
      ? { label: "F-201 RESTORED", tone: "stable" }
      : filterOutcome.id === "bypass"
        ? { label: "BYPASS OPEN", tone: "danger" }
        : { label: "F-201 UNSTABLE", tone: "danger" };
  const outputNode = plantMetrics.quality >= 95
    ? { label: "RELEASE READY", tone: "stable" }
    : plantMetrics.quality >= 80
      ? { label: "QUALITY WATCH", tone: "warning" }
      : { label: "BATCH HOLD", tone: "danger" };
  const plantRiskLabel = plantMetrics.openRisks <= 1 ? "CONTROLLED" : plantMetrics.openRisks <= 3 ? "WATCH" : "HIGH EXPOSURE";

  return (
    <main className={`experience-shell phase-${phase} ${tabletOpen ? "tablet-active" : ""}`}>
      <FactoryScene
        key={runId}
        started={started}
        tabletOpen={tabletOpen}
        scenarioPhase={phase}
        captured={captured}
        decision={confirmedChoice}
        touchControls={touchControlsRef}
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
          <div className="start-kicker"><span /> RISKMULATE · SCENARIO 01</div>
          <h1>FACTORY<br /><em>SHIFT</em></h1>
          <p>East filtration is twelve minutes from restart. Pump P-204 is running hot. Read the floor, weigh conflicting evidence, and make the call.</p>
          <div className="start-actions">
            <button className="primary-action" onClick={beginShift}><span>Begin shift</span><b>ENTER</b></button>
            <button className="guided-action" onClick={beginGuidedDemo}><span>Guided presentation</span><b>3 MIN</b></button>
          </div>
          <div className="control-grid">
            <span><kbd>WASD</kbd> Move</span><span><kbd>MOUSE</kbd> Look</span>
            <span><kbd>T</kbd> Tablet</span><span><kbd>E</kbd> Inspect</span>
          </div>
          <div className="touch-control-note">Touch controls activate after the work order.</div>
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
          <section className="scenario-loop" aria-label="Scenario progress">
            {PRESENTATION_STEPS.map((step, index) => (
              <span key={step} className={index < presentationStep ? "complete" : index === presentationStep ? "active" : ""}>
                <i>{index < presentationStep ? "✓" : index + 1}</i>{step}
              </span>
            ))}
          </section>
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
              <kbd className="desktop-key">E</kbd><kbd className="touch-key">TAP</kbd><span><b>{focusedEvidence.prompt.toUpperCase()}</b><small>{focusedEvidence.title} · {targetDistance.toFixed(1)} m</small></span>
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

          {!tabletOpen && phase !== "consequence" && <button className="tablet-toggle" onClick={toggleTablet}><kbd className="desktop-key">T</kbd> OPEN TABLET</button>}

          {!tabletOpen && phase === "inspection" && (
            <div className="touch-controls" aria-label="Touch controls">
              <div
                className="touch-look-zone"
                aria-label="Drag to look around"
                onPointerDown={handleLookStart}
                onPointerMove={handleLook}
                onPointerUp={handleLookEnd}
                onPointerCancel={handleLookEnd}
              ><span>DRAG TO LOOK</span></div>
              <div
                className="touch-joystick"
                aria-label="Movement joystick"
                onPointerDown={handleMoveStart}
                onPointerMove={handleMove}
                onPointerUp={handleMoveEnd}
                onPointerCancel={handleMoveEnd}
              ><i /><span ref={joystickKnobRef} /></div>
              <div className="touch-actions">
                <button disabled={!focusedEvidence} onClick={() => captureInspection()}>
                  <b>{focusedEvidence ? "INSPECT" : "AIM"}</b>
                  <small>{focusedEvidence?.worldLabel ?? "AT A TAG"}</small>
                </button>
                <button onClick={toggleTablet}><b>TABLET</b><small>EVIDENCE</small></button>
              </div>
            </div>
          )}
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
            <header className="tablet-status"><div className="brand-mark"><span>R</span> RISKMULATE OPS</div><div><span>06:42</span><span>ZONE NET · 82%</span><i className="battery"><b /></i></div></header>
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

                {activeApp === "plant" && (
                  <>
                    <div className="window-heading"><div><small>FACTORY OPERATIONS · EAST TRAIN</small><h2>Connected production system</h2></div><span className={`plant-risk-tag risks-${plantMetrics.openRisks}`}>{plantRiskLabel}</span></div>
                    <div className="plant-kpis" aria-label="Factory operating metrics">
                      <article><small>THROUGHPUT</small><strong>{plantMetrics.throughput}%</strong><span>Target 90%</span><i><b style={{ width: `${plantMetrics.throughput}%` }} /></i></article>
                      <article><small>CLEARWELL BUFFER</small><strong>{plantMetrics.buffer}%</strong><span>T-110 level</span><i><b style={{ width: `${plantMetrics.buffer}%` }} /></i></article>
                      <article><small>PRODUCT QUALITY</small><strong>{plantMetrics.quality}%</strong><span>Release confidence</span><i><b style={{ width: `${plantMetrics.quality}%` }} /></i></article>
                      <article><small>OPEN RISKS</small><strong>{plantMetrics.openRisks}</strong><span>Across the train</span><i><b style={{ width: `${Math.min(plantMetrics.openRisks * 20, 100)}%` }} /></i></article>
                    </div>

                    <section className="plant-network">
                      <header><div><small>LIVE PROCESS MAP</small><strong>Water and risk move through the same system</strong></div><span><i /> LIVE</span></header>
                      <div className="plant-flow">
                        <article className="tone-stable"><span>I-101</span><strong>Raw intake</strong><small>Feed header · 4.9 bar</small><em>STABLE</em></article><i />
                        <article className={`tone-${pumpNode.tone}`}><span>P-204 / P-205</span><strong>Duty pumping</strong><small>{confirmedChoice === "transfer" ? "Standby carrying load" : "East process pump"}</small><em>{pumpNode.label}</em></article><i />
                        <article className={`tone-${filterNode.tone}`}><span>F-201</span><strong>Filter bank</strong><small>ΔP {filterOutcome?.id === "backwash" ? "1.1" : "2.6"} bar</small><em>{filterNode.label}</em></article><i />
                        <article className={plantMetrics.buffer < 40 ? "tone-warning" : "tone-stable"}><span>T-110</span><strong>Clearwell</strong><small>{plantMetrics.buffer}% operating buffer</small><em>{plantMetrics.buffer < 40 ? "LOW BUFFER" : "AVAILABLE"}</em></article><i />
                        <article className={`tone-${outputNode.tone}`}><span>LINE 2</span><strong>Finished output</strong><small>{plantMetrics.throughput}% planned rate</small><em>{outputNode.label}</em></article>
                      </div>
                    </section>

                    {!operationsActive && (
                      <section className="operations-lock">
                        <span>02</span><div><small>NEXT OPERATING RISK</small><h3>F-201 differential pressure</h3><p>Complete the P-204 response and review its residual risk to continue managing the production train.</p></div><b>LOCKED</b>
                      </section>
                    )}

                    {operationsActive && !filterOutcome && (
                      <section className="filter-incident">
                        <header><div><small>ACTIVE INCIDENT · F-201</small><h3>Filtration restriction is reducing sustainable output</h3><p>The pump decision stabilized feed pressure. The constraint has moved downstream. Choose a response that protects both production and product quality.</p></div><span>DECISION 02</span></header>
                        <div className="filter-evidence">
                          {FILTER_EVIDENCE.map((item) => <article key={item.code}><i>{item.code}</i><div><small>{item.label}</small><strong>{item.value}</strong><p>{item.meaning}</p></div></article>)}
                        </div>
                        <div className="filter-decision-grid">
                          {FILTER_DECISIONS.map((option) => (
                            <button key={option.id} className={filterChoice === option.id ? "selected" : ""} onClick={() => setFilterChoice(option.id)}>
                              <header><span>{option.number}</span><div><small>OPERATING RESPONSE</small><strong>{option.title}</strong></div><i>{filterChoice === option.id ? "●" : "○"}</i></header>
                              <p>{option.command}</p>
                              <dl><div><dt>PROTECTS</dt><dd>{option.protects}</dd></div><div><dt>EXPOSES</dt><dd>{option.exposes}</dd></div><div><dt>CONTROL</dt><dd>{option.control}</dd></div></dl>
                            </button>
                          ))}
                        </div>
                        <div className="filter-authorize"><p>{filterChoice ? "Response ready. The plant metrics will update from this choice." : "Choose the response you can defend across flow, buffer, and quality."}</p><button disabled={!filterChoice} onClick={authorizeFilterResponse}>AUTHORIZE PLANT RESPONSE <span>→</span></button></div>
                      </section>
                    )}

                    {operationsActive && filterOutcome && (
                      <section className={`filter-result tone-${filterOutcome.tone}`}>
                        <header><div><small>FACTORY RESPONSE · F-201</small><h3>{filterOutcome.label}</h3><p>{filterOutcome.verdict}</p></div><span>CONTROL QUALITY <b>{filterOutcome.score}</b></span></header>
                        <div className="factory-cascade">
                          <article><small>01 · CONSTRAINT</small><strong>Loaded F-201 media</strong><p>Differential pressure restricts the rate the plant can sustain.</p></article>
                          <article><small>02 · RESPONSE</small><strong>{FILTER_DECISIONS.find((item) => item.id === filterOutcome.id)?.title}</strong><p>{filterOutcome.event}</p></article>
                          <article><small>03 · SYSTEM EFFECT</small><strong>Production state changed</strong><p>{filterOutcome.consequence}</p></article>
                          <article><small>04 · RESIDUAL RISK</small><strong>{filterOutcome.residual.split(":")[0]}</strong><p>{filterOutcome.residual}</p></article>
                        </div>
                        <div className="factory-treatment"><div><small>TREATMENT</small><p>{filterOutcome.treatment}</p></div><div><small>OPERATIONS LESSON</small><p>{filterOutcome.lesson}</p></div></div>
                        <button className="plant-retry" onClick={() => { setFilterChoice(null); setConfirmedFilterChoice(null); }}>Reassess F-201 <span>↻</span></button>
                      </section>
                    )}
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
                    <div className="debrief-proof">
                      <div><small>EVIDENCE LINKED</small><strong>4 / 4</strong><span>Field observations</span></div>
                      <div><small>DECISION QUALITY</small><strong>{outcome.score} / 100</strong><span>Across three objectives</span></div>
                      <div><small>RESIDUAL RISK</small><strong>{residualLevel}</strong><span>After treatment</span></div>
                      <p><small>KEY LEARNING</small><b>{outcome.lesson}</b></p>
                    </div>
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
                    <div className="debrief-actions">
                      <button className="tablet-primary continue-operations" onClick={continueToOperations}><span>Continue to factory operations</span><b>02</b></button>
                      <button className="debrief-replay" onClick={restartScenario}>Run P-204 again <span>↻</span></button>
                    </div>
                  </section>
                )}
              </section>
            </div>
          </div>
        </div>
        {phase !== "consequence" && <button className="tablet-close" onClick={() => setTabletOpen(false)}><kbd className="desktop-key">T</kbd> LOWER TABLET</button>}
      </div>

      {started && (
        <button className={`presenter-toggle ${presenterOpen ? "active" : ""}`} onClick={() => setPresenterOpen((open) => !open)}>
          <span>P</span>{presenterOpen ? "HIDE GUIDE" : "PRESENTER GUIDE"}
        </button>
      )}

      {started && presenterOpen && (
        <aside className="presenter-panel" aria-label="Presenter guide">
          <header>
            <div><small>LIVE DEMO GUIDE</small><strong>Step {presentationStep + 1} of 5 · {PRESENTATION_STEPS[presentationStep]}</strong></div>
            <button onClick={() => setPresenterOpen(false)} aria-label="Close presenter guide">×</button>
          </header>
          <div className="presenter-meter" aria-hidden="true">
            {PRESENTATION_STEPS.map((step, index) => <i key={step} className={index <= presentationStep ? "active" : ""} />)}
          </div>
          <h2>{presenterGuide.title}</h2>
          <p>{presenterGuide.note}</p>
          <div className="presenter-actions">
            {phase === "briefing" && <button onClick={acceptWorkOrder}>Start the walkdown <span>→</span></button>}
            {phase === "inspection" && <button onClick={loadCompletedWalkdown}>Load the four observations <span>→</span></button>}
            {phase === "decision" && <button onClick={runRecommendedResponse}>Run the recommended response <span>→</span></button>}
            {phase === "consequence" && <button onClick={openRecommendedDebrief}>Open the debrief now <span>→</span></button>}
            {phase === "debrief" && <button onClick={continueToOperations}>Open factory operations <span>→</span></button>}
            <button className="presenter-exit" onClick={restartScenario}>Exit to title</button>
          </div>
          <footer><kbd>P</kbd> show / hide · Presentation controls are separate from player input</footer>
        </aside>
      )}
    </main>
  );
}
