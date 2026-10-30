import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./orderRepository", () => ({ advanceOrder: vi.fn(), fetchOrder: vi.fn(), receiveOrder: vi.fn() }));

import { performOrderAction } from "./orderActions";
import { advanceOrder, fetchOrder, receiveOrder } from "./orderRepository";
import { actionFor } from "./orderWorkflow";
import type { Order, OrderState } from "./types";

const accept = actionFor("dealer", "Pending")!;
const receive = actionFor("shopkeeper", "Dispatched")!;
const denied = { code: "permission-denied" };
const at = (state: OrderState): Order => ({ id: "o1", product: "spark_plug", qty: 2, state, createdAt: null });

describe("performOrderAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("receives through the transaction and advances other steps with an update", async () => {
    await performOrderAction("o1", receive);
    await performOrderAction("o1", accept);
    expect(receiveOrder).toHaveBeenCalledWith("o1");
    expect(advanceOrder).toHaveBeenCalledWith("o1", accept);
    expect(fetchOrder).not.toHaveBeenCalled();
  });

  it("turns a refusal into \"already received\" when someone else received it first", async () => {
    vi.mocked(receiveOrder).mockRejectedValue(denied);
    vi.mocked(fetchOrder).mockResolvedValue(at("Received"));
    await expect(performOrderAction("o1", receive)).rejects.toMatchObject({ code: "moved_on", state: "Received" });
  });

  it("turns a refusal into \"no longer exists\" when the order was deleted", async () => {
    vi.mocked(advanceOrder).mockRejectedValue(denied);
    vi.mocked(fetchOrder).mockResolvedValue(null);
    await expect(performOrderAction("o1", accept)).rejects.toMatchObject({ code: "not_found" });
  });

  it("keeps the permission error when the order has not moved", async () => {
    vi.mocked(advanceOrder).mockRejectedValue(denied);
    vi.mocked(fetchOrder).mockResolvedValue(at("Pending"));
    await expect(performOrderAction("o1", accept)).rejects.toBe(denied);
  });

  it("keeps the permission error when the order cannot be read either", async () => {
    vi.mocked(advanceOrder).mockRejectedValue(denied);
    vi.mocked(fetchOrder).mockRejectedValue(new Error("offline"));
    await expect(performOrderAction("o1", accept)).rejects.toBe(denied);
  });

  it("passes other failures straight through without reading the order", async () => {
    const offline = { code: "unavailable" };
    vi.mocked(receiveOrder).mockRejectedValue(offline);
    await expect(performOrderAction("o1", receive)).rejects.toBe(offline);
    expect(fetchOrder).not.toHaveBeenCalled();
  });
});
