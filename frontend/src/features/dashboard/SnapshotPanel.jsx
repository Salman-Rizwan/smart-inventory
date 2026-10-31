import Box from "@mui/material/Box";
import EmptyState from "../../shared/components/EmptyState";
import Notification from "../../shared/components/Notification";
import { Panel, PanelHeader } from "../../shared/components/Panel";
import { color, space } from "../../shared/theme/tokens";
import { useSnapshot } from "./hooks";

export default function SnapshotPanel({ scannedAt }) {
  const { url, status } = useSnapshot(scannedAt ? scannedAt.getTime() : null);

  return (
    <Panel aria-labelledby="snapshot-title">
      <PanelHeader>
        <h2 id="snapshot-title">Latest Shelf Image</h2>
      </PanelHeader>
      <Box sx={{ background: color.surface, "& img": { display: "block", width: "100%", height: "auto" } }}>
        {status === "ready" && (
          <img
            src={url}
            width="1920"
            height="1080"
            alt="Webcam photo of the shelf from the latest scan, with a labelled box around each detected part."
          />
        )}
        {status === "loading" && (
          <EmptyState component="p" role="status">
            Loading image…
          </EmptyState>
        )}
        {status === "empty" && (
          <EmptyState title="No image yet">The annotated photo appears here after the first scan.</EmptyState>
        )}
        {status === "error" && (
          <Box sx={{ padding: space(5) }}>
            <Notification kind="error">
              The image could not be loaded. Make sure the backend is running, then refresh the page.
            </Notification>
          </Box>
        )}
      </Box>
    </Panel>
  );
}
