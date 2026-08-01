import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { initialRisks, outcome, stations } from "./scenario";
vi.mock("./rendering/CommandCentre", () => ({
  CommandCentre: class {
    onPrompt?: (value: unknown) => void;
    onInteract?: (value: unknown) => void;
    constructor(host: HTMLElement) {
      const canvas = document.createElement("canvas");
      canvas.dataset.renderer = "three";
      host.appendChild(canvas);
    }
    dispose() {}
    setAlert() {}
    setQuality() {}
    setReducedMotion() {}
    focus() {}
    playOpening() {}
  },
}));
beforeEach(() => localStorage.clear());
describe("physical command-centre experience", () => {
  it("opens on a procedural Three.js cinematic", () => {
    render(<App />);
    expect(document.querySelector('canvas[data-renderer="three"]')).toBeInTheDocument();
    expect(screen.getByText(/operation/i)).toBeVisible();
  });
  it("enters first-person play without floating station buttons", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /skip cinematic/i }));
    expect(screen.getByLabelText(/3d crisis command centre/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /open evidence/i })).not.toBeInTheDocument();
    expect(Object.keys(stations)).toHaveLength(8);
  });
  it("branches the coordinated-threat ending from investigation actions", () => {
    expect(outcome(["preserve", "verify", "isolate"], initialRisks).title).toBe(
      "COORDINATED THREAT",
    );
  });
});
