import { useId, type Ref } from "react";
import Button from "../../shared/components/Button";
import Notification from "../../shared/components/Notification";
import StatusBadge, { type BadgeKind } from "../../shared/components/StatusBadge";
import { Cell, ErrorRow, NumCell, Row, RowHeader } from "../../shared/components/table";
import { VisuallyHidden } from "../../shared/components/text";
import { formatDateTime, formatInteger } from "../../shared/format";
import { color } from "../../shared/theme/tokens";
import { partLabel } from "../dashboard/parts";
import type { Alert, AlertState } from "./types";
import { useAcknowledge } from "./useAcknowledge";

export const ALERT_COLUMNS = 8;

const BADGES: Record<AlertState, BadgeKind> = { Open: "warning", Acknowledged: "neutral", Resolved: "success" };

/** Teal tint and a bar on the left: the row a notification opened. */
const highlighted = {
  "& > *": { background: color.infoBg },
  "& > th": { boxShadow: `inset 4px 0 0 ${color.accent}` },
  "&:focus-visible": { outlineOffset: -2 },
} as const;

interface Props {
  alert: Alert;
  /** This is the alert a notification opened: highlighted, and focusable so focus can move to it. */
  target?: boolean;
  ref?: Ref<HTMLTableRowElement>;
  onAcknowledged?: (message: string) => void;
}

export default function AlertRowItem({ alert, target = false, ref, onAcknowledged }: Props) {
  const errorId = useId();
  const name = partLabel(alert.product);
  const { busy, error, acknowledge } = useAcknowledge(alert.id, name, onAcknowledged);

  return (
    <>
      <Row ref={ref} tabIndex={target ? -1 : undefined} sx={target ? highlighted : undefined}>
        <RowHeader translate="no">
          {name}
          {target && (
            <>
              {" "}
              <VisuallyHidden>(opened from a notification)</VisuallyHidden>
            </>
          )}
        </RowHeader>
        <NumCell>{formatInteger(alert.visualCount)}</NumCell>
        <NumCell>{formatInteger(alert.posCount)}</NumCell>
        <Cell mono>{formatDateTime(alert.createdAt)}</Cell>
        <Cell mono>{formatDateTime(alert.acknowledgedAt)}</Cell>
        <Cell mono>{formatDateTime(alert.resolvedAt)}</Cell>
        <Cell>
          <StatusBadge kind={BADGES[alert.state]}>{alert.state}</StatusBadge>
        </Cell>
        <Cell>
          {alert.state === "Open" && (
            <Button
              variant="secondary"
              size="small"
              onClick={acknowledge}
              loading={busy}
              loadingLabel="Saving…"
              aria-label={`Acknowledge ${name} alert`}
              aria-describedby={error ? errorId : undefined}
            >
              Acknowledge
            </Button>
          )}
        </Cell>
      </Row>
      {error && (
        <ErrorRow id={errorId} colSpan={ALERT_COLUMNS}>
          <Notification kind="error">{error}</Notification>
        </ErrorRow>
      )}
    </>
  );
}
