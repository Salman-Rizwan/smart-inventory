import { styled } from "@mui/material/styles";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import Notification from "../../shared/components/Notification";
import { Page, PageHead } from "../../shared/components/Page";
import { Muted } from "../../shared/components/text";
import { color, space, text } from "../../shared/theme/tokens";
import { useProducts } from "./hooks";
import PartSettingsPanel from "./PartSettingsPanel";
import StockLogPanel from "./StockLogPanel";

export type ProductsView = "parts" | "log";

const Switch = styled("nav")({ display: "inline-flex", border: `1px solid ${color.borderStrong}`, background: color.canvas });

/** A link styled like a filter segment; the current view (aria-current) is filled teal. */
const ViewLink = styled(Link)({
  display: "inline-flex",
  alignItems: "center",
  minHeight: 36,
  padding: `0 ${space(4)}`,
  color: color.ink,
  fontSize: text.sm,
  textDecoration: "none",
  touchAction: "manipulation",
  "& + &": { borderLeft: `1px solid ${color.borderStrong}` },
  "&:hover": { background: color.surfaceStrong },
  '&[aria-current="page"]': { background: color.accent, color: color.onAccent },
  "@media (pointer: coarse)": { minHeight: 44 },
});

/**
 * The shopkeeper's Products tab, in two views: Parts (each part's cost, selling price and reorder
 * settings) at /products, and the Stock Log (every POS change) at /products/log. A link such as
 * /products?part=spark_plug (from the Insights advice) highlights that part and puts keyboard focus on
 * its Edit button; on the log, ?part= filters it. Switching views keeps the part.
 */
export default function ProductsPage({ view = "parts" }: { view?: ProductsView }) {
  const [params] = useSearchParams();
  const location = useLocation();
  const products = useProducts();
  const partId = params.get("part");
  const known = Boolean(partId) && (products.data ?? []).some((p) => p.id === partId);
  const unknownPart = Boolean(partId) && !products.loading && !products.error && !known;
  const keepPart = partId ? `?part=${encodeURIComponent(partId)}` : "";

  return (
    <Page>
      <PageHead>
        <div>
          <h1 id="products-title" tabIndex={-1}>
            Products
          </h1>
          <Muted>
            Cost, selling price and when to reorder each part, and the log of every change to the POS records. Live shelf counts
            are on the Dashboard and sales figures on Insights.
          </Muted>
        </div>
      </PageHead>
      <Switch aria-label="Products views">
        <ViewLink to={`/products${keepPart}`} aria-current={view === "parts" ? "page" : undefined}>
          Parts
        </ViewLink>
        <ViewLink to={`/products/log${keepPart}`} aria-current={view === "log" ? "page" : undefined}>
          Stock Log
        </ViewLink>
      </Switch>
      {view === "log" ? (
        <StockLogPanel />
      ) : (
        <>
          {unknownPart && <Notification kind="info">That part is not in the stock records. Showing all parts.</Notification>}
          <PartSettingsPanel focusPart={known && partId ? { id: partId, visit: location.key } : null} />
        </>
      )}
    </Page>
  );
}
