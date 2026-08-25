"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import { loadProducts } from "@/lib/catalogStorage";
import { toAgentCatalog } from "@/types/agentCatalog";
import { searchBuyerCatalog, type BuyerSearchResult, type BuyerMatch } from "@/lib/buyerEngine";
import { logAuditEvent } from "@/lib/auditLogger";
import type { AgentReadableProduct } from "@/types/agentCatalog";
import { ProductVisual } from "@/components/catalog/ProductCard";
import type { Product } from "@/types/product";
import { useRouter } from "next/navigation";
import { createCheckoutSession, saveCheckoutSession } from "@/lib/checkoutStorage";
import type { CheckoutItem } from "@/types/checkout";

function money(value: number) {
  return `\u20B9${value.toLocaleString("en-IN")}`;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  matches?: BuyerMatch[];
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`chat-row ${isUser ? "user-row" : "agent-row"}`}>
      <span className="chat-avatar">{isUser ? "U" : "A"}</span>
      <div>
        <p>{message.content}</p>
        {message.matches && message.matches.length > 0 && (
          <div className="chat-product-cards">
            {message.matches.map((match) => (
              <div className="chat-product-card" key={match.product.id}>
                <ProductVisual product={match.product} />
                <div>
                  <strong>{match.product.name}</strong>
                  <span>{money(match.product.price)} · {match.product.stock} in stock</span>
                  <small>{match.reason}</small>
                </div>
              </div>
            ))}
          </div>
        )}
        <time>
          {message.timestamp.toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </time>
      </div>
    </div>
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
    (total, p) => total + p.price * (quantities[p.id] ?? 1),
    0
  );

  return (
    <section className="purchase-intent">
      <div className="purchase-heading">
        <div>
          <p className="eyebrow">NEXT STEP · NO PAYMENT</p>
          <h2>Purchase Intent <span>{selected.length}</span></h2>
        </div>
        <span className="intent-status">Draft intent</span>
      </div>
      {selected.length === 0 ? (
        <div className="intent-empty">
          <span>+</span>
          <p>Tell the AI agent what you want to buy, or select products from the results.</p>
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
                  <button onClick={() => onQuantity(product.id, (quantities[product.id] ?? 1) - 1)} disabled={(quantities[product.id] ?? 1) <= 1}>−</button>
                  <span>{quantities[product.id] ?? 1}</span>
                  <button onClick={() => onQuantity(product.id, (quantities[product.id] ?? 1) + 1)} disabled={(quantities[product.id] ?? 1) >= product.stock}>+</button>
                </div>
                <strong className="intent-line-total">{money(product.price * (quantities[product.id] ?? 1))}</strong>
                <button className="intent-remove" onClick={() => onRemove(product.id)}>×</button>
              </div>
            ))}
          </div>
          <div className="intent-total">
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <button className="primary-button checkout-button" onClick={onCheckout}>
            Proceed to Safe Checkout ↗
          </button>
        </>
      )}
    </section>
  );
}

export function BuyerWorkspace() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<AgentReadableProduct[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await loadProducts();
      if (mounted) {
        setProducts(data);
        setLoading(false);
        setChatMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `Welcome to AgentCart! I'm your AI shopping assistant. I have access to ${data.length} products in the merchant catalog. Tell me what you're looking for — I can help you find the right products, compare options, and prepare a purchase.`,
            timestamp: new Date(),
          },
        ]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const liveCatalog = useMemo(() => toAgentCatalog(products), [products]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSearching) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSearching(true);

    const latestProducts = await loadProducts();
    const catalog = toAgentCatalog(latestProducts);
    setProducts(latestProducts);

    const result = await searchBuyerCatalog(catalog.products, text);

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: result.aiResponse || (result.matches.length > 0
        ? `I found ${result.matches.length} product${result.matches.length === 1 ? "" : "s"} matching your request.`
        : `I couldn't find products matching "${text}". Try different keywords or a higher budget.`),
      timestamp: new Date(),
      matches: result.matches.slice(0, 4),
    };
    setChatMessages((prev) => [...prev, assistantMessage]);
    setIsSearching(false);

    await logAuditEvent({
      actor: "buyer",
      action: "Buyer request processed",
      category: "buyer",
      status: result.matches.length > 0 ? "success" : "blocked",
      description: `Buyer searched: "${text}" — ${result.matches.length} matching product${result.matches.length === 1 ? "" : "s"} found`,
      details: result.matches.length > 0
        ? `Best match: ${result.matches[0].product.name} (${money(result.matches[0].product.price)})`
        : result.budgetExceeded ? "Budget exceeded" : "No matching products",
      amount: result.matches[0]?.product.price,
      currency: "INR",
    });
  };

  const toggleSelection = (product: AgentReadableProduct) => {
    setSelected((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) return prev.filter((p) => p.id !== product.id);
      return [...prev, product];
    });
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
  };

  const updateQuantity = (id: string, value: number) => {
    const product = selected.find((p) => p.id === id);
    if (!product) return;
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, Math.min(product.stock, value)),
    }));
  };

  const removeSelection = (id: string) => {
    setSelected((prev) => prev.filter((p) => p.id !== id));
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const startCheckout = async () => {
    const latest = await loadProducts();
    const latestById = new Map(latest.map((p) => [p.id, p]));
    const items: CheckoutItem[] = selected
      .flatMap((product) => {
        const current = latestById.get(product.id);
        return current && current.stock > 0
          ? [{ productId: current.id, name: current.name, quantity: Math.min(quantities[product.id] ?? 1, current.stock), unitPrice: current.price }]
          : [];
      });
    if (!items.length) return;
    const session = await createCheckoutSession(items);
    await saveCheckoutSession(session);
    await logAuditEvent({
      actor: "buyer",
      action: "Checkout session created",
      category: "checkout",
      status: "success",
      description: `Checkout created with ${items.length} item${items.length === 1 ? "" : "s"}`,
      amount: items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
      currency: "INR",
    });
    router.push("/checkout");
  };

  const addProductFromChat = (product: AgentReadableProduct) => {
    setSelected((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));

    setChatMessages((prev) => [
      ...prev,
      {
        id: `system-${Date.now()}`,
        role: "assistant",
        content: `${product.name} has been added to your purchase intent. You can adjust the quantity or add more products, then proceed to checkout when ready.`,
        timestamp: new Date(),
      },
    ]);
  };

  if (loading) {
    return (
      <div className="buyer-page">
        <div className="loading-state"><p>Loading catalog from Supabase...</p></div>
      </div>
    );
  }

  return (
    <div className="buyer-page">
      <header className="buyer-header">
        <div>
          <p className="eyebrow">AI BUYER <span className="eyebrow-slash">/</span> PRODUCT DISCOVERY</p>
          <h1>AI Buyer</h1>
          <p className="header-subtitle">Chat with an AI agent to discover products and prepare a safe purchase.</p>
        </div>
        <span className="agent-commerce-badge"><span>✦</span> AGENT-TO-MERCHANT COMMERCE</span>
      </header>

      <section className="buyer-chat-section">
        <div className="chat-container">
          <div className="chat-feed">
            {chatMessages.map((msg) => (
              <div key={msg.id}>
                <ChatBubble message={msg} />
                {msg.matches && msg.matches.length > 0 && (
                  <div className="chat-match-actions">
                    {msg.matches.map((match) => (
                      <button
                        key={match.product.id}
                        className={`secondary-button ${selected.some((p) => p.id === match.product.id) ? "selected-button" : ""}`}
                        onClick={() => toggleSelection(match.product)}
                      >
                        {selected.some((p) => p.id === match.product.id) ? "✓ In Cart" : "+ Add to Cart"} — {match.product.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isSearching && (
              <div className="chat-row agent-row">
                <span className="chat-avatar">A</span>
                <div><p className="typing-indicator">Searching catalog...</p></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-bar">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Tell me what you're looking for..."
              disabled={isSearching}
              aria-label="Chat message"
            />
            <button className="primary-button" onClick={sendMessage} disabled={isSearching || !input.trim()}>
              Send
            </button>
          </div>
        </div>

        <div className="chat-suggestions">
          <p>Try asking:</p>
          <button onClick={() => { setInput("Find me a laptop for programming under ₹75,000"); }}>Find me a laptop for programming under ₹75,000</button>
          <button onClick={() => { setInput("What accessories go well with a laptop?"); }}>What accessories go well with a laptop?</button>
          <button onClick={() => { setInput("Find the cheapest available accessory"); }}>Find the cheapest available accessory</button>
          <button onClick={() => { setInput("I need a complete workstation setup"); }}>I need a complete workstation setup</button>
        </div>
      </section>

      {products.length === 0 ? (
        <div className="buyer-empty">
          <div>◇</div>
          <h2>The merchant catalog is currently empty.</h2>
          <p>Add products to your catalog before using the AI Buyer.</p>
          <Link href="/catalog" className="primary-button">Go to Catalog ↗</Link>
        </div>
      ) : (
        <PurchaseIntent
          selected={selected}
          quantities={quantities}
          onQuantity={updateQuantity}
          onRemove={removeSelection}
          onCheckout={startCheckout}
        />
      )}
    </div>
  );
}
