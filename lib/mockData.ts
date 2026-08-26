export const merchantNavigation = [
  { label: "Dashboard", href: "/dashboard", icon: "grid" },
  { label: "Catalog", href: "/catalog", icon: "box" },
  { label: "AI Growth Agent", href: "/growth-agent", icon: "spark" },
  { label: "Campaigns", href: "/campaigns", icon: "spark" },
  { label: "Audit Trail", href: "/audit", icon: "activity" },
] as const;

export const buyerNavigation = [
  { label: "AI Buyer", href: "/ai-buyer", icon: "orbit" },
  { label: "Checkout", href: "/checkout", icon: "cart" },
] as const;

export const navigation = [
  ...merchantNavigation,
  ...buyerNavigation,
] as const;