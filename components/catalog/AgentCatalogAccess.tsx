"use client";

import Link from "next/link";
import { useState } from "react";
import { loadProducts } from "@/lib/catalogStorage";
import { toAgentCatalog } from "@/types/agentCatalog";
import { MERCHANT_NAME } from "@/lib/config";

export function AgentCatalogAccess() {
  const [catalogJson, setCatalogJson] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const openCatalog = async () => {
    const products = await loadProducts();
    setCatalogJson(JSON.stringify(toAgentCatalog(products), null, 2));
    setCopied(false);
  };

  const copyCatalog = async () => {
    const products = await loadProducts();
    const current = JSON.stringify(toAgentCatalog(products), null, 2);
    setCatalogJson(current);
    await navigator.clipboard.writeText(current);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="agent-catalog-access">
      <div className="agent-access-copy">
        <div className="agent-access-icon">◇</div>
        <div>
          <p className="eyebrow">AGENTIC COMMERCE</p>
          <h2>AI Buyer Access</h2>
          <p>This merchant catalog is available in a structured format so AI agents can discover products, understand pricing and availability, and prepare a purchase.</p>
        </div>
      </div>
      <div className="agent-format-preview">
        <span className="json-line json-muted">&#123;</span>
        <span className="json-line"><b>&quot;merchant&quot;</b>: &#123; <i>&quot;name&quot;</i>: <em>&quot;{MERCHANT_NAME}&quot;</em>, ... &#125;,</span>
        <span className="json-line"><b>&quot;products&quot;</b>: [ <i>... current catalog products</i> ]</span>
        <span className="json-line json-muted">&#125;</span>
      </div>
      <div className="agent-access-actions">
        <button className="secondary-button" onClick={openCatalog}>View Live Catalog <span>⌕</span></button>
        <button className="secondary-button" onClick={copyCatalog}>{copied ? "Catalog copied" : "Copy Catalog JSON"} <span>{copied ? "✓" : "▣"}</span></button>
        <Link href="/ai-buyer" className="primary-button">Open AI Buyer <span>↗</span></Link>
      </div>
      {catalogJson && (
        <div className="catalog-json-modal" role="dialog" aria-label="Live agent-readable catalog">
          <div className="json-modal-heading">
            <div>
              <p className="eyebrow">LIVE SNAPSHOT</p>
              <h3>Agent-readable catalog</h3>
            </div>
            <button onClick={() => setCatalogJson(null)} aria-label="Close catalog JSON">×</button>
          </div>
          <pre>{catalogJson}</pre>
          <div className="json-modal-footer">
            <span>Generated from the current merchant catalog</span>
            <button className="primary-button" onClick={copyCatalog}>{copied ? "Catalog copied" : "Copy JSON"}</button>
          </div>
        </div>
      )}
    </section>
  );
}
