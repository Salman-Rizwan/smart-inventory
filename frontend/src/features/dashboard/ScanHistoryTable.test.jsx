import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ScanHistoryTable from "./ScanHistoryTable";

const scan = (id, counts, inferenceMs) => ({ id, counts, scannedAt: new Date("2026-10-24T06:00:00Z"), inferenceMs });

describe("ScanHistoryTable", () => {
  it("shows an empty state instead of an empty table", () => {
    render(<ScanHistoryTable scans={[]} loading={false} error="" />);
    expect(screen.getByText("No scans yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an error message and no table", () => {
    render(<ScanHistoryTable scans={[]} loading={false} error="Live data could not be loaded." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Live data could not be loaded.");
  });

  it("builds one column per part, including parts it has never seen", () => {
    render(
      <ScanHistoryTable
        scans={[scan("1", { spark_plug: 4, petrol_filter: 1 }, 412), scan("2", { spark_plug: 3, brake_pad: 2 }, 650)]}
        loading={false}
        error=""
      />,
    );
    const table = screen.getByRole("table", { name: /last 2 scans/i });
    for (const name of ["Spark Plug", "Petrol Filter", "Brake Pad"]) {
      expect(within(table).getByRole("columnheader", { name })).toBeInTheDocument();
    }
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });
});
