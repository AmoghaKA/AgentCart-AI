"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadProducts } from "@/lib/catalogStorage";
import { toAgentCatalog } from "@/types/agentCatalog";
import {
  parseBuyerIntent,
  searchBuyerCatalog,
  type BuyerMatch,
  type BuyerSearchResult,
} from "@/lib/buyerEngine";
import { logAuditEvent } from "@/lib/auditLogger";
import type { AgentReadableProduct } from "@/types/agentCatalog";
import { ProductVisual } from "@/components/catalog/ProductCard";
import type { Product } from "@/types/product";
import { useRouter } from "next/navigation";
import {
  createCheckoutSession,
  saveCheckoutSession,
} from "@/lib/checkoutStorage";
import type { CheckoutItem } from "@/types/checkout";

function money(value: number) {
  return `\u20B9${value.toLocaleString("en-IN")}`;
}

function ResultCard({
  match,
  selected,
  onSelect,
}: {
  match: BuyerMatch;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={`buyer-result-card ${selected ? "result-selected" : ""}`}
    >
      <div className="buyer-result-head">
        <ProductVisual product={match.product} />
        <div>
          <span className="product-category">{match.product.category}</span>
          <h3>{match.product.name}</h3>
        </div>
        <span className="buyer-match-pill">Match</span>
      </div>
      <p>{match.product.description}</p>
      <div className="buyer-result-meta">
        <strong>{money(match.product.price)}</strong>
        <span>{match.product.stock} available</span>
      </div>
      <div className="buyer-result-reason">
        <span>{"\u2713"}</span>
        {match.reason}
      </div>
      <button
        className={selected ? "selected-button" : "secondary-button"}
        onClick={onSelect}
      >
        {selected ? "Selected" : "Select Product"}{" "}
        <span>{selected ? "\u2713" : "+"}</span>
      </button>
    </article>
  );
}

function PurchaseIntent({
  selected,
  quantities,
  onQuantity,
  onRemove,
  onCheckout,
}: {
  selected: AgentReadableProduct[];
  quantities: Record<string, number>;
  onQuantity: (id: string, value: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}) {
  const subtotal = selected.reduce(
    (total, product) =>
      total + product.price * (quantities[product.id] ?? 1),
    0
  );

  return (
    <section className="purchase-intent">
      <div className="purchase-heading">
        <div>
          <p className="eyebrow">NEXT STEP {"\u00B7"} NO PAYMENT</p>
          <h2>
            Purchase Intent <span>{selected.length}</span>
          </h2>
        </div>
        <span className="intent-status">Draft intent</span>
      </div>

      {selected.length === 0 ? (
        <div className="intent-empty">
          <span>{"\uFF0B"}</span>
          <p>
            Select products from the results above to prepare a purchase
            intent.
          </p>
        </div>
      ) : (
        <>
          <div className="intent-items">
            {selected.map((product) => (
              <div className="intent-item" key={product.id}>
                <div className="intent-item-name">
                  <ProductVisual product={product} />
                  <div>
                    <strong>{product.name}</strong>
                    <span>{money(product.price)} each</span>
                  </div>
                </div>
                <div className="quantity-control">
                  <button
                    onClick={() =>
                      onQuantity(
                        product.id,
                        (quantities[product.id] ?? 1) - 1
                      )
                    }
                    disabled={(quantities[product.id] ?? 1) <= 1}
                    aria-label={`Decrease ${product.name} quantity`}
                  >
                    {"\u2212"}
                  </button>
                  <span>{quantities[product.id] ?? 1}</span>
                  <button
                    onClick={() =>
                      onQuantity(
                        product.id,
                        (quantities[product.id] ?? 1) + 1
                      )
                    }
                    disabled={
                      (quantities[product.id] ?? 1) >= product.stock
                    }
                    aria-label={`Increase ${product.name} quantity`}
                  >
                    +
                  </button>
                </div>
                <strong className="intent-line-total">
                  {money(product.price * (quantities[product.id] ?? 1))}
                </strong>
                <button
                  className="intent-remove"
                  onClick={() => onRemove(product.id)}
                  aria-label={`Remove ${product.name}`}
                >
                  {"\u00D7"}
                </button>
              </div>
            ))}
          </div>
          <div className="intent-total">
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <button
            className="primary-button checkout-button"
            onClick={onCheckout}
          >
            Proceed to Safe Checkout <span>{"\u2197"}</span>
          </button>
        </>
      )}
    </section>
  );
}

export function BuyerWorkspace() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [request, setRequest] = useState(
    "Find me a laptop setup for programming under \u20B975,000"
  );
  const [result, setResult] = useState<BuyerSearchResult | null>(null);
  const [selected, setSelected] = useState<AgentReadableProduct[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const frame = window.requestAnimationFrame(() =>
      setProducts(loadProducts())
    );
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const liveCatalog = useMemo(() => toAgentCatalog(products), [products]);

  const findProducts = () => {
    const latest = loadProducts();
    const catalog = toAgentCatalog(latest);
    const nextResult = searchBuyerCatalog(catalog.products, request);
    setProducts(latest);
    setResult(nextResult);

    const intent = parseBuyerIntent(request);
    logAuditEvent({
      actor: "buyer",
      action: "Buyer request processed",
      category: "buyer",
      status: nextResult.matches.length > 0 ? "success" : "blocked",
      description: `Buyer searched: "${request}" \u2014 ${nextResult.matches.length} matching product${nextResult.matches.length === 1 ? "" : "s"} found`,
      details:
        nextResult.matches.length > 0
          ? `Best match: ${nextResult.matches[0].product.name} (\u20B9${nextResult.matches[0].product.price.toLocaleString("en-IN")})`
          : nextResult.budgetExceeded
            ? "Budget exceeded \u2014 no products fit the requested budget"
            : "No matching products found in catalog",
      amount: nextResult.matches[0]?.product.price,
      currency: "INR",
    });
  };

  const toggleSelection = (product: AgentReadableProduct) => {
    if (selected.some((item) => item.id === product.id)) {
      setSelected((current) =>
        current.filter((item) => item.id !== product.id)
      );
    } else {
      setSelected((current) => [...current, product]);
      setQuantities((current) => ({ ...current, [product.id]: 1 }));
    }
  };

  const updateQuantity = (id: string, value: number) => {
    const product = selected.find((item) => item.id === id);
    if (!product) return;
    setQuantities((current) => ({
      ...current,
      [id]: Math.max(1, Math.min(product.stock, value)),
    }));
  };

  const removeSelection = (id: string) => {
    setSelected((current) => current.filter((item) => item.id !== id));
    setQuantities((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const startCheckout = () => {
    const latest = loadProducts();
    const latestById = new Map(latest.map((p) => [p.id, p]));
    const items: CheckoutItem[] = selected
      .flatMap((product) => {
        const current = latestById.get(product.id);
        return current && current.stock > 0
          ? [
              {
                productId: current.id,
                name: current.name,
                quantity: Math.min(
                  quantities[product.id] ?? 1,
                  current.stock
                ),
                unitPrice: current.price,
              },
            ]
          : [];
      });
    if (!items.length) return;
    saveCheckoutSession(createCheckoutSession(items));
    logAuditEvent({
      actor: "buyer",
      action: "Checkout session created",
      category: "checkout",
      status: "success",
      description: `Checkout created with ${items.length} item${items.length === 1 ? "" : "s"} \u2014 subtotal: \u20B9${items
        .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
        .toLocaleString("en-IN")}`,
      amount: items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      ),
      currency: "INR",
    });
    router.push("/checkout");
  };

  return (
    <div className="buyer-page">
      <header className="buyer-header">
        <div>
          <p className="eyebrow">
            AI BUYER <span className="eyebrow-slash">/</span> PRODUCT DISCOVERY
          </p>
          <h1>AI Buyer</h1>
          <p className="header-subtitle">
            Discover products from AI-ready merchants and prepare a safe
            purchase.
          </p>
        </div>
        <span className="agent-commerce-badge">
          <span>{"\u2726"}</span> AGENT-TO-MERCHANT COMMERCE
        </span>
      </header>

      <section className="buyer-request-card">
        <div className="request-card-label">
          <span className="request-icon">{"\u2301"}</span>
          <div>
            <p className="eyebrow">BUYER REQUEST</p>
            <h2>What are you looking for?</h2>
          </div>
        </div>
        <div className="request-form">
          <input
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") findProducts();
            }}
            placeholder="Find me a laptop for programming under \u20B975,000"
            aria-label="Buyer request"
          />
          <button className="primary-button" onClick={findProducts}>
            Find Products <span>{"\u2197"}</span>
          </button>
        </div>
        <p className="request-hint">
          Try: &quot;Find accessories under {"\u20B9"}5000&quot; or
          &quot;Find the cheapest available accessory&quot;
        </p>
      </section>

      {products.length === 0 ? (
        <div className="buyer-empty">
          <div>{"\u25C7"}</div>
          <h2>The merchant catalog is currently empty.</h2>
          <p>
            Add products to your catalog before using the AI Buyer.
          </p>
          <Link href="/catalog" className="primary-button">
            Go to Catalog <span>{"\u2197"}</span>
          </Link>
        </div>
      ) : (
        result && (
          <>
            {result.matches.length === 0 && (
              <div className="buyer-empty">
                <div>{"\u25C7"}</div>
                <h2>No matching products found</h2>
                <p>
                  {result.budgetExceeded
                    ? `No available products fit the requested budget. Try increasing your budget.`
                    : `The buyer agent could not find a suitable product for "${request}". Try a different search.`}
                </p>
              </div>
            )}

            {result.matches.length > 0 && (
              <section className="buyer-results-section">
                <div className="buyer-section-heading">
                  <div>
                    <p className="eyebrow">LIVE CATALOG MATCHES</p>
                    <h2>
                      Matching Products{" "}
                      <span>{result.matches.length}</span>
                    </h2>
                  </div>
                  <span>
                    {liveCatalog.products.length} products in merchant
                    catalog
                  </span>
                </div>
                <div className="buyer-results-grid">
                  {result.matches.map((match) => (
                    <ResultCard
                      key={match.product.id}
                      match={match}
                      selected={selected.some(
                        (item) => item.id === match.product.id
                      )}
                      onSelect={() => toggleSelection(match.product)}
                    />
                  ))}
                </div>
              </section>
            )}

            <PurchaseIntent
              selected={selected}
              quantities={quantities}
              onQuantity={updateQuantity}
              onRemove={removeSelection}
              onCheckout={startCheckout}
            />
          </>
        )
      )}

      {!result && products.length > 0 && (
        <div className="buyer-empty">
          <div>{"\u2726"}</div>
          <h2>Search the merchant catalog</h2>
          <p>
            Enter a buyer request above and click &quot;Find Products&quot;
            to see matching results.
          </p>
        </div>
      )}
    </div>
  );
}
