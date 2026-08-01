import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
vi.mock("./rendering/CommandCentre", () => ({
  CommandCentre: class {
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
  },
}));
beforeEach(() => localStorage.clear());
describe("RiskMulator Studio", () => {
  it("launches directly into the cinematic", () => {
    render(<App />);
    expect(screen.getByText("OPERATION", { exact: false })).toBeVisible();
    expect(screen.getByRole("button", { name: /assume command/i })).toBeVisible();
  });
  it("enters the playable command centre and opens a station", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /assume command/i }));
    expect(screen.getByLabelText(/3d crisis command centre/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /open evidence board/i }));
    expect(screen.getByText("2.4 GB outbound transfer")).toBeVisible();
  });
  it("applies a meaningful action and persists it", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /assume command/i }));
    fireEvent.click(screen.getByRole("button", { name: /open evidence board/i }));
    fireEvent.click(screen.getByRole("button", { name: /preserve transfer image/i }));
    expect(screen.getByText(/forensic image sealed/i)).toBeVisible();
    expect(localStorage.getItem("riskmulator.black-ledger.v1")).toContain("preserve");
  });
});
