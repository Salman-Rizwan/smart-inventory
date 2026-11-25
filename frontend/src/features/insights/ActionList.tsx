import Box from "@mui/material/Box";
import { Link } from "react-router-dom";
import { Panel, PanelHeader } from "../../shared/components/Panel";
import StatusBadge from "../../shared/components/StatusBadge";
import { Muted } from "../../shared/components/text";
import { color, space, text } from "../../shared/theme/tokens";
import { actionLink } from "./actionLink";
import { MIN_DELIVERIES, MIN_HISTORY_DAYS, type PartInsight } from "./analytics";
import { whatToDoKind, whatToDoLabel, whatToDoText } from "./insightsText";

/**
 * One line per part: the thing to do about it now. It always uses the last 30 days (the caller passes
 * that report), so changing the period shown below never changes the advice.
 */
export default function ActionList({ parts, basisDays }: { parts: PartInsight[]; basisDays: number }) {
  return (
    <Panel id="actions" aria-labelledby="actions-title">
      <PanelHeader>
        <h2 id="actions-title" tabIndex={-1}>
          What To Do
        </h2>
        <Muted>One next step per part, from its shelf count, reorder level and the last {basisDays} days of sales, whichever period is shown below.</Muted>
      </PanelHeader>
      <Box component="ul" aria-label="What to do for each part" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {parts.map((p) => {
          const link = actionLink(p.action, p.part);
          return (
            <Box
              component="li"
              key={p.part}
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                columnGap: space(5),
                rowGap: space(2),
                padding: `${space(3)} ${space(5)}`,
                "& + &": { borderTop: `1px solid ${color.border}` },
              }}
            >
              <Box component="strong" translate="no" sx={{ minWidth: "9rem" }}>
                {p.name}
              </Box>
              <StatusBadge kind={whatToDoKind(p.action)}>{whatToDoLabel(p.action)}</StatusBadge>
              <Box component="span" sx={{ flex: "1 1 16rem", fontSize: text.sm }}>
                {whatToDoText(p.action, MIN_HISTORY_DAYS, MIN_DELIVERIES)}
              </Box>
              {link && (
                <Link to={link.to} aria-label={`${link.label} for ${p.name}`}>
                  {link.label}
                </Link>
              )}
            </Box>
          );
        })}
      </Box>
    </Panel>
  );
}
