import Notification from "../../shared/components/Notification";
import { useSnapshot } from "./hooks";

export default function SnapshotPanel({ scannedAt }) {
  const { url, status } = useSnapshot(scannedAt ? scannedAt.getTime() : null);

  return (
    <section className="panel" aria-labelledby="snapshot-title">
      <div className="panel__header">
        <h2 id="snapshot-title">Latest Shelf Image</h2>
      </div>
      <div className="snapshot">
        {status === "ready" && (
          <img
            src={url}
            width="1920"
            height="1080"
            alt="Webcam photo of the shelf from the latest scan, with a labelled box around each detected part."
          />
        )}
        {status === "loading" && (
          <p className="empty-state" role="status">
            Loading image…
          </p>
        )}
        {status === "empty" && (
          <div className="empty-state">
            <strong>No image yet</strong>
            The annotated photo appears here after the first scan.
          </div>
        )}
        {status === "error" && (
          <div className="snapshot__error">
            <Notification kind="error">
              The image could not be loaded. Make sure the backend is running, then refresh the page.
            </Notification>
          </div>
        )}
      </div>
    </section>
  );
}
