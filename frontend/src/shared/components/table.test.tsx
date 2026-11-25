import { ThemeProvider } from "@mui/material/styles";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../theme/theme";
import { Cell, DataTable, ErrorRow, HeadCell, NumCell, Row, RowHeader } from "./table";

function Sample({ error }: { error?: string }) {
  return (
    <ThemeProvider theme={theme}>
      <DataTable
        caption="Stock by part"
        head={
          <>
            <HeadCell>Part</HeadCell>
            <HeadCell numeric>On Shelf</HeadCell>
            <HeadCell>Raised At</HeadCell>
          </>
        }
      >
        <Row>
          <RowHeader>Spark Plug</RowHeader>
          <NumCell>4</NumCell>
          <Cell mono>28 Oct 2026, 10:44</Cell>
        </Row>
        {error && (
          <ErrorRow id="row-error" colSpan={3}>
            {error}
          </ErrorRow>
        )}
      </DataTable>
    </ThemeProvider>
  );
}

describe("table parts", () => {
  it("is a table named by its caption", () => {
    render(<Sample />);
    expect(screen.getByRole("table", { name: "Stock by part" })).toBeInTheDocument();
  });

  it("has column headers and a row header", () => {
    render(<Sample />);
    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((h) => h.textContent)).toEqual(["Part", "On Shelf", "Raised At"]);
    headers.forEach((h) => expect(h).toHaveAttribute("scope", "col"));
    const rowHeader = screen.getByRole("rowheader", { name: "Spark Plug" });
    expect(rowHeader.tagName).toBe("TH");
    expect(rowHeader).toHaveAttribute("scope", "row");
  });

  it("puts the header row in a thead and data rows in a tbody", () => {
    render(<Sample />);
    const [headGroup, bodyGroup] = screen.getAllByRole("rowgroup");
    expect(headGroup.tagName).toBe("THEAD");
    expect(within(bodyGroup).getByRole("cell", { name: "4" })).toBeInTheDocument();
  });

  it("sets a row header in the monospace face when it is an id", () => {
    render(
      <ThemeProvider theme={theme}>
        <DataTable caption="Orders" head={<HeadCell>Order</HeadCell>}>
          <Row>
            <RowHeader mono>#AB12</RowHeader>
          </Row>
        </DataTable>
      </ThemeProvider>,
    );
    const header = screen.getByRole("rowheader", { name: "#AB12" });
    expect(getComputedStyle(header).fontFamily).toContain("Plex Mono");
    expect(getComputedStyle(header).fontWeight).toBe("700");
  });

  it("passes other attributes through to a column header", () => {
    render(
      <ThemeProvider theme={theme}>
        <DataTable caption="Scans" head={<HeadCell numeric translate="no">Spark Plug</HeadCell>}>
          <Row>
            <NumCell>4</NumCell>
          </Row>
        </DataTable>
      </ThemeProvider>,
    );
    expect(screen.getByRole("columnheader", { name: "Spark Plug" })).toHaveAttribute("translate", "no");
  });

  it("renders an error row spanning the table, addressable by id", () => {
    render(<Sample error="Could not save." />);
    const cell = screen.getByRole("cell", { name: "Could not save." });
    expect(cell).toHaveAttribute("id", "row-error");
    expect(cell).toHaveAttribute("colspan", "3");
  });

  it("pins the error message to the visible part of a scrolled table", () => {
    render(<Sample error="Could not save." />);
    const message = screen.getByText("Could not save.");
    expect(getComputedStyle(message).position).toBe("sticky");
    expect(getComputedStyle(message).left).toBe("0px");
  });
});
