import { styled } from "@mui/material/styles";
import { formatInteger } from "../../shared/format";
import { color, font, space, text } from "../../shared/theme/tokens";
import { attentionState, ORDER_STATES } from "./orderWorkflow";
import type { OrderRole, OrderState } from "./types";

const HINTS: Record<OrderRole, Record<OrderState, string>> = {
  dealer: {
    Pending: "Needs your action",
    Accepted: "Being prepared",
    Dispatched: "On the way to the shop",
    Received: "Delivered",
  },
  shopkeeper: {
    Pending: "Waiting for the dealer",
    Accepted: "The dealer is preparing it",
    Dispatched: "On the way: confirm when it arrives",
    Received: "Delivered",
  },
};

const Tiles = styled("dl")({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: space(4),
  margin: 0,
});

/** A tile: teal top bar, amber when it holds orders waiting for this role. */
const Tile = styled("div", { shouldForwardProp: (prop) => prop !== "attention" })<{ attention: boolean }>(({ attention }) => ({
  margin: 0,
  padding: `${space(4)} ${space(5)}`,
  background: color.canvas,
  border: `1px solid ${color.border}`,
  borderTop: `4px solid ${attention ? color.warning : color.accent}`,
  "& dt": { fontSize: text.sm, fontWeight: 600 },
}));

const Value = styled("dd")({ margin: `${space(1)} 0`, fontFamily: font.mono, fontSize: "2rem", lineHeight: 1.2 });
const Hint = styled("dd")({ margin: 0, fontSize: text.sm, color: color.inkMuted });

/** One tile per order state: the number of tiles never grows with the number of orders. */
export default function OrderSummaryTiles({ counts, role }: { counts: Record<OrderState, number>; role: OrderRole }) {
  const attention = attentionState(role);
  return (
    <Tiles>
      {ORDER_STATES.map((state) => (
        <Tile key={state} attention={state === attention && counts[state] > 0}>
          <dt>{state}</dt>
          <Value>{formatInteger(counts[state])}</Value>
          <Hint>{HINTS[role][state]}</Hint>
        </Tile>
      ))}
    </Tiles>
  );
}
