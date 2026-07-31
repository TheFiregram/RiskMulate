import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

beforeEach(() => {
  invoke.mockReset();
  invoke.mockImplementation((command: string) => {
    if (command.startsWith("list_")) return Promise.resolve([]);
    if (command === "create_user")
      return Promise.resolve({ id: "u1", displayName: "Ada", createdAt: 1, updatedAt: 1 });
    return Promise.resolve(undefined);
  });
});

describe("App", () => {
  it("shows the local milestone workflow", async () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "RiskMulator Studio" })).toBeVisible();
    expect(screen.getByText(/data never leaves this device/i)).toBeVisible();
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("list_users"));
  });

  it("creates a local user through the command boundary", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Ada" } });
    fireEvent.click(screen.getByRole("button", { name: "Add user" }));
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("create_user", { input: { displayName: "Ada" } }),
    );
  });
});
