import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("identifies the project as a non-running foundation", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "RiskMulator Studio" })).toBeVisible();
    expect(screen.getByText(/no simulation is running/i)).toBeVisible();
  });
});
