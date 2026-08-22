import { useState } from "react";
import type { Product } from "@/types/product";
import { ProductVisual } from "@/components/catalog/ProductCard";

type FormValues = { name: string; description: string; category: string; newCategory: string; price: string; stock: string };
type FormErrors = Partial<Record<keyof FormValues, string>>;

const blankForm: FormValues = { name: "", description: "", category: "", newCategory: "", price: "", stock: "" };

function formFromProduct(product?: Product): FormValues {
  return product ? { name: product.name, description: product.description, category: product.category, newCategory: "", price: String(product.price), stock: String(product.stock) } : blankForm;
}

function ModalFrame({ children, onClose, title, eyebrow }: { children: React.ReactNode; onClose: () => void; title: string; eyebrow: string }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="catalog-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><p className="eyebrow">{eyebrow}</p><h2 id="modal-title">{title}</h2></div><button className="modal-close" onClick={onClose} aria-label="Close modal">×</button></div>{children}</div></div>;
}

export function ProductFormModal({ product, categories, onClose, onSave }: { product?: Product; categories: string[]; onClose: () => void; onSave: (values: FormValues) => void }) {
  const [values, setValues] = useState(() => formFromProduct(product));
  const [errors, setErrors] = useState<FormErrors>({});
  const isEditing = Boolean(product);
  const update = (field: keyof FormValues, value: string) => { setValues((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: undefined })); };
  const validate = () => {
    const next: FormErrors = {};
    if (!values.name.trim()) next.name = "Product name is required.";
    if (!values.description.trim()) next.description = "Description is required.";
    if ((!values.category || values.category === "__new__") && !values.newCategory.trim()) next.category = "Choose or enter a category.";
    const price = Number(values.price);
    if (!values.price || !Number.isFinite(price) || price <= 0) next.price = "Enter a price greater than 0.";
    if (!values.stock || !/^\d+$/.test(values.stock) || Number(values.stock) < 0) next.stock = "Enter a whole number of 0 or more.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  return <ModalFrame onClose={onClose} title={isEditing ? "Edit product" : "Add product"} eyebrow={isEditing ? "CATALOG UPDATE" : "NEW CATALOG ITEM"}><form className="product-form" onSubmit={(event) => { event.preventDefault(); if (validate()) onSave(values); }}><label>Product name<input value={values.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. CodePro Laptop" />{errors.name && <span className="form-error">{errors.name}</span>}</label><label>Description<textarea value={values.description} onChange={(event) => update("description", event.target.value)} placeholder="What makes this product useful?" rows={3} />{errors.description && <span className="form-error">{errors.description}</span>}</label><div className="form-two-column"><label>Category<select value={values.category} onChange={(event) => { update("category", event.target.value); if (event.target.value !== "__new__") update("newCategory", ""); }}><option value="">Select a category</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}<option value="__new__">+ Enter new category</option></select>{(values.category === "__new__" || values.newCategory) && <input className="new-category-input" value={values.newCategory} onChange={(event) => update("newCategory", event.target.value)} placeholder="New category name" />}{errors.category && <span className="form-error">{errors.category}</span>}</label><label>Price <span className="label-hint">INR</span><input type="number" min="1" step="1" value={values.price} onChange={(event) => update("price", event.target.value)} placeholder="65000" />{errors.price && <span className="form-error">{errors.price}</span>}</label></div><label>Stock <span className="label-hint">UNITS AVAILABLE</span><input type="number" min="0" step="1" value={values.stock} onChange={(event) => update("stock", event.target.value)} placeholder="10" />{errors.stock && <span className="form-error">{errors.stock}</span>}</label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">{isEditing ? "Save changes" : "Add product"} <span>↗</span></button></div></form></ModalFrame>;
}

export function ProductDetailsModal({ product, onClose, onEdit }: { product: Product; onClose: () => void; onEdit: () => void }) {
  const formatDate = (date: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
  return <ModalFrame onClose={onClose} title="Product details" eyebrow="CATALOG ITEM"><div className="product-detail-modal"><ProductVisual product={product} large /><div className="detail-summary"><span className="product-category">{product.category}</span><h3>{product.name}</h3><p>{product.description}</p><div className="detail-stats"><div><span>Price</span><strong>₹{product.price.toLocaleString("en-IN")}</strong></div><div><span>Stock</span><strong>{product.stock} units</strong></div><div><span>Availability</span><strong className={product.stock > 0 ? "detail-positive" : "detail-negative"}>{product.stock > 0 ? "In Stock" : "Out of Stock"}</strong></div></div></div><div className="date-details"><span>Created {formatDate(product.createdAt)}</span><span>Last updated {formatDate(product.updatedAt)}</span></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Close</button><button className="primary-button" onClick={onEdit}>Edit product <span>✎</span></button></div></div></ModalFrame>;
}

export function DeleteProductModal({ product, onClose, onConfirm }: { product: Product; onClose: () => void; onConfirm: () => void }) {
  return <ModalFrame onClose={onClose} title="Remove product?" eyebrow="DESTRUCTIVE ACTION"><div className="delete-modal"><div className="delete-symbol">!</div><p>You are about to remove <strong>{product.name}</strong> from your catalog.</p><span>This action cannot be undone. The product will no longer be available to future AI commerce workflows.</span></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Keep product</button><button className="danger-button" onClick={onConfirm}>Remove product</button></div></ModalFrame>;
}