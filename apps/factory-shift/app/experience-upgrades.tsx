"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FactoryExperience from "./factory-experience";

type RiskNodeId = "objective" | "cause" | "event" | "consequence" | "treatment" | "residual";
type UiTone = "hover" | "select";

type RiskNode = {
  id: RiskNodeId;
  index: string;
  label: string;
  kicker: string;
  lesson: string;
};

const RISK_NODES: RiskNode[] = [
  {
    id: "objective",
    index: "00",
    label: "Objective",
    kicker: "Context",
    lesson: "Risk only has meaning against an objective. Start with what the operation is trying to achieve.",
  },
  {
    id: "cause",
    index: "01",
    label: "Cause",
    kicker: "Source",
    lesson: "A cause creates the conditions for uncertainty. It is not the risk event itself.",
  },
  {
    id: "event",
    index: "02",
    label: "Event",
    kicker: "Uncertainty",
    lesson: "The event is what may happen. Keep it separate from its causes and consequences.",
  },
  {
    id: "consequence",
    index: "03",
    label: "Consequence",
    kicker: "Effect",
    lesson: "Consequences describe the effect on objectives, such as safety, continuity, quality, cost, or schedule.",
  },
  {
    id: "treatment",
    index: "04",
    label: "Treatment",
    kicker: "Response",
    lesson: "A treatment changes the risk by changing likelihood, consequence, exposure, or the activity itself.",
  },
  {
    id: "residual",
    index: "05",
    label: "Residual risk",
    kicker: "Remaining exposure",
    lesson: "Treatment rarely removes all uncertainty. Residual risk is what remains after the response is applied.",
  },
];

const DEFAULT_DETAILS: Record<RiskNodeId, string> = {
  objective: "Restart and stabilize the process without creating an unacceptable safety, quality, or production exposure.",
  cause: "Mechanical degradation and maintenance delay create the conditions for a developing pump fault.",
  event: "P-204 may lose reliable pumping capability during the restart window.",
  consequence: "Loss of flow can affect people, equipment condition, production continuity, and downstream process stability.",
  treatment: "The selected operating response changes how the plant is exposed to the developing fault.",
  residual: "Some uncertainty remains after the control is applied and must be monitored through the rest of the shift.",
};

function closestButton(target: EventTarget | null) {
  return target instanceof Element ? target.closest("button") : null;
}

export default function ExperienceUpgrades() {
  const rootRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);
  const soundEnabledRef = useRef(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [startVisible, setStartVisible] = useState(true);
  const [debriefAvailable, setDebriefAvailable] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [activeNode, setActiveNode] = useState<RiskNodeId>("event");
  const [details, setDetails] = useState<Record<RiskNodeId, string>>(DEFAULT_DETAILS);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (audioContextRef.current) return audioContextRef.current;

    const AudioContextConstructor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;

    audioContextRef.current = new AudioContextConstructor();
    return audioContextRef.current;
  }, []);

  const unlockAudio = useCallback(() => {
    const context = getAudioContext();
    if (!context) return;
    audioUnlockedRef.current = true;
    if (context.state === "suspended") void context.resume();
  }, [getAudioContext]);

  const playUiTone = useCallback((tone: UiTone) => {
    if (!soundEnabledRef.current || !audioUnlockedRef.current) return;
    const context = getAudioContext();
    if (!context || context.state === "closed") return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const duration = tone === "hover" ? 0.045 : 0.09;

    oscillator.type = tone === "hover" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(tone === "hover" ? 620 : 240, now);
    if (tone === "select") oscillator.frequency.exponentialRampToValueAtTime(390, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(tone === "hover" ? 0.018 : 0.035, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }, [getAudioContext]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onPointerOver = (event: PointerEvent) => {
      const button = closestButton(event.target);
      if (!button || (event.relatedTarget instanceof Node && button.contains(event.relatedTarget))) return;
      playUiTone("hover");
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!closestButton(event.target)) return;
      unlockAudio();
      window.setTimeout(() => playUiTone("select"), 0);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Enter" || event.key === " ") && closestButton(event.target)) {
        unlockAudio();
        playUiTone("select");
      }
    };

    root.addEventListener("pointerover", onPointerOver);
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("pointerover", onPointerOver);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("keydown", onKeyDown);
    };
  }, [playUiTone, unlockAudio]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scanExperience = () => {
      const startScreen = root.querySelector(".start-screen");
      const debrief = root.querySelector(".debrief");
      setStartVisible(Boolean(startScreen));
      setDebriefAvailable(Boolean(debrief));

      if (!debrief) {
        setMapOpen(false);
        return;
      }

      const causalCards = Array.from(debrief.querySelectorAll<HTMLElement>(".causal-chain article p"));
      if (causalCards.length < 5) return;

      setDetails({
        objective: DEFAULT_DETAILS.objective,
        cause: causalCards[0]?.textContent?.trim() || DEFAULT_DETAILS.cause,
        event: causalCards[1]?.textContent?.trim() || DEFAULT_DETAILS.event,
        consequence: causalCards[2]?.textContent?.trim() || DEFAULT_DETAILS.consequence,
        treatment: causalCards[3]?.textContent?.trim() || DEFAULT_DETAILS.treatment,
        residual: causalCards[4]?.textContent?.trim() || DEFAULT_DETAILS.residual,
      });
    };

    scanExperience();
    const observer = new MutationObserver(scanExperience);
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "m" && !event.repeat) {
        setSoundEnabled((enabled) => !enabled);
        return;
      }
      if (event.key.toLowerCase() === "r" && debriefAvailable && !event.repeat) {
        setMapOpen((open) => !open);
        return;
      }
      if (event.key === "Escape" && mapOpen) setMapOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [debriefAvailable, mapOpen]);

  useEffect(() => () => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
  }, []);

  const selectedNode = useMemo(
    () => RISK_NODES.find((node) => node.id === activeNode) ?? RISK_NODES[2],
    [activeNode],
  );

  return (
    <div className="riskmulate-enhanced-shell" ref={rootRef}>
      <FactoryExperience />

      {startVisible && (
        <button
          className={`shell-sound-toggle ${soundEnabled ? "is-on" : ""}`}
          type="button"
          aria-pressed={soundEnabled}
          onClick={() => setSoundEnabled((enabled) => !enabled)}
        >
          <span aria-hidden="true">{soundEnabled ? "◖))" : "◖×"}</span>
          <b>{soundEnabled ? "UI AUDIO ON" : "UI AUDIO OFF"}</b>
          <kbd>M</kbd>
        </button>
      )}

      {debriefAvailable && !mapOpen && (
        <button className="risk-map-launch" type="button" onClick={() => setMapOpen(true)}>
          <small>INTERACTIVE REVIEW</small>
          <strong>OPEN RISK CHAIN</strong>
          <kbd>R</kbd>
        </button>
      )}

      {mapOpen && (
        <div className="risk-map-scrim" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setMapOpen(false);
        }}>
          <section className="risk-map-dialog" role="dialog" aria-modal="true" aria-labelledby="risk-map-title">
            <header className="risk-map-header">
              <div>
                <small>AFTER ACTION · CAUSAL MODEL</small>
                <h2 id="risk-map-title">How the uncertainty moved through the system</h2>
              </div>
              <button type="button" onClick={() => setMapOpen(false)} aria-label="Close risk chain">×</button>
            </header>

            <div className="risk-map-definition">
              <span>ISO 31000</span>
              <p><b>Risk</b> is the effect of uncertainty on objectives. Read the chain from the objective outward, then check what remains after treatment.</p>
            </div>

            <div className="risk-map-route" aria-label="Cause event consequence treatment and residual risk chain">
              {RISK_NODES.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  className={`risk-map-node node-${node.id} ${activeNode === node.id ? "active" : ""}`}
                  onClick={() => setActiveNode(node.id)}
                >
                  <span>{node.index}</span>
                  <small>{node.kicker}</small>
                  <strong>{node.label}</strong>
                </button>
              ))}
            </div>

            <article className="risk-map-detail">
              <div className="risk-map-detail-index">{selectedNode.index}</div>
              <div>
                <small>{selectedNode.kicker.toUpperCase()}</small>
                <h3>{selectedNode.label}</h3>
                <p>{details[selectedNode.id]}</p>
              </div>
              <aside>
                <small>WHAT TO LEARN</small>
                <p>{selectedNode.lesson}</p>
              </aside>
            </article>

            <footer className="risk-map-footer">
              <span><i /> Cause ≠ event</span>
              <span><i /> Event ≠ consequence</span>
              <span><i /> Treatment ≠ zero risk</span>
              <button type="button" onClick={() => setMapOpen(false)}>RETURN TO DEBRIEF <b>ESC</b></button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
