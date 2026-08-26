"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
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
import { getActiveCampaignDiscounts, getBestDiscountForProduct, type ProductDiscount } from "@/lib/campaignEffects";

function money(value: number) {
  return `\u20B9${value.toLocaleString("en-IN")}`;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  matches?: BuyerMatch[];
  streaming?: boolean;
}

function ChatBubble({ message, discountMap }: { message: ChatMessage; discountMap: Map<string, ProductDiscount[]> }) {
  const isUser = message.role === "user";
  return (
    <div className={`buyer-chat-row ${isUser ? "buyer-chat-user" : "buyer-chat-agent"}`}>
      <div className={`buyer-chat-avatar ${isUser ? "buyer-avatar-user" : "buyer-avatar-agent"}`}>
        {isUser ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.4V12h-4V9.4C8.8 8.8 8 7.5 8 6a4 4 0 0 1 4-4z"/><path d="M10 14h4"/><path d="M10 18h4"/><path d="M11 22h2"/></svg>
        )}
      </div>
      <div className="buyer-chat-bubble">
        <div className="buyer-chat-meta">
          <span className="buyer-chat-sender">{isUser ? "You" : "AgentCart AI"}</span>
          <time>{message.timestamp.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</time>
        </div>
        <p className="buyer-chat-text">
          {message.content}
          {message.streaming && <span className="buyer-streaming-cursor" />}
        </p>
        {message.matches && message.matches.length > 0 && (
          <div className="buyer-product-results">
            {message.matches.map((match) => {
              const discount = getBestDiscountForProduct(match.product.id, discountMap, match.product.price);
              return (
                <div className="buyer-product-result-card" key={match.product.id}>
                  <div className="buyer-result-visual">
                    <ProductVisual product={match.product} />
                  </div>
                  <div className="buyer-result-info">
                    <strong className="buyer-result-name">{match.product.name}</strong>
                    <div className="buyer-result-pricing">
                      {discount ? (
                        <span className="buyer-price-with-discount">
                          <span className="buyer-original-price">{money(match.product.price)}</span>
                          <span className="buyer-discounted-price">{money(discount.discountedPrice)}</span>
                          <span className="buyer-discount-badge">-{discount.discountPercent}%</span>
                        </span>
                      ) : (
                        <span className="buyer-result-price">{money(match.product.price)}</span>
                      )}
                    </div>
                    <div className="buyer-result-meta">
                      <span className="buyer-stock-badge">{match.product.stock} in stock</span>
                      {discount && <span className="buyer-campaign-badge">{discount.campaignName} — {discount.discountPercent}% off</span>}
                    </div>
                    <small className="buyer-result-reason">{match.reason}</small>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
  discountMap,
}: {
  selected: AgentReadableProduct[];
  quantities: Record<string, number>;
  onQuantity: (id: string, value: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  discountMap: Map<string, ProductDiscount[]>;
}) {
  let subtotal = 0;
  let totalDiscount = 0;
  const lineItems = selected.map((product) => {
    const discount = getBestDiscountForProduct(product.id, discountMap, product.price);
    const effectivePrice = discount ? discount.discountedPrice : product.price;
    const qty = quantities[product.id] ?? 1;
    const lineTotal = effectivePrice * qty;
    const originalLineTotal = product.price * qty;
    subtotal += originalLineTotal;
    if (discount) totalDiscount += originalLineTotal - lineTotal;
    return { product, effectivePrice, qty, lineTotal, discount };
  });
  const finalTotal = subtotal - totalDiscount;

  return (
    <section className="buyer-intent-panel">
      <div className="buyer-intent-header">
        <div className="buyer-intent-title-group">
          <div className="buyer-intent-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          </div>
          <div>
            <p className="buyer-intent-eyebrow">NEXT STEP · NO PAYMENT</p>
            <h2 className="buyer-intent-heading">Purchase Intent <span className="buyer-intent-count">{selected.length}</span></h2>
          </div>
        </div>
        <span className="buyer-intent-status">Draft intent</span>
      </div>
      {selected.length === 0 ? (
        <div className="buyer-intent-empty">
          <div className="buyer-intent-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </div>
          <p className="buyer-intent-empty-text">Tell the AI agent what you want to buy, or select products from the results.</p>
          <div className="buyer-intent-empty-hint">
            <span>✦</span> Products appear here once you add them
          </div>
        </div>
      ) : (
        <>
          <div className="buyer-intent-items">
            {lineItems.map(({ product, effectivePrice, qty, lineTotal, discount }) => (
              <div className="buyer-intent-item" key={product.id}>
                <div className="buyer-intent-item-visual">
                  <ProductVisual product={product} />
                </div>
                <div className="buyer-intent-item-details">
                  <strong className="buyer-intent-item-name">{product.name}</strong>
                  {discount ? (
                    <span className="buyer-price-with-discount">
                      <span className="buyer-original-price">{money(product.price)}</span>
                      <span className="buyer-discounted-price">{money(effectivePrice)}</span>
                      <span className="buyer-discount-badge">-{discount.discountPercent}%</span>
                    </span>
                  ) : (
                    <span className="buyer-intent-item-price">{money(product.price)} each</span>
                  )}
                </div>
                <div className="buyer-quantity-control">
                  <button onClick={() => onQuantity(product.id, qty - 1)} disabled={qty <= 1} aria-label="Decrease quantity">−</button>
                  <span>{qty}</span>
                  <button onClick={() => onQuantity(product.id, qty + 1)} disabled={qty >= product.stock} aria-label="Increase quantity">+</button>
                </div>
                <strong className="buyer-intent-line-total">{money(lineTotal)}</strong>
                <button className="buyer-intent-remove" onClick={() => onRemove(product.id)} aria-label={`Remove ${product.name}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
          {totalDiscount > 0 && (
            <div className="buyer-discount-summary">
              <div className="buyer-discount-summary-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/></svg>
                <span>Campaign Discount</span>
              </div>
              <strong className="buyer-discount-savings">-{money(totalDiscount)}</strong>
            </div>
          )}
          <div className="buyer-intent-total">
            <span>Subtotal</span>
            <strong>{money(finalTotal)}</strong>
          </div>
          <button className="buyer-checkout-btn" onClick={onCheckout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            Proceed to Safe Checkout
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
  const [discountMap, setDiscountMap] = useState<Map<string, ProductDiscount[]>>(new Map());
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [data, discounts] = await Promise.all([loadProducts(), getActiveCampaignDiscounts()]);
      if (mounted) {
        setProducts(data);
        setDiscountMap(discounts);
        setLoading(false);
        setChatMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `Welcome to AgentCart! I'm your AI shopping assistant powered by real AI. I have access to ${data.length} products in the merchant catalog. Tell me what you're looking for — I can help you find the right products, compare options, and prepare a safe purchase.`,
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

  const addProductFromChat = useCallback((product: AgentReadableProduct) => {
    setSelected((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
  }, []);

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

    const assistantId = `assistant-${Date.now()}`;
    const assistantTimestamp = new Date();

    setChatMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: assistantTimestamp,
        streaming: true,
      },
    ]);

    try {
      const [latestProducts, latestDiscounts] = await Promise.all([loadProducts(), getActiveCampaignDiscounts()]);
      const catalog = toAgentCatalog(latestProducts);
      setProducts(latestProducts);
      setDiscountMap(latestDiscounts);

      const chatHistory = chatMessages.map((m) => ({ role: m.role, content: m.content }));
      chatHistory.push({ role: "user", content: text });

      const searchResultPromise = searchBuyerCatalog(catalog.products, text);

      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!chatRes.ok || !chatRes.body) {
        throw new Error("Chat API failed");
      }

      const reader = chatRes.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: fullText } : m
          )
        );
      }

      const searchResult = await searchResultPromise;
      const matches = searchResult.matches.slice(0, 4);

      let finalText = fullText.trim();
      if (!finalText) {
        finalText = searchResult.aiResponse || "I found some products that match your request.";
      }

      if (matches.length > 0 && !finalText.toLowerCase().includes(matches[0].product.name.toLowerCase())) {
        const productNames = matches.map((m) => m.product.name).join(", ");
        finalText += `\n\nI found ${matches.length} product${matches.length === 1 ? "" : "s"} that match: ${productNames}. Check them out below and add them to your cart!`;
      }

      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: finalText, matches, streaming: false }
            : m
        )
      );

      await logAuditEvent({
        actor: "buyer",
        action: "Buyer request processed",
        category: "buyer",
        status: matches.length > 0 ? "success" : "blocked",
        description: `Buyer searched: "${text}" — ${matches.length} matching product${matches.length === 1 ? "" : "s"} found`,
        details: matches.length > 0
          ? `Best match: ${matches[0].product.name} (${money(matches[0].product.price)})`
          : searchResult.budgetExceeded ? "Budget exceeded" : "No matching products",
        amount: matches[0]?.product.price,
        currency: "INR",
      });
    } catch (error) {
      console.error("AI chat error:", error);

      try {
        const [latestProducts, latestDiscounts] = await Promise.all([loadProducts(), getActiveCampaignDiscounts()]);
        const catalog = toAgentCatalog(latestProducts);
        setProducts(latestProducts);
        setDiscountMap(latestDiscounts);

        const result = await searchBuyerCatalog(catalog.products, text);
        const matches = result.matches.slice(0, 4);

        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: result.aiResponse || (matches.length > 0
                    ? `I found ${matches.length} product${matches.length === 1 ? "" : "s"} matching your request.`
                    : `I couldn't find products matching "${text}". Try different keywords or a higher budget.`),
                  matches,
                  streaming: false,
                }
              : m
          )
        );

        await logAuditEvent({
          actor: "buyer",
          action: "Buyer request processed",
          category: "buyer",
          status: matches.length > 0 ? "success" : "blocked",
          description: `Buyer searched: "${text}" — ${matches.length} matching product${matches.length === 1 ? "" : "s"} found`,
          details: matches.length > 0
            ? `Best match: ${result.matches[0].product.name} (${money(result.matches[0].product.price)})`
            : result.budgetExceeded ? "Budget exceeded" : "No matching products",
          amount: result.matches[0]?.product.price,
          currency: "INR",
        });
      } catch (fallbackError) {
        console.error("Fallback search also failed:", fallbackError);
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "I'm having trouble connecting to the AI. Please try again.", streaming: false }
              : m
          )
        );
      }
    } finally {
      setIsSearching(false);
    }
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
    const [latest, latestDiscounts] = await Promise.all([loadProducts(), getActiveCampaignDiscounts()]);
    const latestById = new Map(latest.map((p) => [p.id, p]));
    const items: CheckoutItem[] = selected
      .flatMap((product) => {
        const current = latestById.get(product.id);
        if (!current || current.stock <= 0) return [];
        return [{ productId: current.id, name: current.name, quantity: Math.min(quantities[product.id] ?? 1, current.stock), unitPrice: current.price }];
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

  if (loading) {
    return (
      <div className="buyer-page">
        <div className="buyer-loading">
          <div className="buyer-loading-spinner" />
          <p>Loading catalog from Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-page">
      <header className="buyer-hero">
        <div className="buyer-hero-bg" />
        <div className="buyer-hero-content">
          <div className="buyer-hero-text">
            <div className="buyer-hero-badge">
              <span className="buyer-badge-dot" />
              AI POWERED
            </div>
            <h1 className="buyer-hero-title">AI Buyer</h1>
            <p className="buyer-hero-subtitle">Chat with a real AI agent to discover products and prepare a safe purchase.</p>
          </div>
          <div className="buyer-hero-stats">
            <div className="buyer-stat-card">
              <span className="buyer-stat-value">{products.length}</span>
              <span className="buyer-stat-label">Products</span>
            </div>
            <div className="buyer-stat-card">
              <span className="buyer-stat-value">AI</span>
              <span className="buyer-stat-label">Powered</span>
            </div>
            <div className="buyer-stat-card">
              <span className="buyer-stat-value">Safe</span>
              <span className="buyer-stat-label">Checkout</span>
            </div>
          </div>
        </div>
        <div className="buyer-hero-decoration">
          <div className="buyer-hero-orb buyer-hero-orb-1" />
          <div className="buyer-hero-orb buyer-hero-orb-2" />
          <div className="buyer-hero-orb buyer-hero-orb-3" />
        </div>
      </header>

      <section className="buyer-main-layout">
        <div className="buyer-chat-section">
          <div className="buyer-chat-container">
            <div className="buyer-chat-header">
              <div className="buyer-chat-header-left">
                <div className="buyer-agent-avatar">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.4V12h-4V9.4C8.8 8.8 8 7.5 8 6a4 4 0 0 1 4-4z"/><path d="M10 14h4"/><path d="M10 18h4"/><path d="M11 22h2"/></svg>
                </div>
                <div>
                  <h3 className="buyer-chat-agent-name">AgentCart AI</h3>
                  <span className="buyer-chat-agent-status">
                    <span className="buyer-status-dot" /> {isSearching ? "Thinking..." : "Online — Ready to help"}
                  </span>
                </div>
              </div>
              <span className="buyer-chat-badge">AGENT-TO-MERCHANT COMMERCE</span>
            </div>

            <div className="buyer-chat-feed">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="buyer-chat-message-group">
                  <ChatBubble message={msg} discountMap={discountMap} />
                  {msg.matches && msg.matches.length > 0 && (
                    <div className="buyer-match-actions">
                      {msg.matches.map((match) => (
                        <button
                          key={match.product.id}
                          className={`buyer-match-btn ${selected.some((p) => p.id === match.product.id) ? "buyer-match-btn-active" : ""}`}
                          onClick={() => toggleSelection(match.product)}
                        >
                          {selected.some((p) => p.id === match.product.id) ? (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              In Cart
                            </>
                          ) : (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              Add to Cart
                            </>
                          )}
                          <span className="buyer-match-btn-name"> — {match.product.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isSearching && !chatMessages.some((m) => m.streaming) && (
                <div className="buyer-chat-row buyer-chat-agent">
                  <div className="buyer-chat-avatar buyer-avatar-agent">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.4V12h-4V9.4C8.8 8.8 8 7.5 8 6a4 4 0 0 1 4-4z"/><path d="M10 14h4"/><path d="M10 18h4"/><path d="M11 22h2"/></svg>
                  </div>
                  <div className="buyer-chat-bubble">
                    <div className="buyer-typing">
                      <span className="buyer-typing-dot" />
                      <span className="buyer-typing-dot" />
                      <span className="buyer-typing-dot" />
                      <span className="buyer-typing-text">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="buyer-chat-input-bar">
              <div className="buyer-input-wrapper">
                <svg className="buyer-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Ask me anything about products..."
                  disabled={isSearching}
                  aria-label="Chat message"
                />
              </div>
              <button className="buyer-send-btn" onClick={sendMessage} disabled={isSearching || !input.trim()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>

          <div className="buyer-suggestions">
            <p className="buyer-suggestions-label">Try asking:</p>
            <div className="buyer-suggestions-grid">
              <button className="buyer-suggestion-chip" onClick={() => { setInput("Find me a laptop for programming under ₹75,000"); }}>
                <span className="buyer-suggestion-icon">💻</span>
                <span>Find me a laptop for programming under ₹75,000</span>
              </button>
              <button className="buyer-suggestion-chip" onClick={() => { setInput("What accessories go well with a laptop?"); }}>
                <span className="buyer-suggestion-icon">🖱️</span>
                <span>What accessories go well with a laptop?</span>
              </button>
              <button className="buyer-suggestion-chip" onClick={() => { setInput("Find the cheapest available accessory"); }}>
                <span className="buyer-suggestion-icon">🏷️</span>
                <span>Find the cheapest available accessory</span>
              </button>
              <button className="buyer-suggestion-chip" onClick={() => { setInput("I need a complete workstation setup"); }}>
                <span className="buyer-suggestion-icon">🖥️</span>
                <span>I need a complete workstation setup</span>
              </button>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="buyer-empty">
            <div className="buyer-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </div>
            <h2>Empty Catalog</h2>
            <p>The merchant catalog is currently empty. Add products to your catalog before using the AI Buyer.</p>
            <Link href="/catalog" className="buyer-empty-btn">Go to Catalog ↗</Link>
          </div>
        ) : (
          <PurchaseIntent
            selected={selected}
            quantities={quantities}
            onQuantity={updateQuantity}
            onRemove={removeSelection}
            onCheckout={startCheckout}
            discountMap={discountMap}
          />
        )}
      </section>
    </div>
  );
}
