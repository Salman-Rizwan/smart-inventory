import { useLocation, useSearchParams } from "react-router-dom";
import Notification from "../../shared/components/Notification";
import { Page, PageHead } from "../../shared/components/Page";
import { Muted } from "../../shared/components/text";
import { useProducts } from "./hooks";
import PartSettingsPanel from "./PartSettingsPanel";

/**
 * The shopkeeper's product list: each part's cost, selling price and reorder settings. Stock counts
 * and sales stay on the Dashboard and Insights. A link such as /products?part=spark_plug (from the
 * Insights advice) highlights that part and puts keyboard focus on its Edit button.
 */
export default function ProductsPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const products = useProducts();
  const partId = params.get("part");
  const known = Boolean(partId) && (products.data ?? []).some((p) => p.id === partId);
  const unknownPart = Boolean(partId) && !products.loading && !products.error && !known;

  return (
    <Page>
      <PageHead>
        <div>
          <h1 id="products-title" tabIndex={-1}>
            Products
          </h1>
          <Muted>Cost, selling price and when to reorder each part. Stock counts and sales are on the Dashboard and Insights.</Muted>
        </div>
      </PageHead>
      {unknownPart && <Notification kind="info">That part is not in the stock records. Showing all parts.</Notification>}
      <PartSettingsPanel focusPart={known && partId ? { id: partId, visit: location.key } : null} />
    </Page>
  );
}
