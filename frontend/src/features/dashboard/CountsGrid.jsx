import Notification from "../../shared/components/Notification";
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
      <div className="panel empty-state">
        <strong>No counts yet</strong>
        Press Scan Now to take the first scan.
      </div>
    );
  }
  return (
    <div className="count-grid">
      {parts.map(([part, count]) => (
        <PartCountCard key={part} part={part} count={count} />
      ))}
    </div>
  );
}
