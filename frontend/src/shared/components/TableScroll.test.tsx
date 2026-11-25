import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TableScroll from "./TableScroll";

function stubWidths(scrollWidth: number, clientWidth: number) {
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(scrollWidth);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(clientWidth);
}

const renderTable = () =>
  render(
    <TableScroll label="Active alerts">
      <table>
        <tbody>
          <tr>
            <td>Spark Plug</td>
          </tr>
        </tbody>
      </table>
    </TableScroll>,
  );

describe("TableScroll", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is a region named by its label", () => {
    stubWidths(300, 300);
    renderTable();
    expect(screen.getByRole("region", { name: "Active alerts" })).toContainElement(screen.getByRole("table"));
  });

  it("joins the tab order when the table is wider than the box", () => {
    stubWidths(640, 320);
    renderTable();
    expect(screen.getByRole("region", { name: "Active alerts" })).toHaveAttribute("tabindex", "0");
  });

  it("publishes its visible width so row messages can stay in view", () => {
    stubWidths(640, 320);
    renderTable();
    expect(screen.getByRole("region", { name: "Active alerts" }).style.getPropertyValue("--table-scroll-width")).toBe("320px");
  });

  it("stays out of the tab order when nothing overflows", () => {
    stubWidths(300, 300);
    renderTable();
    expect(screen.getByRole("region", { name: "Active alerts" })).not.toHaveAttribute("tabindex");
  });
});
