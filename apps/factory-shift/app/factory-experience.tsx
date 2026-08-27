"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
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
  PUMP_CONTROL_TASKS,
  evidenceById,
  filterEvidenceById,
  type DecisionId,
  type EvidenceId,
  type FilterDecisionId,
  type FilterEvidenceId,
  type FilterFieldStage,
  type FilterWorldTarget,
  type PumpControlTarget,
  type ScenarioPhase,
} from "./scenario-data";

type TabletApp = "work" | "plant" | "inspection" | "messages" | "risk" | "decision";
type KeyboardDirection = "up" | "down" | "left" | "right";

const DIRECTION_KEYS: Partial<Record<string, KeyboardDirection>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const FOCUSABLE_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableElements(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  });
}

function moveDirectionalFocus(root: HTMLElement, direction: KeyboardDirection) {
  const elements = focusableElements(root);
  if (elements.length === 0) return;

  const current = document.activeElement instanceof HTMLElement && root.contains(document.activeElement)
    ? document.activeElement
    : null;

  if (!current || !elements.includes(current)) {
    const first = direction === "up" || direction === "left" ? elements.at(-1) : elements[0];
    first?.focus({ preventScroll: true });
    first?.scrollIntoView({ block: "nearest", inline: "nearest" });
    return;
  }

  const currentRect = current.getBoundingClientRect();
  const currentX = currentRect.left + currentRect.width / 2;
  const currentY = currentRect.top + currentRect.height / 2;
  const horizontal = direction === "left" || direction === "right";
  const sign = direction === "left" || direction === "up" ? -1 : 1;

  const ranked = elements
    .filter((element) => element !== current)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const deltaX = rect.left + rect.width / 2 - currentX;
      const deltaY = rect.top + rect.height / 2 - currentY;
      const primary = horizontal ? deltaX : deltaY;
      const crossAxis = horizontal ? deltaY : deltaX;
      return { element, primary, score: Math.abs(primary) + Math.abs(crossAxis) * 2.4 };
    })
    .filter((candidate) => candidate.primary * sign > 2)
    .sort((a, b) => a.score - b.score);

  const currentIndex = elements.indexOf(current);
  const fallbackOffset = sign > 0 ? 1 : -1;
  const next = ranked[0]?.element ?? elements[(currentIndex + fallbackOffset + elements.length) % elements.length];
  next.focus({ preventScroll: true });
  next.scrollIntoView({ block: "nearest", inline: "nearest" });
}

const apps: { id: TabletApp; label: string; glyph: string }[] = [
  { id: "work", label: "Work order", glyph: "WO" },
  { id: "plant", label: "Plant network", glyph: "PN" },
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
  const [pumpControlStep, setPumpControlStep] = useState<PumpControlTarget | null>(null);
  const [completedPumpControls, setCompletedPumpControls] = useState<PumpControlTarget[]>([]);
  const [focusedPumpControlTarget, setFocusedPumpControlTarget] = useState<PumpControlTarget | null>(null);
  const [pumpControlDistance, setPumpControlDistance] = useState(0);
  const [lastPumpControl, setLastPumpControl] = useState<PumpControlTarget | null>(null);
  const [outcomeStage, setOutcomeStage] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(11 * 60 + 42);
  const [runId, setRunId] = useState(0);
  const [presenterOpen, setPresenterOpen] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
  const [operationsActive, setOperationsActive] = useState(false);
  const [filterStage, setFilterStage] = useState<FilterFieldStage>("idle");
  const [filterCaptured, setFilterCaptured] = useState<FilterEvidenceId[]>([]);
  const [focusedFilterTarget, setFocusedFilterTarget] = useState<FilterWorldTarget | null>(null);
  const [filterTargetDistance, setFilterTargetDistance] = useState(0);
  const [lastFilterCapture, setLastFilterCapture] = useState<FilterEvidenceId | null>(null);
  const [filterChoice, setFilterChoice] = useState<FilterDecisionId | null>(null);
  const [confirmedFilterChoice, setConfirmedFilterChoice] = useState<FilterDecisionId | null>(null);
  const [filterReactionStage, setFilterReactionStage] = useState(0);

  const startedRef = useRef(started);
  const tabletRef = useRef(tabletOpen);
  const phaseRef = useRef(phase);
  const focusedRef = useRef(focusedTarget);
  const capturedRef = useRef(captured);
  const pumpControlStepRef = useRef(pumpControlStep);
  const completedPumpControlsRef = useRef(completedPumpControls);
  const focusedPumpControlRef = useRef(focusedPumpControlTarget);
  const operationsActiveRef = useRef(operationsActive);
  const filterStageRef = useRef(filterStage);
  const focusedFilterRef = useRef(focusedFilterTarget);
  const filterCapturedRef = useRef(filterCaptured);
  const filterChoiceRef = useRef(filterChoice);
  const touchControlsRef = useRef<TouchControls>({ forward: 0, side: 0, yawDelta: 0, pitchDelta: 0 });
  const movePointerRef = useRef<number | null>(null);
  const moveOriginRef = useRef({ x: 0, y: 0 });
  const lookPointerRef = useRef<number | null>(null);
  const lookPositionRef = useRef({ x: 0, y: 0 });
  const joystickKnobRef = useRef<HTMLSpanElement>(null);
  const startScreenElementRef = useRef<HTMLElement>(null);
  const tabletElementRef = useRef<HTMLDivElement>(null);
  const presenterElementRef = useRef<HTMLElement>(null);

  useEffect(() => { startedRef.current = started; }, [started]);
  useEffect(() => { tabletRef.current = tabletOpen; }, [tabletOpen]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { focusedRef.current = focusedTarget; }, [focusedTarget]);
  useEffect(() => { capturedRef.current = captured; }, [captured]);
  useEffect(() => { pumpControlStepRef.current = pumpControlStep; }, [pumpControlStep]);
  useEffect(() => { completedPumpControlsRef.current = completedPumpControls; }, [completedPumpControls]);
  useEffect(() => { focusedPumpControlRef.current = focusedPumpControlTarget; }, [focusedPumpControlTarget]);
  useEffect(() => { operationsActiveRef.current = operationsActive; }, [operationsActive]);
  useEffect(() => { filterStageRef.current = filterStage; }, [filterStage]);
  useEffect(() => { focusedFilterRef.current = focusedFilterTarget; }, [focusedFilterTarget]);
  useEffect(() => { filterCapturedRef.current = filterCaptured; }, [filterCaptured]);
  useEffect(() => { filterChoiceRef.current = filterChoice; }, [filterChoice]);

  const focusedEvidence = useMemo(() => evidenceById(focusedTarget), [focusedTarget]);
  const focusedFilterEvidence = useMemo(
    () => filterEvidenceById(focusedFilterTarget === "FILTER-CONTROL" ? null : focusedFilterTarget),
    [focusedFilterTarget],
  );
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
    if (!startedRef.current || phaseRef.current === "actuation" || phaseRef.current === "consequence" || filterStageRef.current === "reaction") return;
    setTabletOpen((open) => !open);
  }, []);

  const onNearChange = useCallback((_near: boolean, nextDistance: number) => {
    setDistance(nextDistance);
  }, []);

  const onTargetChange = useCallback((target: EvidenceId | null, nextDistance: number) => {
    setFocusedTarget((current) => (current === target ? current : target));
    if (target) setTargetDistance(nextDistance);
  }, []);

  const onPumpControlTargetChange = useCallback((target: PumpControlTarget | null, nextDistance: number) => {
    setFocusedPumpControlTarget((current) => (current === target ? current : target));
    if (target) setPumpControlDistance(nextDistance);
  }, []);

  const onFilterTargetChange = useCallback((target: FilterWorldTarget | null, nextDistance: number) => {
    setFocusedFilterTarget((current) => (current === target ? current : target));
    if (target) setFilterTargetDistance(nextDistance);
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

  const captureFilterInspection = useCallback((requested?: FilterEvidenceId) => {
    const currentTarget = focusedFilterRef.current;
    const target = requested ?? (currentTarget === "FILTER-CONTROL" ? null : currentTarget);
    if (!target || filterStageRef.current !== "inspection" || tabletRef.current) return;
    if (filterCapturedRef.current.includes(target)) return;
    const next = [...filterCapturedRef.current, target];
    filterCapturedRef.current = next;
    setFilterCaptured(next);
    setLastFilterCapture(target);
  }, []);

  const completePumpTransfer = useCallback(() => {
    const completed = PUMP_CONTROL_TASKS.map((task) => task.id);
    completedPumpControlsRef.current = completed;
    pumpControlStepRef.current = null;
    focusedPumpControlRef.current = null;
    phaseRef.current = "consequence";
    tabletRef.current = false;
    setChoice("transfer");
    setConfirmedChoice("transfer");
    setCompletedPumpControls(completed);
    setPumpControlStep(null);
    setFocusedPumpControlTarget(null);
    setLastPumpControl("P204-ISOLATE");
    setOutcomeStage(0);
    setPhase("consequence");
    setActiveApp("decision");
    setTabletOpen(false);
  }, []);

  const executePumpControl = useCallback(() => {
    const target = focusedPumpControlRef.current;
    const step = pumpControlStepRef.current;
    if (!target || target !== step || phaseRef.current !== "actuation" || tabletRef.current) return;
    const nextCompleted = [...completedPumpControlsRef.current, target];
    completedPumpControlsRef.current = nextCompleted;
    setCompletedPumpControls(nextCompleted);
    setLastPumpControl(target);
    setFocusedPumpControlTarget(null);
    focusedPumpControlRef.current = null;

    if (target === "P205-START") {
      pumpControlStepRef.current = "P205-GAUGE";
      setPumpControlStep("P205-GAUGE");
    } else if (target === "P205-GAUGE") {
      pumpControlStepRef.current = "P204-ISOLATE";
      setPumpControlStep("P204-ISOLATE");
    } else {
      pumpControlStepRef.current = null;
      setPumpControlStep(null);
      window.setTimeout(() => completePumpTransfer(), 520);
    }
  }, [completePumpTransfer]);

  const executeFilterControl = useCallback(() => {
    const selected = filterChoiceRef.current;
    if (!selected || focusedFilterRef.current !== "FILTER-CONTROL" || filterStageRef.current !== "actuation" || tabletRef.current) return;
    filterStageRef.current = "reaction";
    setConfirmedFilterChoice(selected);
    setFilterReactionStage(0);
    setFocusedFilterTarget(null);
    setFilterStage("reaction");
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
    const filterFieldActive = filterStage === "inspection" || filterStage === "actuation";
    if (!tabletOpen && (phase === "inspection" || phase === "actuation" || filterFieldActive)) return;
    resetTouchMovement();
    lookPointerRef.current = null;
    touchControlsRef.current.yawDelta = 0;
    touchControlsRef.current.pitchDelta = 0;
  }, [filterStage, phase, resetTouchMovement, tabletOpen]);

  useEffect(() => {
    if (!lastCapture) return;
    const timer = window.setTimeout(() => setLastCapture((current) => current === lastCapture ? null : current), 2800);
    return () => window.clearTimeout(timer);
  }, [lastCapture]);

  useEffect(() => {
    if (!lastFilterCapture) return;
    const timer = window.setTimeout(() => setLastFilterCapture((current) => current === lastFilterCapture ? null : current), 2800);
    return () => window.clearTimeout(timer);
  }, [lastFilterCapture]);

  useEffect(() => {
    if (!lastPumpControl) return;
    const timer = window.setTimeout(() => setLastPumpControl((current) => current === lastPumpControl ? null : current), 2200);
    return () => window.clearTimeout(timer);
  }, [lastPumpControl]);

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
    if (filterCaptured.length !== FILTER_EVIDENCE.length || filterStage !== "inspection") return;
    const timer = window.setTimeout(() => {
      filterStageRef.current = "decision";
      tabletRef.current = true;
      setFilterStage("decision");
      setActiveApp("plant");
      setTabletOpen(true);
      setFocusedFilterTarget(null);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [filterCaptured.length, filterStage]);

  useEffect(() => {
    const clockActive = operationsActive
      ? filterStage !== "idle" && filterStage !== "result"
      : phase !== "briefing" && phase !== "debrief";
    if (!started || !clockActive) return;
    const timer = window.setInterval(() => setSecondsRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [filterStage, operationsActive, phase, started]);

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
    if (filterStage !== "reaction" || !confirmedFilterChoice) return;
    const timers = [
      window.setTimeout(() => setFilterReactionStage(1), 1400),
      window.setTimeout(() => setFilterReactionStage(2), 3200),
      window.setTimeout(() => {
        filterStageRef.current = "result";
        tabletRef.current = true;
        setFilterStage("result");
        setActiveApp("plant");
        setTabletOpen(true);
      }, 5400),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [confirmedFilterChoice, filterStage]);

  const resetPumpControls = useCallback(() => {
    pumpControlStepRef.current = null;
    completedPumpControlsRef.current = [];
    focusedPumpControlRef.current = null;
    setPumpControlStep(null);
    setCompletedPumpControls([]);
    setFocusedPumpControlTarget(null);
    setLastPumpControl(null);
  }, []);

  const resetFilterField = useCallback(() => {
    operationsActiveRef.current = false;
    filterStageRef.current = "idle";
    filterCapturedRef.current = [];
    filterChoiceRef.current = null;
    focusedFilterRef.current = null;
    setOperationsActive(false);
    setFilterStage("idle");
    setFilterCaptured([]);
    setFocusedFilterTarget(null);
    setLastFilterCapture(null);
    setFilterChoice(null);
    setConfirmedFilterChoice(null);
    setFilterReactionStage(0);
  }, []);

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
    resetPumpControls();
    resetFilterField();
    setOutcomeStage(0);
    setPhase("decision");
    setActiveApp("decision");
    setTabletOpen(true);
  }, [resetFilterField, resetPumpControls]);

  const armPumpTransfer = useCallback(() => {
    startedRef.current = true;
    phaseRef.current = "actuation";
    tabletRef.current = false;
    pumpControlStepRef.current = "P205-START";
    completedPumpControlsRef.current = [];
    focusedPumpControlRef.current = null;
    setStarted(true);
    setChoice("transfer");
    setConfirmedChoice(null);
    setPumpControlStep("P205-START");
    setCompletedPumpControls([]);
    setFocusedPumpControlTarget(null);
    setLastPumpControl(null);
    setOutcomeStage(0);
    setPhase("actuation");
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
    const completedControls = PUMP_CONTROL_TASKS.map((task) => task.id);
    completedPumpControlsRef.current = completedControls;
    pumpControlStepRef.current = null;
    focusedPumpControlRef.current = null;
    setCompletedPumpControls(completedControls);
    setPumpControlStep(null);
    setFocusedPumpControlTarget(null);
    resetFilterField();
    setOutcomeStage(2);
    setPhase("debrief");
    setActiveApp("decision");
    setTabletOpen(true);
  }, [resetFilterField]);

  const loadFilterWalkdown = useCallback(() => {
    const completeEvidence = FILTER_EVIDENCE.map((point) => point.id);
    filterCapturedRef.current = completeEvidence;
    filterStageRef.current = "decision";
    tabletRef.current = true;
    setFilterCaptured(completeEvidence);
    setLastFilterCapture(null);
    setFocusedFilterTarget(null);
    setFilterStage("decision");
    setActiveApp("plant");
    setTabletOpen(true);
  }, []);

  const runRecommendedFilterResponse = useCallback(() => {
    const selected = filterChoiceRef.current ?? "backwash";
    filterChoiceRef.current = selected;
    filterStageRef.current = "reaction";
    tabletRef.current = false;
    setFilterChoice(selected);
    setConfirmedFilterChoice(selected);
    setFilterReactionStage(0);
    setFocusedFilterTarget(null);
    setFilterStage("reaction");
    setTabletOpen(false);
  }, []);

  useEffect(() => {
    if (started) return;
    const frame = window.requestAnimationFrame(() => {
      startScreenElementRef.current?.querySelector<HTMLElement>(".primary-action")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [started]);

  useEffect(() => {
    const tablet = tabletElementRef.current;
    if (!tabletOpen || !tablet) {
      if (tablet?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      if (tablet.contains(document.activeElement)) return;
      const activeAppButton = tablet.querySelector<HTMLElement>(".app-rail button.active:not(:disabled)");
      (activeAppButton ?? focusableElements(tablet)[0])?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tabletOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const direction = DIRECTION_KEYS[event.code];
      if (direction) {
        const activeElement = document.activeElement;
        const presenterHasFocus = presenterElementRef.current?.contains(activeElement) ?? false;
        const surface = !startedRef.current
          ? startScreenElementRef.current
          : tabletRef.current
            ? tabletElementRef.current
            : presenterHasFocus
              ? presenterElementRef.current
              : null;
        if (surface) {
          event.preventDefault();
          moveDirectionalFocus(surface, direction);
          return;
        }
      }

      const target = event.target instanceof HTMLElement ? event.target : null;
      const interactiveTarget = target?.closest("button, a, input, select, textarea, [contenteditable='true']");
      if (event.code === "KeyP" && !event.repeat && startedRef.current) setPresenterOpen((open) => !open);
      if (event.code === "KeyT" && !event.repeat) toggleTablet();
      if (event.code === "KeyE" && !event.repeat && !interactiveTarget) {
        if (phaseRef.current === "actuation") executePumpControl();
        else if (filterStageRef.current === "inspection") captureFilterInspection();
        else if (filterStageRef.current === "actuation") executeFilterControl();
        else captureInspection();
      }
      if (event.code === "Escape") {
        if (tabletRef.current && phaseRef.current !== "actuation" && phaseRef.current !== "consequence") setTabletOpen(false);
        else if (presenterOpen) setPresenterOpen(false);
      }
      if (event.code === "F9" && !event.repeat && startedRef.current) {
        event.preventDefault();
        if (operationsActiveRef.current && (filterStageRef.current === "briefing" || filterStageRef.current === "inspection")) {
          loadFilterWalkdown();
        } else if (operationsActiveRef.current && (filterStageRef.current === "decision" || filterStageRef.current === "actuation")) {
          runRecommendedFilterResponse();
        } else if (phaseRef.current === "actuation") {
          completePumpTransfer();
        } else if (phaseRef.current === "decision") {
          openRecommendedDebrief();
        } else if (phaseRef.current !== "debrief") {
          loadCompletedWalkdown();
        }
      }
      if (event.code === "Enter" && !startedRef.current && !interactiveTarget) {
        startedRef.current = true;
        tabletRef.current = true;
        setStarted(true);
        setTabletOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [captureFilterInspection, captureInspection, completePumpTransfer, executeFilterControl, executePumpControl, loadCompletedWalkdown, loadFilterWalkdown, openRecommendedDebrief, presenterOpen, runRecommendedFilterResponse, toggleTablet]);

  const beginShift = () => {
    startedRef.current = true;
    tabletRef.current = true;
    setGuidedMode(false);
    setStarted(true);
    setTabletOpen(true);
  };

  const beginGuidedDemo = () => {
    startedRef.current = true;
    tabletRef.current = true;
    setGuidedMode(true);
    setPresenterOpen(true);
    setStarted(true);
    setTabletOpen(true);
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
    if (choice === "transfer") {
      armPumpTransfer();
      return;
    }
    phaseRef.current = "consequence";
    tabletRef.current = false;
    setConfirmedChoice(choice);
    setOutcomeStage(0);
    setPhase("consequence");
    setTabletOpen(false);
  };

  const continueToOperations = () => {
    operationsActiveRef.current = true;
    filterStageRef.current = "briefing";
    filterCapturedRef.current = [];
    filterChoiceRef.current = null;
    setOperationsActive(true);
    setFilterStage("briefing");
    setFilterCaptured([]);
    setFocusedFilterTarget(null);
    setLastFilterCapture(null);
    setFilterChoice(null);
    setConfirmedFilterChoice(null);
    setFilterReactionStage(0);
    setActiveApp("plant");
    setTabletOpen(true);
    if (!guidedMode) setPresenterOpen(false);
  };

  const beginFilterInspection = () => {
    filterStageRef.current = "inspection";
    tabletRef.current = false;
    setFilterStage("inspection");
    setFocusedFilterTarget(null);
    setTabletOpen(false);
  };

  const authorizeFilterResponse = () => {
    if (!filterChoice) return;
    filterStageRef.current = "actuation";
    filterChoiceRef.current = filterChoice;
    tabletRef.current = false;
    setFilterStage("actuation");
    setFocusedFilterTarget(null);
    setTabletOpen(false);
  };

  const reassessFilter = () => {
    filterStageRef.current = "decision";
    filterChoiceRef.current = null;
    setFilterStage("decision");
    setFilterChoice(null);
    setConfirmedFilterChoice(null);
    setFilterReactionStage(0);
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
    resetPumpControls();
    resetFilterField();
    setOutcomeStage(0);
    setSecondsRemaining(11 * 60 + 42);
    setPresenterOpen(false);
    setGuidedMode(false);
    setRunId((value) => value + 1);
  };

  const pumpObjective = phase === "briefing"
    ? { title: "Review the work order", detail: "Priority: operational risk", progress: 14 }
    : phase === "inspection"
      ? { title: "Build the P-204 fault picture", detail: `${captured.length} of 4 observations · ${distance.toFixed(1)} m to P-204`, progress: 30 + captured.length * 10 }
      : phase === "decision"
        ? { title: "Select an operating response", detail: "Balance safety, continuity, and asset condition", progress: 78 }
        : phase === "actuation"
          ? { title: "Complete the P-205 transfer", detail: `${completedPumpControls.length} of ${PUMP_CONTROL_TASKS.length} physical controls complete`, progress: 80 + completedPumpControls.length * 4 }
          : phase === "consequence"
            ? { title: "Observe the plant response", detail: outcome?.stages[outcomeStage] ?? "Command in progress", progress: 92 }
            : { title: "Review the causal chain", detail: "Scenario complete", progress: 100 };

  const filterObjective = filterStage === "briefing"
    ? { title: "Locate F-201 in the yard", detail: "Follow the amber field marker beyond the pump bay", progress: 14 }
    : filterStage === "inspection"
      ? { title: "Inspect the F-201 restriction", detail: `${filterCaptured.length} of 4 field readings logged`, progress: 28 + filterCaptured.length * 12 }
      : filterStage === "decision"
        ? { title: "Choose a filter response", detail: "Protect output, buffer, and product quality", progress: 76 }
        : filterStage === "actuation"
          ? { title: "Operate the selected control", detail: "Lower the tablet and use the green equipment tag", progress: 86 }
          : filterStage === "reaction"
            ? { title: "Observe the factory response", detail: filterOutcome?.stages[filterReactionStage] ?? "Control in progress", progress: 94 }
            : { title: "Review the system result", detail: "F-201 field task complete", progress: 100 };

  const objective = operationsActive ? filterObjective : pumpObjective;

  const newlyCaptured = evidenceById(lastCapture);
  const newlyFilterCaptured = filterEvidenceById(lastFilterCapture);
  const activePumpControlTask = PUMP_CONTROL_TASKS.find((task) => task.id === pumpControlStep) ?? null;
  const newlyCompletedPumpTask = PUMP_CONTROL_TASKS.find((task) => task.id === lastPumpControl) ?? null;
  const filterFieldActive = filterStage === "inspection" || filterStage === "actuation";
  const filterControlLabel = filterChoice === "push"
    ? "OPEN F-201 FEED VALVE"
    : filterChoice === "bypass"
      ? "OPEN FILTER BYPASS"
      : "START CONTROLLED BACKWASH";
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
  const combinedScore = filterOutcome ? Math.round(((outcome?.score ?? 0) + filterOutcome.score) / 2) : 0;
  const shiftRating = combinedScore >= 90
    ? { label: "CONTROL READY", detail: "You protected people, product, and production across two connected equipment risks." }
    : combinedScore >= 75
      ? { label: "SOUND RESPONSE", detail: "The plant recovered, with a meaningful exposure left for the next shift to manage." }
      : { label: "HIGH EXPOSURE", detail: "The chosen controls moved risk into another part of the production system." };

  const tutorialCue = !operationsActive
    ? phase === "briefing"
      ? { step: 1, title: "Accept the assignment", note: "Read the work order, focus Accept work order, then press Enter. The tablet lowers when the field task begins.", keys: ["ARROWS", "ENTER"], status: "WORK ORDER" }
      : phase === "inspection"
        ? { step: 2, title: captured.length === 0 ? "Find the first amber tag" : "Log the next field reading", note: "Walk and turn until the reticle locks onto marked equipment. Press E to record the reading.", keys: ["↑ ↓", "← →", "E"], status: `${captured.length}/4 READINGS` }
        : phase === "decision"
          ? { step: 3, title: "Compare the three responses", note: "Read what each response protects and exposes. Choose one from the evidence, then authorize it.", keys: ["ARROWS", "ENTER"], status: "DECISION" }
          : phase === "actuation"
            ? { step: 4, title: activePumpControlTask?.title ?? "Complete the transfer", note: `Find the green ${activePumpControlTask?.worldLabel.toLowerCase() ?? "control"} tag. Press E when its name appears.`, keys: ["↑ ↓", "← →", "E"], status: `${completedPumpControls.length}/3 CONTROLS` }
            : phase === "consequence"
              ? { step: 4, title: "Watch the plant respond", note: "Pause and watch the engine, meter, pipework, and status lights. The physical system shows the result of your choice.", keys: ["WAIT"], status: "RESPONSE" }
              : { step: 5, title: "Review the risk chain", note: "Read cause, event, consequence, treatment, and residual risk. Continue when you can explain why the result changed.", keys: ["ARROWS", "ENTER"], status: "PUMP REVIEW" }
    : filterStage === "idle" || filterStage === "briefing"
      ? { step: 6, title: "Start the connected incident", note: "Your pump response changed the factory condition. Begin the F-201 field inspection from the plant tablet.", keys: ["ARROWS", "ENTER"], status: "F-201 BRIEF" }
      : filterStage === "inspection"
        ? { step: 7, title: "Inspect the restricted filter", note: "Follow the F-201 marker. Aim at each amber tag and press E to log its field reading.", keys: ["↑ ↓", "← →", "E"], status: `${filterCaptured.length}/4 READINGS` }
        : filterStage === "decision"
          ? { step: 8, title: "Choose the filter response", note: "Compare output, buffer, and product-quality exposure. Select the response you can defend.", keys: ["ARROWS", "ENTER"], status: "FILTER DECISION" }
          : filterStage === "actuation"
            ? { step: 9, title: "Operate the chosen control", note: `Find the green field tag and ${filterControlLabel.toLowerCase()}. Press E when the prompt appears.`, keys: ["↑ ↓", "← →", "E"], status: "FIELD CONTROL" }
            : filterStage === "reaction"
              ? { step: 9, title: "Read the process reaction", note: "Watch the gauges, valve position, water flow, and factory metrics change before opening the result.", keys: ["WAIT"], status: "PROCESS RESPONSE" }
              : { step: 10, title: "Close the shift", note: "Review both decisions, the combined score, and the risk still open for the next shift.", keys: ["ARROWS", "ENTER"], status: "SHIFT REVIEW" };

  return (
    <main className={`experience-shell phase-${phase} ${tabletOpen ? "tablet-active" : ""}`}>
      <FactoryScene
        key={runId}
        started={started}
        tabletOpen={tabletOpen}
        scenarioPhase={phase}
        captured={captured}
        decision={confirmedChoice}
        filterStage={filterStage}
        filterCaptured={filterCaptured}
        filterChoice={filterChoice}
        filterDecision={confirmedFilterChoice}
        pumpControlStep={pumpControlStep}
        completedPumpControls={completedPumpControls}
        touchControls={touchControlsRef}
        onNearChange={onNearChange}
        onTargetChange={onTargetChange}
        onPumpControlTargetChange={onPumpControlTargetChange}
        onFilterTargetChange={onFilterTargetChange}
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
        <section className="start-screen" ref={startScreenElementRef} aria-label="Factory Shift start menu">
          <div className="start-meta"><span>06:42</span><span>18°C</span><span>DAWN SHIFT</span></div>
          <div className="start-kicker"><span /> RISKMULATE · PLAYABLE OPERATIONS PROTOTYPE</div>
          <h1>FACTORY<br /><em>SHIFT</em></h1>
          <p className="start-lead">Walk the floor. Read real equipment. Make a risk decision, operate the control, and watch the whole factory answer.</p>
          <div className="start-loop" aria-label="Experience loop">
            <span><i>01</i><b>INSPECT</b><small>Find the evidence</small></span>
            <span><i>02</i><b>DECIDE</b><small>Defend the trade-off</small></span>
            <span><i>03</i><b>OPERATE</b><small>Touch the control</small></span>
            <span><i>04</i><b>LEARN</b><small>See system impact</small></span>
          </div>
          <div className="start-actions">
            <button className="primary-action" onClick={beginShift}><span>Play the full shift</span><b>ENTER</b></button>
            <button className="guided-action" onClick={beginGuidedDemo}><span><strong>Start guided tutorial</strong><small>Learn each control by completing the task</small></span><b>COACH</b></button>
          </div>
          <div className="start-scenario-chain">
            <span><i>P‑204</i><b>Degrading pump</b></span><em>→</em><span><i>F‑201</i><b>Restricted filter</b></span><em>→</em><span><i>LINE 2</i><b>Factory outcome</b></span>
          </div>
          <div className="control-grid">
            <span><kbd>↑ ↓</kbd> Walk</span><span><kbd>← →</kbd> Turn</span>
            <span><kbd>WASD</kbd> Move / strafe</span><span><kbd>PG ↑↓</kbd> Aim</span>
            <span><kbd>T</kbd> Tablet</span><span><kbd>E</kbd> Inspect / operate</span>
          </div>
          <div className="touch-control-note">Touch controls activate after the work order.</div>
          <div className="location-stamp"><i /> Kestrel Valley · East Process Yard</div>
        </section>
      )}

      {started && (
        <>
          <header className="hud-top">
            <div className="site-id"><span className={`live-dot ${phase === "consequence" ? "alert" : ""}`} /><b>{operationsActive ? "F-201" : "P-204"}</b></div>
            <div className="shift-clock"><small>RESTART</small><b>{formatCountdown(secondsRemaining)}</b></div>
          </header>
          <section className="objective-panel">
            <small>OBJECTIVE · {tutorialCue.status}</small>
            <strong>{objective.title}</strong>
            <div className="objective-track"><i style={{ width: `${objective.progress}%` }} /></div>
            <span>{objective.detail}</span>
          </section>
          {!tabletOpen && (phase === "inspection" || phase === "actuation" || filterFieldActive) && <div className={`reticle ${focusedTarget || focusedPumpControlTarget || focusedFilterTarget ? "has-target" : ""}`}><i /><i /><span /></div>}

          {phase === "inspection" && !tabletOpen && focusedEvidence && (
            <button className="world-prompt" onClick={() => captureInspection(focusedEvidence.id)}>
              <kbd className="desktop-key">E</kbd><kbd className="touch-key">TAP</kbd><span><b>{focusedEvidence.prompt.toUpperCase()}</b><small>{focusedEvidence.title} · {targetDistance.toFixed(1)} m</small></span>
            </button>
          )}

          {phase === "actuation" && !tabletOpen && activePumpControlTask && focusedPumpControlTarget === activePumpControlTask.id && (
            <button className="world-prompt pump-control-prompt" onClick={executePumpControl}>
              <kbd className="desktop-key">E</kbd><kbd className="touch-key">TAP</kbd><span><b>{activePumpControlTask.prompt.toUpperCase()}</b><small>{activePumpControlTask.title} · {pumpControlDistance.toFixed(1)} m</small></span>
            </button>
          )}

          {filterStage === "inspection" && !tabletOpen && focusedFilterEvidence && (
            <button className="world-prompt filter-world-prompt" onClick={() => captureFilterInspection(focusedFilterEvidence.id)}>
              <kbd className="desktop-key">E</kbd><kbd className="touch-key">TAP</kbd><span><b>{focusedFilterEvidence.prompt.toUpperCase()}</b><small>{focusedFilterEvidence.title} · {filterTargetDistance.toFixed(1)} m</small></span>
            </button>
          )}

          {filterStage === "actuation" && !tabletOpen && focusedFilterTarget === "FILTER-CONTROL" && (
            <button className="world-prompt filter-control-prompt" onClick={executeFilterControl}>
              <kbd className="desktop-key">E</kbd><kbd className="touch-key">TAP</kbd><span><b>{filterControlLabel}</b><small>Physical control · {filterTargetDistance.toFixed(1)} m</small></span>
            </button>
          )}

          {phase === "inspection" && !tabletOpen && !focusedEvidence && captured.length === 0 && (
            <div className="floor-tip"><b>FLOOR WALKDOWN</b><span>Follow the amber equipment tags. Aim at a component and press E.</span></div>
          )}

          {phase === "actuation" && !tabletOpen && activePumpControlTask && focusedPumpControlTarget !== activePumpControlTask.id && (
            <div className="floor-tip pump-control-tip"><b>TRANSFER STEP {completedPumpControls.length + 1}/3</b><span>Find the green {activePumpControlTask.worldLabel.toLowerCase()} tag and operate it.</span></div>
          )}

          {filterStage === "inspection" && !tabletOpen && !focusedFilterEvidence && filterCaptured.length === 0 && (
            <div className="floor-tip filter-floor-tip"><b>FIELD TASK 02</b><span>Follow the F-201 marker beyond the pump bay and inspect the four amber tags.</span></div>
          )}

          {filterStage === "actuation" && !tabletOpen && focusedFilterTarget !== "FILTER-CONTROL" && (
            <div className="floor-tip filter-floor-tip"><b>CONTROL SELECTED</b><span>Find the green {filterChoice === "backwash" ? "backwash lever" : filterChoice === "bypass" ? "bypass valve" : "feed valve"} tag on F-201.</span></div>
          )}

          {newlyCaptured && !tabletOpen && (
            <aside className="capture-toast"><span>+ EVIDENCE {newlyCaptured.code}</span><strong>{newlyCaptured.reading}</strong><p>{newlyCaptured.detail}</p></aside>
          )}

          {newlyFilterCaptured && !tabletOpen && (
            <aside className="capture-toast filter-capture-toast"><span>+ F-201 EVIDENCE {newlyFilterCaptured.code}</span><strong>{newlyFilterCaptured.value}</strong><p>{newlyFilterCaptured.detail}</p></aside>
          )}

          {newlyCompletedPumpTask && !tabletOpen && (
            <aside className="capture-toast pump-control-toast"><span>+ TRANSFER CONTROL {newlyCompletedPumpTask.code}</span><strong>{newlyCompletedPumpTask.completion}</strong><p>{newlyCompletedPumpTask.title}</p></aside>
          )}

          {phase === "consequence" && outcome && (
            <section className={`outcome-sequence tone-${outcome.tone}`}>
              <small>COMMAND EXECUTION · {outcome.label.toUpperCase()}</small>
              <h2>{outcome.stages[outcomeStage]}</h2>
              <div>{outcome.stages.map((stage, index) => <span key={stage} className={index < outcomeStage ? "complete" : index === outcomeStage ? "active" : ""}><i>{index + 1}</i>{stage}</span>)}</div>
            </section>
          )}

          {filterStage === "reaction" && filterOutcome && (
            <section className={`outcome-sequence filter-response-sequence tone-${filterOutcome.tone}`}>
              <small>FIELD CONTROL · {filterOutcome.label.toUpperCase()}</small>
              <h2>{filterOutcome.stages[filterReactionStage]}</h2>
              <div>{filterOutcome.stages.map((stage, index) => <span key={stage} className={index < filterReactionStage ? "complete" : index === filterReactionStage ? "active" : ""}><i>{index + 1}</i>{stage}</span>)}</div>
            </section>
          )}

          {!tabletOpen && phase !== "actuation" && phase !== "consequence" && filterStage !== "reaction" && <button className="tablet-toggle" onClick={toggleTablet}><kbd className="desktop-key">T</kbd> OPEN TABLET</button>}

          {!tabletOpen && (phase === "inspection" || phase === "actuation" || filterFieldActive) && (
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
                <button disabled={phase === "actuation" ? !focusedPumpControlTarget : filterFieldActive ? !focusedFilterTarget : !focusedEvidence} onClick={() => {
                  if (phase === "actuation") executePumpControl();
                  else if (filterStage === "inspection") captureFilterInspection();
                  else if (filterStage === "actuation") executeFilterControl();
                  else captureInspection();
                }}>
                  <b>{(phase === "actuation" && focusedPumpControlTarget) || (filterStage === "actuation" && focusedFilterTarget) ? "OPERATE" : (focusedEvidence || focusedFilterEvidence) ? "INSPECT" : "AIM"}</b>
                  <small>{phase === "actuation" ? activePumpControlTask?.worldLabel ?? "AT CONTROL" : filterStage === "actuation" ? "AT CONTROL" : focusedFilterEvidence?.worldLabel ?? focusedEvidence?.worldLabel ?? "AT A TAG"}</small>
                </button>
                <button disabled={phase === "actuation"} onClick={toggleTablet}><b>{phase === "actuation" ? "LOCKED" : "TABLET"}</b><small>{phase === "actuation" ? "FINISH TRANSFER" : "EVIDENCE"}</small></button>
              </div>
            </div>
          )}
        </>
      )}

      <div className={`tablet-rig ${tabletOpen ? "is-open" : ""}`} ref={tabletElementRef} aria-hidden={!tabletOpen} aria-label="Field tablet">
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

                    {operationsActive && filterStage === "briefing" && (
                      <section className="filter-field-brief">
                        <header><div><small>ACTIVE INCIDENT · FIELD TASK 02</small><h3>F-201 is restricting the production train</h3><p>The pump handover restored stable feed pressure. A new bottleneck is now visible at the filter bank. Inspect the equipment before selecting a response.</p></div><span>PHYSICAL TASK</span></header>
                        <div className="field-route-summary">
                          <div><i>01</i><span><b>LOCATE</b>Follow the amber F-201 beacon beyond the pump bay.</span></div>
                          <div><i>02</i><span><b>INSPECT</b>Log pressure, turbidity, wash status, and buffer.</span></div>
                          <div><i>03</i><span><b>OPERATE</b>Return to the selected physical control.</span></div>
                        </div>
                        <button className="tablet-primary filter-deploy" onClick={beginFilterInspection}><span>Begin F-201 field inspection</span><b>→</b></button>
                      </section>
                    )}

                    {operationsActive && filterStage === "inspection" && (
                      <section className="filter-field-progress">
                        <header><div><small>FIELD INSPECTION · F-201</small><h3>{filterCaptured.length}/4 readings logged</h3><p>Lower the tablet and inspect each amber equipment tag on the physical filter skid.</p></div><span>{Math.round(filterCaptured.length / FILTER_EVIDENCE.length * 100)}%</span></header>
                        <div className="filter-evidence field-evidence-progress">
                          {FILTER_EVIDENCE.map((item) => {
                            const logged = filterCaptured.includes(item.id);
                            return <article key={item.id} className={logged ? "captured" : "pending"}><i>{logged ? "✓" : item.code}</i><div><small>{item.label}</small><strong>{logged ? item.value : "FIELD READING"}</strong><p>{logged ? item.meaning : "Inspect this component in the yard."}</p></div></article>;
                          })}
                        </div>
                        <button className="tablet-primary compact" onClick={() => setTabletOpen(false)}><span>Return to F-201</span><b>↓</b></button>
                      </section>
                    )}

                    {operationsActive && filterStage === "decision" && (
                      <section className="filter-incident">
                        <header><div><small>FIELD EVIDENCE COMPLETE · F-201</small><h3>Filtration restriction is reducing sustainable output</h3><p>The four readings confirm loaded media, compliant outlet quality, and enough stored water for one wash cycle. Choose the response you can defend.</p></div><span>DECISION 02</span></header>
                        <div className="filter-evidence">
                          {FILTER_EVIDENCE.map((item) => <article key={item.code} className="captured"><i>✓</i><div><small>{item.label}</small><strong>{item.value}</strong><p>{item.meaning}</p></div></article>)}
                        </div>
                        <div className="filter-decision-grid">
                          {FILTER_DECISIONS.map((option) => (
                            <button key={option.id} className={filterChoice === option.id ? "selected" : ""} onClick={() => { filterChoiceRef.current = option.id; setFilterChoice(option.id); }}>
                              <header><span>{option.number}</span><div><small>OPERATING RESPONSE</small><strong>{option.title}</strong></div><i>{filterChoice === option.id ? "●" : "○"}</i></header>
                              <p>{option.command}</p>
                              <dl><div><dt>PROTECTS</dt><dd>{option.protects}</dd></div><div><dt>EXPOSES</dt><dd>{option.exposes}</dd></div><div><dt>CONTROL</dt><dd>{option.control}</dd></div></dl>
                            </button>
                          ))}
                        </div>
                        <div className="filter-authorize"><p>{filterChoice ? "Response selected. You must operate its physical control on F-201." : "Choose the response you can defend across flow, buffer, and quality."}</p><button disabled={!filterChoice} onClick={authorizeFilterResponse}>SEND CONTROL TO FIELD <span>→</span></button></div>
                      </section>
                    )}

                    {operationsActive && filterStage === "actuation" && (
                      <section className="filter-actuation-card">
                        <span>FIELD CONTROL ARMED</span><h3>{filterControlLabel}</h3><p>Lower the tablet, find the green equipment tag on F-201, and operate the selected control. The plant will react in the yard.</p><button className="tablet-primary compact" onClick={() => setTabletOpen(false)}><span>Return to physical control</span><b>↓</b></button>
                      </section>
                    )}

                    {operationsActive && filterStage === "result" && filterOutcome && (
                      <section className={`filter-result tone-${filterOutcome.tone}`}>
                        <div className="shift-complete-banner">
                          <div className="shift-score-ring" style={{ "--shift-score": `${combinedScore * 3.6}deg` } as CSSProperties}><span><strong>{combinedScore}</strong><small>/100</small></span></div>
                          <div><small>SHIFT COMPLETE · TWO CONNECTED INCIDENTS</small><h2>{shiftRating.label}</h2><p>{shiftRating.detail}</p></div>
                          <span className="submission-ready"><i /> SIMULATION COMPLETE</span>
                        </div>
                        <div className="shift-score-grid" aria-label="Combined shift scorecard">
                          <article><small>P‑204 DECISION</small><strong>{outcome?.score ?? 0}</strong><span>{outcome?.label ?? "Pump response"}</span></article>
                          <article><small>F‑201 DECISION</small><strong>{filterOutcome.score}</strong><span>{filterOutcome.label}</span></article>
                          <article><small>EVIDENCE USED</small><strong>{captured.length + filterCaptured.length}/8</strong><span>Across two field tasks</span></article>
                          <article><small>RESIDUAL RISKS</small><strong>{plantMetrics.openRisks}</strong><span>{plantRiskLabel}</span></article>
                        </div>
                        <div className="shift-capabilities"><span>✓ Read physical evidence</span><span>✓ Balanced competing objectives</span><span>✓ Operated a field control</span><span>✓ Traced factory impact</span></div>
                        <header className="filter-outcome-heading"><div><small>FINAL FACTORY RESPONSE · F-201</small><h3>{filterOutcome.label}</h3><p>{filterOutcome.verdict}</p></div><span>CONTROL QUALITY <b>{filterOutcome.score}</b></span></header>
                        <div className="factory-cascade">
                          <article><small>01 · CONSTRAINT</small><strong>Loaded F-201 media</strong><p>Differential pressure restricts the rate the plant can sustain.</p></article>
                          <article><small>02 · RESPONSE</small><strong>{FILTER_DECISIONS.find((item) => item.id === filterOutcome.id)?.title}</strong><p>{filterOutcome.event}</p></article>
                          <article><small>03 · SYSTEM EFFECT</small><strong>Production state changed</strong><p>{filterOutcome.consequence}</p></article>
                          <article><small>04 · RESIDUAL RISK</small><strong>{filterOutcome.residual.split(":")[0]}</strong><p>{filterOutcome.residual}</p></article>
                        </div>
                        <div className="factory-treatment"><div><small>TREATMENT</small><p>{filterOutcome.treatment}</p></div><div><small>OPERATIONS LESSON</small><p>{filterOutcome.lesson}</p></div></div>
                        <div className="shift-finish-actions"><button className="tablet-primary" onClick={restartScenario}><span>Return to title</span><b>↺</b></button><button className="plant-retry" onClick={reassessFilter}>Compare another F-201 response <span>↻</span></button></div>
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
        <div className="tablet-keyboard-strip" aria-hidden="true"><span><kbd>ARROWS</kbd> NAVIGATE</span><span><kbd>ENTER</kbd> SELECT</span></div>
        {phase !== "consequence" && <button className="tablet-close" onClick={() => setTabletOpen(false)}><kbd className="desktop-key">T</kbd> LOWER TABLET</button>}
      </div>

      {started && (
        <button className={`presenter-toggle ${presenterOpen ? "active" : ""}`} onClick={() => setPresenterOpen((open) => !open)}>
          <span>P</span>{presenterOpen ? "HIDE COACH" : "TASK HELP"}
        </button>
      )}

      {started && presenterOpen && (
        <aside className="presenter-panel coach-panel" ref={presenterElementRef} aria-label="Task coach">
          <header>
            <div><small>{guidedMode ? "GUIDED TUTORIAL" : "TASK HELP"}</small><strong>Step {tutorialCue.step} of 10 · {tutorialCue.status}</strong></div>
            <button onClick={() => setPresenterOpen(false)} aria-label="Close task coach">×</button>
          </header>
          <div className="presenter-meter full-route" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => <i key={index} className={index < tutorialCue.step ? "active" : ""} />)}
          </div>
          <h2>{tutorialCue.title}</h2>
          <p>{tutorialCue.note}</p>
          <div className="coach-keys" aria-label="Controls for this step">
            {tutorialCue.keys.map((key) => <kbd key={key}>{key}</kbd>)}
            <span>{tutorialCue.keys.includes("WAIT") ? "WATCH THE EQUIPMENT" : "DO THIS IN THE SIMULATION"}</span>
          </div>
          <footer>{guidedMode ? "The coach moves forward after you complete the task." : <><kbd>P</kbd> close help</>}</footer>
        </aside>
      )}
    </main>
  );
}
