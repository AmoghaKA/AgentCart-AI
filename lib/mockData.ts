export const metrics = [
  { label: "Total Revenue", value: "₹1,25,000", detail: "Total merchant revenue", tone: "neutral" },
  { label: "AI-Influenced Revenue", value: "₹18,500", detail: "Revenue from AI recommendations", tone: "positive", change: "+14.8%" },
  { label: "Potential Upsell Revenue", value: "₹12,000", detail: "Revenue opportunities identified", tone: "amber" },
  { label: "Total Orders", value: "24", detail: "Completed orders", tone: "neutral" },
] as const;

export const activity = [
  { title: "Revenue opportunity identified", detail: "AI Growth Agent found a cross-sell opportunity for CodePro Laptop.", status: "Success", time: "2 minutes ago", icon: "↗" },
  { title: "Catalog analyzed", detail: "5 products analyzed for complementary product relationships.", status: "Success", time: "8 minutes ago", icon: "⌁" },
  { title: "Recommendation prepared", detail: "Wireless Mouse and Laptop Backpack identified as relevant recommendations.", status: "Ready", time: "15 minutes ago", icon: "✦" },
  { title: "No money actions performed", detail: "The AI has only analyzed products and made recommendations.", status: "Safe", time: "24 minutes ago", icon: "✓" },
] as const;

export const navigation = [
  { label: "Dashboard", href: "/", icon: "grid" },
  { label: "Catalog", href: "/catalog", icon: "box" },
  { label: "AI Growth Agent", href: "/growth-agent", icon: "spark" },
  { label: "AI Buyer", href: "/ai-buyer", icon: "orbit" },
  { label: "Audit Trail", href: "/audit", icon: "activity" },
] as const;