import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SummaryTiles from "./SummaryTiles";

describe("SummaryTiles", () => {
  it("renders each tile as a term with its value and hint", () => {
    render(<SummaryTiles tiles={[{ label: "Open", value: "3", hint: "Needs your action" }]} />);
    expect(screen.getByRole("term")).toHaveTextContent("Open");
    expect(screen.getAllByRole("definition").map((d) => d.textContent)).toEqual(["3", "Needs your action"]);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("makes a tile with a destination a link on its label", () => {
    render(
      <MemoryRouter>
        <SummaryTiles tiles={[{ label: "Sales", value: "LKR 1,000", hint: "+5%", to: "/insights#sales" }]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Sales" })).toHaveAttribute("href", "/insights#sales");
  });
});
