"use client";

import { useEffect, useMemo, useState } from "react";
import { addProduct, deleteProduct, loadProducts, updateProduct } from "@/lib/catalogStorage";
import { logAuditEvent } from "@/lib/auditLogger";
import type { Product } from "@/types/product";
import { ProductCard } from "@/components/catalog/ProductCard";
import { DeleteProductModal, ProductDetailsModal, ProductFormModal } from "@/components/catalog/ProductModal";

type ModalState = { type: "form" | "details" | "delete"; product?: Product } | null;

export function CatalogWorkspace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await loadProducts();
      if (mounted) {
        setProducts(data);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !query || [product.name, product.category, product.description].some((value) => value.toLowerCase().includes(query));
      return matchesQuery && (category === "all" || product.category === category);
    });
  }, [products, search, category]);
  const inStockCount = products.filter((product) => product.stock > 0).length;

  const saveForm = async (values: { name: string; description: string; category: string; newCategory: string; price: string; stock: string }) => {
    const now = new Date().toISOString();
    const productCategory = values.category === "__new__" ? values.newCategory.trim() : values.category;
    const existing = modal?.product;
    const product: Product = {
      id: existing?.id ?? crypto.randomUUID(),
      name: values.name.trim(),
      description: values.description.trim(),
      category: productCategory,
      price: Number(values.price),
      stock: Number(values.stock),
      image: existing?.image ?? "product",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existing) {
      const result = await updateProduct(product);
      if (result) {
        setProducts((current) => current.map((item) => item.id === product.id ? product : item));
        await logAuditEvent({ actor: "agent", action: "Product updated in catalog", category: "catalog", status: "success", description: `${product.name} (${product.category}) updated — price: ₹${product.price.toLocaleString("en-IN")}, stock: ${product.stock}`, referenceId: product.id, amount: product.price, currency: "INR" });
      } else {
        alert("Failed to update product in Supabase. Check console for details.");
      }
    } else {
      const result = await addProduct(product);
      if (result) {
        setProducts((current) => [...current, result]);
        await logAuditEvent({ actor: "agent", action: "Product added to catalog", category: "catalog", status: "success", description: `${product.name} (${product.category}) added — price: ₹${product.price.toLocaleString("en-IN")}, stock: ${product.stock}`, referenceId: product.id, amount: product.price, currency: "INR" });
      } else {
        alert("Failed to add product to Supabase. Check console for details — you may need to run the SQL migration first.");
      }
    }
    setModal(null);
  };

  const removeProduct = async () => {
    if (!modal?.product) return;
    const removed = modal.product;
    await deleteProduct(removed.id);
    setProducts((current) => current.filter((product) => product.id !== removed.id));
    setModal(null);
    await logAuditEvent({ actor: "agent", action: "Product deleted from catalog", category: "catalog", status: "success", description: `${removed.name} (${removed.category}) deleted from merchant catalog`, referenceId: removed.id, amount: removed.price, currency: "INR" });
  };

  if (loading) {
    return (
      <div className="catalog-page">
        <div className="loading-state">
          <p>Loading catalog from Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="catalog-page">
      <header className="catalog-header">
        <div>
          <p className="eyebrow">MERCHANT WORKSPACE <span className="eyebrow-slash">/</span> CATALOG</p>
          <h1>Product Catalog</h1>
          <p className="header-subtitle">Manage your products and prepare your merchant catalog for customers and AI buyers.</p>
        </div>
        <button className="primary-button add-product-button" onClick={() => setModal({ type: "form" })}><span className="plus-icon">+</span> Add Product</button>
      </header>
      <section className="catalog-toolbar">
        <div className="catalog-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, categories, or descriptions..." aria-label="Search products" />{search && <button onClick={() => setSearch("")} aria-label="Clear search">×</button>}</div>
        <label className="category-filter"><span>Filter by</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All Categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </section>
      <section className="catalog-summary">
        <div><strong>{products.length}</strong><span>Total Products</span></div>
        <div><strong className="summary-positive">{inStockCount}</strong><span>In Stock</span></div>
        <div><strong className="summary-muted">{products.length - inStockCount}</strong><span>Out of Stock</span></div>
        <span className="catalog-count-label">{filteredProducts.length} of {products.length} shown</span>
      </section>
      {filteredProducts.length === 0 ? (
        products.length === 0 ? (
          <div className="catalog-empty">
            <div className="empty-icon">◇</div>
            <h2>Your catalog is empty.</h2>
            <p>Add products to prepare your merchant for AI-powered commerce.</p>
            <button className="primary-button" onClick={() => setModal({ type: "form" })}><span className="plus-icon">+</span> Add Your First Product</button>
          </div>
        ) : (
          <div className="catalog-empty search-empty">
            <div className="empty-icon">⌕</div>
            <h2>No products found.</h2>
            <p>Try adjusting your search or filter criteria.</p>
            <button className="secondary-button" onClick={() => { setSearch(""); setCategory("all"); }}>Clear Filters</button>
          </div>
        )
      ) : (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onView={() => setModal({ type: "details", product })} onEdit={() => setModal({ type: "form", product })} onDelete={() => setModal({ type: "delete", product })} />
          ))}
        </div>
      )}
      {modal?.type === "form" && <ProductFormModal product={modal.product} categories={categories} onClose={() => setModal(null)} onSave={saveForm} />}
      {modal?.type === "details" && modal.product && <ProductDetailsModal product={modal.product} onClose={() => setModal(null)} onEdit={() => { setModal({ type: "form", product: modal.product }); }} />}
      {modal?.type === "delete" && modal.product && <DeleteProductModal product={modal.product} onClose={() => setModal(null)} onConfirm={removeProduct} />}
    </div>
  );
}
