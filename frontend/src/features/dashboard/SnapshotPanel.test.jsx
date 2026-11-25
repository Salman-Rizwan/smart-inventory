import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./hooks", () => ({ useSnapshot: vi.fn() }));
vi.mock("../../shared/hosting", () => ({ isHostedOrigin: vi.fn(() => false) }));

import { isHostedOrigin } from "../../shared/hosting";
import { useSnapshot } from "./hooks";
import SnapshotPanel from "./SnapshotPanel";

const scannedAt = new Date("2026-11-12T08:00:00Z");

describe("SnapshotPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isHostedOrigin.mockReturnValue(false);
  });

  it("shows the annotated photo with a description when it is ready", () => {
    useSnapshot.mockReturnValue({ url: "blob:shelf", status: "ready" });
    render(<SnapshotPanel scannedAt={scannedAt} />);
    expect(screen.getByRole("img", { name: /Webcam photo of the shelf/ })).toHaveAttribute("src", "blob:shelf");
  });

  it.each([
    ["loading", /Loading image/],
    ["empty", /appears here after the first scan/],
  ])("says what is happening while %s", (status, text) => {
    useSnapshot.mockReturnValue({ url: null, status });
    render(<SnapshotPanel scannedAt={scannedAt} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("on the laptop, an error tells the shopkeeper to check the backend", () => {
    useSnapshot.mockReturnValue({ url: null, status: "error" });
    render(<SnapshotPanel scannedAt={scannedAt} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Make sure the backend is running, then refresh the page.");
  });

  it("on the hosted app, explains that the image lives on the shop laptop, as information and not a fault", () => {
    isHostedOrigin.mockReturnValue(true);
    useSnapshot.mockReturnValue({ url: null, status: "error" });
    render(<SnapshotPanel scannedAt={scannedAt} />);
    expect(screen.getByText(/comes from the shop laptop and cannot be shown here/)).toBeInTheDocument();
    expect(screen.getByText(/Open the app on the shop laptop to see it/)).toBeInTheDocument();
    expect(screen.queryByText(/Make sure the backend is running/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
