import { useEffect, useMemo, useRef, useState } from "react";
import { CommandCentre, type Quality } from "./rendering/CommandCentre";
import {
  actions,
  evidence,
  initialRisks,
  outcome,
  stations,
  type RiskState,
  type StationId,
} from "./scenario";

type Mode = "opening" | "command" | "debrief";
const SAVE_KEY = "riskmulator.black-ledger.v1";

function RiskStrip({ risks }: { risks: RiskState }) {
  const items: [string, keyof RiskState, boolean][] = [
    ["Security risk", "security", true],
    ["Operations", "operations", false],
    ["Financial exposure", "finance", true],
    ["Legal exposure", "legal", true],
    ["Public trust", "trust", false],
    ["Employee safety", "safety", false],
    ["Evidence integrity", "evidence", false],
  ];
  return (
    <div className="risk-strip">
      {items.map(([label, key, inverse]) => {
        const danger = inverse ? risks[key] : 100 - risks[key];
        return (
          <div className="risk" key={key}>
            <span>{label}</span>
            <b className={danger > 55 ? "hot" : danger > 30 ? "warm" : "cool"}>
              {danger > 65 ? "CRITICAL" : danger > 40 ? "ELEVATED" : "STABLE"}
            </b>
            <i>
              <em style={{ width: `${risks[key]}%` }} />
            </i>
          </div>
        );
      })}
    </div>
  );
}

function World({
  onSelect,
  crisis,
  quality,
  reducedMotion,
  cinematic = false,
  onPrompt,
}: {
  onSelect: (id: StationId) => void;
  crisis: boolean;
  quality: Quality;
  reducedMotion: boolean;
  cinematic?: boolean;
  onPrompt?: (station: StationId | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<CommandCentre | null>(null);
  const initialQuality = useRef(quality);
  // The renderer owns a single lifecycle; live preferences are forwarded by the effects below.
  useEffect(() => {
    if (!host.current) return;
    world.current = new CommandCentre(host.current, initialQuality.current);
    world.current.onPrompt = onPrompt;
    world.current.onInteract = (id) => {
      world.current?.focus(id);
      onSelect(id);
    };
    if (cinematic) world.current.playOpening();
    return () => world.current?.dispose();
    // Renderer construction intentionally occurs once; callbacks are bound to this scene lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => world.current?.setAlert(crisis), [crisis]);
  useEffect(() => world.current?.setQuality(quality), [quality]);
  useEffect(() => world.current?.setReducedMotion(reducedMotion), [reducedMotion]);
  return (
    <div className={`world ${crisis ? "crisis" : ""}`} aria-label="3D crisis command centre">
      <div className="three-host" ref={host} />
      <div className="hologram">
        <i />
        <span>
          AEGIS
          <br />
          <b>INCIDENT LIVE</b>
        </span>
      </div>
    </div>
  );
}

export function App() {
  const saved = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY) || "null") as {
        completed: string[];
        risks: RiskState;
        elapsed: number;
      } | null;
    } catch {
      return null;
    }
  }, []);
  const [mode, setMode] = useState<Mode>("opening");
  const [selected, setSelected] = useState<StationId | null>(null);
  const [completed, setCompleted] = useState<string[]>(saved?.completed || []);
  const [risks, setRisks] = useState<RiskState>(saved?.risks || initialRisks);
  const [elapsed, setElapsed] = useState(saved?.elapsed || 0);
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState(
    "Maya: Director, DLP just flagged a transfer from Finance. The credentials say Lena Price. The device does not.",
  );
  const [evidenceOpen, setEvidenceOpen] = useState<string | null>(null);
  const [tags, setTags] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState(false);
  const [muted, setMuted] = useState(true);
  const [quality, setQuality] = useState<Quality>("HIGH");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [nearby, setNearby] = useState<StationId | null>(null);
  useEffect(() => {
    if (mode !== "command" || paused) return;
    const t = window.setInterval(() => setElapsed((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [mode, paused]);
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ completed, risks, elapsed }));
  }, [completed, risks, elapsed]);
  useEffect(() => {
    if (elapsed === 45)
      setMessage(
        "Sofia: A journalist is asking whether acquisition files were stolen. We have minutes, not hours.",
      );
    if (elapsed === 90)
      setRisks((r) => ({
        ...r,
        security: Math.min(100, r.security + 14),
        operations: r.operations - 12,
      }));
  }, [elapsed]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.code === "Escape" && mode === "command") setPaused((value) => !value);
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [mode]);
  useEffect(() => {
    if (mode !== "opening") return;
    const timer = window.setTimeout(() => setMode("command"), reducedMotion ? 2500 : 9000);
    return () => window.clearTimeout(timer);
  }, [mode, reducedMotion]);
  const act = (id: string) => {
    if (completed.includes(id)) return;
    const action = actions.find((a) => a.id === id)!;
    setCompleted((c) => [...c, id]);
    setRisks((current) => {
      const next = { ...current };
      Object.entries(action.effects).forEach(
        ([k, v]) =>
          (next[k as keyof RiskState] = Math.max(
            0,
            Math.min(100, next[k as keyof RiskState] + (v || 0)),
          )),
      );
      return next;
    });
    setMessage(action.followup);
  };
  const finish = () => setMode("debrief");
  const ending = outcome(completed, risks);
  const phase =
    elapsed < 40 ? "01 / FIRST WARNING" : elapsed < 90 ? "02 / INVESTIGATION" : "03 / ESCALATION";
  if (mode === "opening")
    return (
      <main className="game opening-scene">
        <World
          onSelect={() => undefined}
          crisis={false}
          quality={quality}
          reducedMotion={reducedMotion}
          cinematic
        />
        <div className="letterbox top" />
        <section className="briefing opening-briefing">
          <div className="aegis-mark">
            <i />
            AEGIS DYNAMICS
          </div>
          <p className="date">LONDON HQ · 14 OCTOBER · 08:42</p>
          <h1>
            OPERATION
            <br />
            <span>BLACK LEDGER</span>
          </h1>
          <p className="role">INCIDENT RESPONSE DIRECTOR</p>
          <p className="subtitle">“A normal morning just became a live corporate crisis.”</p>
          <button className="enter" onClick={() => setMode("command")}>
            {saved ? "CONTINUE INCIDENT" : "SKIP CINEMATIC"}
            <small>ENTER</small>
          </button>
        </section>
        <div className="letterbox bottom">
          <span>PROCEDURAL CINEMATIC · PRESS ENTER TO SKIP</span>
        </div>
      </main>
    );
  if (mode === "debrief")
    return (
      <main className={`debrief ${ending.tone}`}>
        <div className="debrief-grid" />
        <header>
          <span>AEGIS DYNAMICS · INCIDENT CLOSED</span>
          <b>
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")}
          </b>
        </header>
        <section>
          <p>OPERATION BLACK LEDGER</p>
          <h1>{ending.title}</h1>
          <div className="ending-line" />
          <p className="ending-copy">{ending.text}</p>
          <div className="truth">
            <span>WHAT ACTUALLY HAPPENED</span>
            <p>
              Noah Grant provided physical access while an external group cloned Lena Price's
              credentials. The suspicious payments financed the access operation; the USB record was
              planted to focus the investigation on Lena.
            </p>
          </div>
          <div className="score-grid">
            <div>
              <b>{completed.length}</b>
              <span>DECISIONS LOGGED</span>
            </div>
            <div>
              <b>{risks.evidence}</b>
              <span>EVIDENCE INTEGRITY</span>
            </div>
            <div>
              <b>{risks.trust}</b>
              <span>PUBLIC TRUST</span>
            </div>
            <div>
              <b>{Math.max(0, 100 - risks.security)}</b>
              <span>CONTAINMENT</span>
            </div>
          </div>
          <div className="debrief-actions">
            <button
              onClick={() => {
                localStorage.removeItem(SAVE_KEY);
                location.reload();
              }}
            >
              RESTART SCENARIO
            </button>
            <button
              className="ghost"
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify({ ending, completed, risks, elapsed }, null, 2)],
                  { type: "application/json" },
                );
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "black-ledger-debrief.json";
                a.click();
              }}
            >
              EXPORT DEBRIEF
            </button>
          </div>
        </section>
      </main>
    );
  return (
    <main className="game">
      <World
        onSelect={setSelected}
        crisis={elapsed > 75}
        quality={quality}
        reducedMotion={reducedMotion}
        onPrompt={setNearby}
      />
      <header className="topbar">
        <div className="brand">
          <i />
          RISK<span>MULATOR</span>
        </div>
        <div className="phase">
          <small>OPERATION BLACK LEDGER</small>
          <b>{phase}</b>
        </div>
        <div className="clock">
          <button onClick={() => setPaused(!paused)}>{paused ? "▶" : "Ⅱ"}</button>
          <span>
            08:{String(42 + Math.floor(elapsed / 60)).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")}
          </span>
          <small>SIMULATION TIME</small>
        </div>
        <button className="icon" onClick={() => setMuted(!muted)}>
          {muted ? "⌁" : "◖"}
        </button>
        <button className="icon" onClick={() => setSettings(!settings)}>
          ⚙
        </button>
      </header>
      <RiskStrip risks={risks} />
      <aside className="objectives">
        <span>ACTIVE DIRECTIVE</span>
        <b>Establish what left the network.</b>
        <p>{completed.length}/4 critical actions complete</p>
      </aside>
      <div className="dialogue">
        <div className="avatar">
          MC<span>LIVE</span>
        </div>
        <div>
          <span>MAYA CHEN · SECURITY OPERATIONS</span>
          <p>{message}</p>
        </div>
      </div>
      <div className="controls">
        WASD <span>MOVE</span> · DRAG <span>LOOK</span> · ESC <span>PAUSE</span>
      </div>
      {nearby && !selected && (
        <div className="interaction-prompt">
          <kbd>E</kbd>
          <span>USE {stations[nearby].label.toUpperCase()}</span>
        </div>
      )}
      {selected && (
        <section className="panel station-interface">
          <button
            className="close"
            onClick={() => {
              setSelected(null);
              setEvidenceOpen(null);
            }}
          >
            ×
          </button>
          <span className="panel-code">{stations[selected].code}</span>
          <h2>{stations[selected].label}</h2>
          <p>{stations[selected].description}</p>
          <div className="station-status">
            <div>
              <span>CHANNEL</span>
              <b>{elapsed > 75 ? "EMERGENCY" : "SECURE"}</b>
            </div>
            <div>
              <span>FEED STATUS</span>
              <b>{selected === "news" ? "BREAKING" : "LIVE"}</b>
            </div>
          </div>
          {selected === "evidence" ? (
            <>
              <div className="evidence-list">
                {evidence.map((item) => (
                  <article
                    key={item.id}
                    className={evidenceOpen === item.id ? "open" : ""}
                    onClick={() => setEvidenceOpen(item.id)}
                  >
                    <time>{item.time}</time>
                    <div>
                      <span>{item.source}</span>
                      <b>{item.title}</b>
                      {evidenceOpen === item.id && (
                        <>
                          <p>{item.body}</p>
                          <div className="tags">
                            {["SUSPICIOUS", "VERIFIED", "HIGH PRIORITY"].map((tag) => (
                              <button
                                className={tags[item.id] === tag ? "on" : ""}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTags((t) => ({ ...t, [item.id]: tag }));
                                }}
                                key={tag}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <div className="action-list">
                {actions
                  .filter((action) => action.station === selected)
                  .map((action) => (
                    <button
                      disabled={completed.includes(action.id)}
                      onClick={() => act(action.id)}
                      key={action.id}
                    >
                      <b>
                        {completed.includes(action.id) ? "✓ " : ""}
                        {action.label}
                      </b>
                      <span>{action.detail}</span>
                    </button>
                  ))}
              </div>
            </>
          ) : selected === "cctv" ? (
            <>
              <div className="cctv">
                <span>CAM 07 · LEVEL 4 · 22:17:03</span>
                <div className="figure one" />
                <div className="figure two" />
                <i>TRACKING: SUBJECT 02</i>
              </div>
              <div className="action-list">
                {actions
                  .filter((a) => a.station === selected)
                  .map((a) => (
                    <button
                      disabled={completed.includes(a.id)}
                      onClick={() => act(a.id)}
                      key={a.id}
                    >
                      <b>
                        {completed.includes(a.id) ? "✓ " : ""}
                        {a.label}
                      </b>
                      <span>{a.detail}</span>
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <div className="action-list">
              {actions
                .filter((a) => a.station === selected)
                .map((a) => (
                  <button disabled={completed.includes(a.id)} onClick={() => act(a.id)} key={a.id}>
                    <b>
                      {completed.includes(a.id) ? "✓ " : ""}
                      {a.label}
                    </b>
                    <span>{a.detail}</span>
                  </button>
                ))}
            </div>
          )}
          <button className="resolve" onClick={finish}>
            CONVENE EXECUTIVE RESPONSE →
          </button>
        </section>
      )}
      {settings && (
        <div className="settings">
          <button onClick={() => setSettings(false)}>×</button>
          <h3>ACCESSIBILITY & QUALITY</h3>
          <label>
            QUALITY{" "}
            <select value={quality} onChange={(event) => setQuality(event.target.value as Quality)}>
              <option>LOW</option>
              <option>MEDIUM</option>
              <option>HIGH</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(event) => setReducedMotion(event.target.checked)}
            />{" "}
            REDUCED MOTION
          </label>
          <label>
            <input type="checkbox" /> HIGH CONTRAST
          </label>
          <p>Subtitles are always enabled during operational dialogue.</p>
        </div>
      )}
    </main>
  );
}
