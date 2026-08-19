/**
 * Game orchestrator (engine v2)
 * ----------------------------
 * Owns boot order: pre-scene systems → native core → post-scene systems.
 * Bridges legacy window CustomEvents ↔ EventBus so existing modules keep working.
 */

import { eventBus } from "./EventBus.js";
import { Events } from "./Events.js";
import { gameState } from "./GameState.js";
import { gameReady } from "../game.js";
import { scenario as riskmulateScenario } from "../scenario.js";

function showBootError(message) {
  try {
    let el = document.querySelector("#riskmulate-boot-error");
    if (!el) {
      el = document.createElement("div");
      el.id = "riskmulate-boot-error";
      el.setAttribute("role", "alert");
      el.style.cssText =
        "position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;padding:12px 14px;border-radius:10px;background:rgba(40,10,10,0.92);color:#f2d6d6;font:12px/1.4 system-ui;border:1px solid rgba(220,120,120,0.45);";
      document.body.appendChild(el);
    }
    el.textContent = message;
  } catch {
    /* ignore */
  }
  console.error("[RiskMulate]", message);
}

function softInstall(label, fn) {
  try {
    return fn();
  } catch (error) {
    showBootError(`Optional layer failed: ${label}. Core play continues.`);
    console.warn(`[RiskMulate] ${label} install failed`, error);
    return null;
  }
}

function bridgeLegacyEvents() {
  const map = Events.LEGACY_MAP;
  for (const [legacy, modern] of Object.entries(map)) {
    window.addEventListener(legacy, (event) => {
      const detail = event?.detail;
      if (modern === Events.PROGRESS) {
        gameState.applyProgress(detail || {});
      }
      if (modern === Events.FIELD_REPAIR && detail?.progress) {
        gameState.applyProgress(detail.progress);
      }
      eventBus.emit(modern, detail);
    });
  }

  eventBus.on(Events.GAME_READY, (data) => {
    window.dispatchEvent(new CustomEvent("riskmulate:engine-ready", { detail: data }));
  });
}

function runInstallers(list = []) {
  const results = {};
  for (const item of list) {
    if (!item || typeof item.fn !== "function") continue;
    results[item.label] = softInstall(item.label, item.fn);
  }
  return results;
}

export class Game {
  constructor() {
    this.started = false;
  }

  /**
   * @param {{ beforeScene?: Array<{label:string,fn:Function}>, afterScene?: Array<{label:string,fn:Function}>, afterAll?: Function }} installers
   */
  async start(installers = {}) {
    if (this.started) return this;
    this.started = true;

    window.RiskMulateScenario = riskmulateScenario;
    window.RiskMulateEngine = {
      version: 2,
      eventBus,
      Events,
      gameState,
      softInstall,
    };

    bridgeLegacyEvents();
    eventBus.emit(Events.GAME_BOOT, { engine: 2 });

    window.addEventListener("error", (event) => {
      const msg = event?.error?.message || event?.message || "Unknown runtime error";
      if (String(msg).includes("Script error")) return;
      showBootError(`Runtime: ${msg}`);
    });
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event?.reason;
      const msg = reason?.message || String(reason || "Unhandled rejection");
      showBootError(`Async: ${msg}`);
    });

    const before = installers.beforeScene || [];
    const after = installers.afterScene || [];

    runInstallers(before);

    try {
      await gameReady;
      gameState.session.ready = true;
      eventBus.emit(Events.SCENE_READY, { scene: window.RiskMulateScene });
      eventBus.emit(Events.GAME_READY, {
        scenarioId: riskmulateScenario.id,
        engine: 2,
      });
    } catch (error) {
      showBootError("Core scene failed to load. Hard-refresh or report a boot failure.");
      console.error("[RiskMulate] gameReady failed", error);
      return this;
    }

    runInstallers(after);

    if (typeof installers.afterAll === "function") {
      try {
        installers.afterAll();
      } catch (error) {
        console.warn("[RiskMulate] afterAll failed", error);
      }
    }

    const startButton = document.querySelector("#startButton");
    startButton?.addEventListener(
      "click",
      () => {
        gameState.session.started = true;
        eventBus.emit(Events.GAME_START, { at: performance.now() });
      },
      { once: true },
    );

    return this;
  }
}

export const game = new Game();
export default game;
