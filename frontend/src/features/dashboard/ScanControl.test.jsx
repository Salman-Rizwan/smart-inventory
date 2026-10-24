import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./scanApi", async (importOriginal) => ({ ...(await importOriginal()), runScan: vi.fn() }));
vi.mock("../../firebase", () => ({ auth: {}, db: {} }));

import { ApiError } from "../../shared/api/httpClient";
import ScanControl from "./ScanControl";
import { runScan } from "./scanApi";

describe("ScanControl", () => {
  beforeEach(() => vi.clearAllMocks());

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

  it("does not leak unknown error details", async () => {
    runScan.mockRejectedValue(new Error("stack trace with secrets"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ScanControl />);

    await userEvent.click(screen.getByRole("button", { name: "Scan Now" }));
    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("secrets");
    expect(alert).toHaveTextContent(/could not be completed/);
  });
});
