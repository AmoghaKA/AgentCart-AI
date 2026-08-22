import type { Product } from "@/types/product";
import type { AgentReadableProduct } from "@/types/agentCatalog";

const visualSymbols: Record<string, string> = { laptop: "▣", mouse: "⌁", backpack: "▰", keyboard: "⌨", monitor: "▤" };

export function ProductVisual({ product, large = false }: { product: Product | AgentReadableProduct; large?: boolean }) {
  const image = "image" in product ? product.image : product.category.toLowerCase().replace(/s$/, "");
  return <div className={`product-visual product-visual-${image} ${large ? "product-visual-large" : ""}`}><span>{visualSymbols[image] ?? "◇"}</span><small>{product.category}</small></div>;
}

export function ProductCard({ product, onView, onEdit, onDelete }: { product: Product; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const inStock = product.stock > 0;
  return <article className="catalog-product-card"><ProductVisual product={product} /><div className="catalog-card-body"><div className="catalog-card-heading"><div><span className="product-category">{product.category}</span><h3>{product.name}</h3></div><span className={`availability-badge ${inStock ? "available" : "unavailable"}`}><i />{inStock ? "In Stock" : "Out of Stock"}</span></div><p className="catalog-description">{product.description}</p><div className="catalog-price-row"><strong>₹{product.price.toLocaleString("en-IN")}</strong><span>{product.stock} units</span></div><div className="card-actions"><button className="card-view-button" onClick={onView}>View details <span>↗</span></button><button className="icon-action" onClick={onEdit} aria-label={`Edit ${product.name}`} title="Edit product">✎</button><button className="icon-action delete-action" onClick={onDelete} aria-label={`Delete ${product.name}`} title="Delete product">⌫</button></div></div></article>;
}