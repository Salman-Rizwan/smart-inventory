import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./scanApi", async (importOriginal) => ({ ...(await importOriginal()), runScan: vi.fn() }));
vi.mock("../../firebase", () => ({ auth: {}, db: {} }));
vi.mock("../../shared/hosting", () => ({ isHostedOrigin: vi.fn(() => false) }));

import { ApiError } from "../../shared/api/httpClient";
import { isHostedOrigin } from "../../shared/hosting";
import ScanControl from "./ScanControl";
import { runScan } from "./scanApi";

describe("ScanControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isHostedOrigin.mockReturnValue(false);
  });

  it("shows a busy, disabled button while scanning, then a success summary", async () => {
    let finish;
    runScan.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<ScanControl />);

    await userEvent.click(screen.getByRole("button", { name: "Scan Now" }));
    const busy = screen.getByRole("button", { name: /Scanning/ });
    expect(busy).toBeDisabled();

    finish({ counts: { spark_plug: 3, petrol_filter: 1 }, inferenceMs: 412 });
    expect(await screen.findByText(/3 Spark Plug, 1 Petrol Filter/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scan Now" })).toBeEnabled();
  });

  it("explains how to recover when the backend is unreachable", async () => {
    runScan.mockRejectedValue(new ApiError("Cannot reach the backend.", { code: "network_error" }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ScanControl />);

    await userEvent.click(screen.getByRole("button", { name: "Scan Now" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/backend is running/);
    expect(screen.getByRole("button", { name: "Scan Now" })).toBeEnabled();
  });

  it("on the hosted app, says Scan Now works from the shop laptop and what to allow, not 'start the backend'", async () => {
    isHostedOrigin.mockReturnValue(true);
    runScan.mockRejectedValue(new ApiError("Cannot reach the backend.", { code: "network_error" }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ScanControl />);

    await userEvent.click(screen.getByRole("button", { name: "Scan Now" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/works only from the shop laptop/);
    expect(alert).toHaveTextContent(/allow local network access/);
    expect(alert).toHaveTextContent(/http:\/\/localhost:5173/);
    expect(alert).toHaveTextContent(/Shelf counts still update by themselves/);
    expect(alert).not.toHaveTextContent(/Make sure the backend is running/);
    expect(screen.getByRole("button", { name: "Scan Now" })).toBeEnabled();
  });

  it("does not leak unknown error details", async () => {
    runScan.mockRejectedValue(new Error("stack trace with secrets"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ScanControl />);

    await userEvent.click(screen.getByRole("button", { name: "Scan Now" }));
    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("secrets");
    expect(alert).toHaveTextContent(/could not be completed/);
  });

  it("says to turn on the light when the frame is too dark to count", async () => {
    runScan.mockRejectedValue(new ApiError("Too dark.", { status: 422, code: "frame_too_dark" }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ScanControl />);

    await userEvent.click(screen.getByRole("button", { name: "Scan Now" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too dark to count the parts. Turn on the shelf light, then scan again.",
    );
    expect(screen.getByRole("button", { name: "Scan Now" })).toBeEnabled();
  });
});
