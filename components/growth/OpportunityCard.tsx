import type { GrowthOpportunity } from "@/types/growth";
import { ProductVisual } from "@/components/catalog/ProductCard";

function money(value: number) { return `₹${value.toLocaleString("en-IN")}`; }

const TYPE_META: Record<string, { label: string; color: string }> = {
  bundle: { label: "Bundle", color: "opp-type-bundle" },
  Cross: { label: "Cross-sell", color: "opp-type-cross" },
  Upsell: { label: "Upsell", color: "opp-type-upsell" },
};

export function OpportunityCard({ opportunity }: { opportunity: GrowthOpportunity }) {
  const totalAddOn = opportunity.recommendedProducts.reduce((s, p) => s + p.price, 0);
  const revenueLift = opportunity.originalOrderValue > 0
    ? Math.round((opportunity.additionalRevenue / opportunity.originalOrderValue) * 100)
    : 0;
  const type = TYPE_META[opportunity.recommendationType] || { label: opportunity.recommendationType, color: "" };

  return (
    <article className="growth-opportunity-card">
      <div className="growth-card-top">
        <div className="growth-product-heading">
          <ProductVisual product={opportunity.mainProduct} />
          <div>
            <span className="product-category">{opportunity.mainProduct.category}</span>
            <h2>{opportunity.mainProduct.name}</h2>
          </div>
        </div>
        <div className="growth-card-badges">
          <span className={`opp-type-badge ${type.color}`}>{type.label}</span>
          <div className="confidence-pill">
            <span>✦</span> {opportunity.confidence}
          </div>
        </div>
      </div>

      <div className="growth-card-content">
        <div className="recommendation-column">
          <p className="eyebrow">BETTER TOGETHER</p>
          <p className="growth-reason">{opportunity.reason}</p>
          <div className="growth-bundle-list">
            {opportunity.recommendedProducts.map((product) => (
              <div className="growth-recommendation" key={product.id}>
                <ProductVisual product={product} />
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.category}</span>
                </div>
                <b>{money(product.price)}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="revenue-impact">
          <p className="eyebrow">ORDER VALUE</p>
          <div className="impact-line">
            <span>Current order</span>
            <strong>{money(opportunity.originalOrderValue)}</strong>
          </div>
          <div className="impact-line impact-positive">
            <span>Add-on value</span>
            <strong>+{money(totalAddOn)}</strong>
          </div>
          <div className="impact-total">
            <span>Complete order</span>
            <strong>{money(opportunity.potentialOrderValue)}</strong>
          </div>
          {revenueLift > 0 && (
            <div className="impact-lift">
              <span>Revenue lift</span>
              <strong>+{revenueLift}%</strong>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
