import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("./AuthContext", () => ({ useAuth: vi.fn() }));

import { useAuth } from "./AuthContext";
import RoleRoute from "./RoleRoute";

function renderAt(path, role) {
  useAuth.mockReturnValue({ profile: { name: "T", role } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RoleRoute allow={["shopkeeper"]} />}>
          <Route path="/dashboard" element={<p>Shopkeeper page</p>} />
        </Route>
        <Route element={<RoleRoute allow={["dealer"]} />}>
          <Route path="/orders" element={<p>Dealer page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("RoleRoute", () => {
  it("lets a shopkeeper into the shopkeeper page", () => {
    renderAt("/dashboard", "shopkeeper");
    expect(screen.getByText("Shopkeeper page")).toBeInTheDocument();
  });

  it("sends a dealer who opens the shopkeeper page to the orders page", () => {
    renderAt("/dashboard", "dealer");
    expect(screen.getByText("Dealer page")).toBeInTheDocument();
    expect(screen.queryByText("Shopkeeper page")).not.toBeInTheDocument();
  });

  it("sends a shopkeeper who opens the dealer page to the dashboard", () => {
    renderAt("/orders", "shopkeeper");
    expect(screen.getByText("Shopkeeper page")).toBeInTheDocument();
  });
});
