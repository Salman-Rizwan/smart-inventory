import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ScanHistoryTable, { type Scan } from "./ScanHistoryTable";

const scan = (id: string, counts: Record<string, number>, inferenceMs: number): Scan => ({ id, counts, scannedAt: new Date("2026-10-24T06:00:00Z"), inferenceMs });

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

  it("names each row by its scan time and right-aligns the counts", () => {
    render(<ScanHistoryTable scans={[scan("1", { spark_plug: 4 }, 412)]} loading={false} error="" />);
    const row = screen.getAllByRole("row")[1];
    const header = within(row).getByRole("rowheader");
    expect(header.tagName).toBe("TH");
    expect(header).toHaveAttribute("scope", "row");
    expect(within(row).getAllByRole("cell").map((c) => c.textContent)).toEqual(["4", "412"]);
    expect(screen.getByRole("columnheader", { name: "Spark Plug" })).toHaveAttribute("translate", "no");
  });
});
