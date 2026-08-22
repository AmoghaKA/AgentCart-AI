"use client";

import { useEffect, useMemo, useState } from "react";
import { addProduct, deleteProduct, loadProducts, updateProduct } from "@/lib/catalogStorage";
import type { Product } from "@/types/product";
import { ProductCard } from "@/components/catalog/ProductCard";
import { DeleteProductModal, ProductDetailsModal, ProductFormModal } from "@/components/catalog/ProductModal";

type ModalState = { type: "form" | "details" | "delete"; product?: Product } | null;

export function CatalogWorkspace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [modal, setModal] = useState<ModalState>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setProducts(loadProducts()));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);
  const filteredProducts = useMemo(() => { const query = search.trim().toLowerCase(); return products.filter((product) => { const matchesQuery = !query || [product.name, product.category, product.description].some((value) => value.toLowerCase().includes(query)); return matchesQuery && (category === "all" || product.category === category); }); }, [products, search, category]);
  const inStockCount = products.filter((product) => product.stock > 0).length;
  const clearFilters = () => { setSearch(""); setCategory("all"); };
  const saveForm = (values: { name: string; description: string; category: string; newCategory: string; price: string; stock: string }) => {
    const now = new Date().toISOString();
    const productCategory = values.category === "__new__" ? values.newCategory.trim() : values.category;
    const existing = modal?.product;
    const product: Product = { id: existing?.id ?? `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: values.name.trim(), description: values.description.trim(), category: productCategory, price: Number(values.price), stock: Number(values.stock), image: existing?.image ?? "product", createdAt: existing?.createdAt ?? now, updatedAt: now };
    if (existing) { updateProduct(product); setProducts((current) => current.map((item) => item.id === product.id ? product : item)); } else { addProduct(product); setProducts((current) => [...current, product]); }
    setModal(null);
  };
  const removeProduct = () => { if (!modal?.product) return; deleteProduct(modal.product.id); setProducts((current) => current.filter((product) => product.id !== modal.product?.id)); setModal(null); };
  return <div className="catalog-page"><header className="catalog-header"><div><p className="eyebrow">MERCHANT WORKSPACE <span className="eyebrow-slash">/</span> CATALOG</p><h1>Product Catalog</h1><p className="header-subtitle">Manage your products and prepare your merchant catalog for customers and AI buyers.</p></div><button className="primary-button add-product-button" onClick={() => setModal({ type: "form" })}><span className="plus-icon">+</span> Add Product</button></header><section className="catalog-toolbar"><div className="catalog-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, categories, or descriptions..." aria-label="Search products" />{search && <button onClick={() => setSearch("")} aria-label="Clear search">×</button>}</div><label className="category-filter"><span>Filter by</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All Categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></section><section className="catalog-summary"><div><strong>{products.length}</strong><span>Total Products</span></div><div><strong className="summary-positive">{inStockCount}</strong><span>In Stock</span></div><div><strong className="summary-muted">{products.length - inStockCount}</strong><span>Out of Stock</span></div><span className="catalog-count-label">{filteredProducts.length} of {products.length} shown</span></section>{products.length === 0 ? <div className="catalog-empty"><div className="empty-icon">◇</div><h2>Your catalog is empty.</h2><p>Add products to prepare your merchant for AI-powered commerce.</p><button className="primary-button" onClick={() => setModal({ type: "form" })}><span className="plus-icon">+</span> Add Your First Product</button></div> : filteredProducts.length === 0 ? <div className="catalog-empty search-empty"><div className="empty-icon">⌕</div><h2>No products found.</h2><p>Try adjusting your search or filters.</p><button className="secondary-button" onClick={clearFilters}>Clear Filters</button></div> : <section className="product-grid">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} onView={() => setModal({ type: "details", product })} onEdit={() => setModal({ type: "form", product })} onDelete={() => setModal({ type: "delete", product })} />)}</section>}{modal?.type === "form" && <ProductFormModal key={`form-${modal.product?.id ?? "new"}`} product={modal.product} categories={categories} onClose={() => setModal(null)} onSave={saveForm} />}{modal?.type === "details" && modal.product && <ProductDetailsModal product={modal.product} onClose={() => setModal(null)} onEdit={() => setModal({ type: "form", product: modal.product })} />}{modal?.type === "delete" && modal.product && <DeleteProductModal product={modal.product} onClose={() => setModal(null)} onConfirm={removeProduct} />}</div>;
}