import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CardPage, { CardBrand } from "./CardPage";
import EmptyState from "./EmptyState";
import { Page, PageHead } from "./Page";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "./Panel";

describe("Panel", () => {
  it("is a section named by its heading, with header, body and footer", () => {
    render(
      <Panel aria-labelledby="t">
        <PanelHeader split>
          <h2 id="t">Stock Check</h2>
        </PanelHeader>
        <PanelBody>Body</PanelBody>
        <PanelFooter>Footer</PanelFooter>
      </Panel>,
    );
    const region = screen.getByRole("region", { name: "Stock Check" });
    expect(region.tagName).toBe("SECTION");
    expect(getComputedStyle(screen.getByRole("heading").parentElement!).display).toBe("flex");
  });

  it("marks the alert tone with a warning bar on the left", () => {
    render(<Panel tone="alert" aria-label="Alerts" />);
    expect(getComputedStyle(screen.getByRole("region", { name: "Alerts" })).borderLeftWidth).toBe("4px");
  });

  it("can be a plain container", () => {
    const { container } = render(<Panel component="div">Card</Panel>);
    expect(container.firstElementChild?.tagName).toBe("DIV");
  });
});

describe("EmptyState", () => {
  it("shows a bold title above the hint", () => {
    render(<EmptyState title="No scans yet">Each scan you run is listed here.</EmptyState>);
    expect(screen.getByText("No scans yet").tagName).toBe("STRONG");
    expect(screen.getByText(/Each scan you run/)).toBeInTheDocument();
  });

  it("can be a loading status line", () => {
    render(
      <EmptyState component="p" role="status">
        Loading scans…
      </EmptyState>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading scans…");
    expect(screen.getByRole("status").tagName).toBe("P");
  });
});

describe("Page", () => {
  it("stacks its sections and lays the head out as a row", () => {
    render(
      <Page data-testid="page">
        <PageHead data-testid="head">
          <h1>Orders</h1>
        </PageHead>
      </Page>,
    );
    expect(getComputedStyle(screen.getByTestId("page")).flexDirection).toBe("column");
    expect(getComputedStyle(screen.getByTestId("head")).flexWrap).toBe("wrap");
  });
});

describe("CardPage", () => {
  it("is the main landmark holding one card, with the brand", () => {
    render(
      <CardPage role="alert">
        <CardBrand />
        <h1>Something Went Wrong</h1>
      </CardPage>,
    );
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("alert"));
    expect(screen.getByText("Smart Inventory")).toHaveAttribute("translate", "no");
  });
});
