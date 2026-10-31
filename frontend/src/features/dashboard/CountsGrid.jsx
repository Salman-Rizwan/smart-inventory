import Box from "@mui/material/Box";
import EmptyState from "../../shared/components/EmptyState";
import Notification from "../../shared/components/Notification";
import { Panel } from "../../shared/components/Panel";
import { space } from "../../shared/theme/tokens";
import PartCountCard from "./PartCountCard";
import { Muted } from "../../shared/components/text";

export default function CountsGrid({ status, loading, error }) {
  if (error) return <Notification kind="error">{error}</Notification>;
  if (loading) {
    return (
      <Muted role="status">Loading counts…</Muted>
    );
  }
  const parts = status ? Object.entries(status.counts) : [];
  if (parts.length === 0) {
    return (
      <Panel component="div">
        <EmptyState title="No counts yet">Press Scan Now to take the first scan.</EmptyState>
      </Panel>
    );
  }
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: space(4) }}>
      {parts.map(([part, count]) => (
        <PartCountCard key={part} part={part} count={count} />
      ))}
    </Box>
  );
}
