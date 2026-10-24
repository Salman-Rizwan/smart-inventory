import { formatInteger } from "../../shared/format";
import { partLabel } from "./parts";

export default function PartCountCard({ part, count }) {
  return (
    <div className="panel count-card">
      <h3 className="count-card__label" translate="no">{partLabel(part)}</h3>
      <p className="count-card__value tabular">
        {formatInteger(count)}
      </p>
      <p className="count-card__unit muted">{count === 1 ? "unit" : "units"} on shelf</p>
    </div>
  );
}
