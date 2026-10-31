import Box from "@mui/material/Box";
import EmptyState from "../../shared/components/EmptyState";
import Notification from "../../shared/components/Notification";
import { Panel } from "../../shared/components/Panel";
import { space } from "../../shared/theme/tokens";
import PartCountCard from "./PartCountCard";

export default function CountsGrid({ status, loading, error }) {
  if (error) return <Notification kind="error">{error}</Notification>;
  if (loading) {
    return (
      <p className="muted" role="status">
        Loading counts…
      </p>
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
