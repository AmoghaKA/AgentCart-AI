"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { merchantNavigation, buyerNavigation } from "@/lib/mockData";
import { getCurrentUser, signOut } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";

function NavIcon({ name }: { name: string }) {
  const common = "h-[17px] w-[17px]";
  if (name === "grid")
    return (
      <svg className={common} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="5" height="5" rx="1" />
        <rect x="12" y="3" width="5" height="5" rx="1" />
        <rect x="3" y="12" width="5" height="5" rx="1" />
        <rect x="12" y="12" width="5" height="5" rx="1" />
      </svg>
    );
  if (name === "box")
    return (
      <svg className={common} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="m10 2.8 6.3 3.5v7.4L10 17.2l-6.3-3.5V6.3L10 2.8Z" />
        <path d="m3.9 6.5 6.1 3.4 6.1-3.4M10 9.9v7" />
      </svg>
    );
  if (name === "spark")
    return (
      <svg className={common} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="m10 2 1.4 5.8L17 10l-5.6 2.2L10 18l-1.4-5.8L3 10l5.6-2.2L10 2Z" />
        <path d="m16 2 .5 1.5L18 4l-1.5.5L16 6l-.5-1.5L14 4l1.5-.5L16 2Z" />
      </svg>
    );
  if (name === "orbit")
    return (
      <svg className={common} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="10" cy="10" r="2.2" />
        <path d="M3.2 10c0-3.8 3-6.2 6.8-6.2s6.8 2.4 6.8 6.2-3 6.2-6.8 6.2S3.2 13.8 3.2 10Z" />
        <path d="M5.2 4.6c3.3-1.9 7 .1 8.9 3.4s1.1 6.2-2.2 7.4-7-.1-8.9-3.4-.9-5.5 2.2-7.4Z" />
      </svg>
    );
  if (name === "cart")
    return (
      <svg className={common} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 6h12l-1.5 7H7.5L6 6Z" />
        <path d="M6 6L5 2H2" />
        <circle cx="8.5" cy="17" r="1.5" />
        <circle cx="15.5" cy="17" r="1.5" />
      </svg>
    );
  return (
    <svg className={common} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 14.8V17h2.2l9.7-9.7-2.2-2.2L3 14.8Z" />
      <path d="m11.5 6.5 2.2 2.2M12.7 3.4 16.6 7.3" />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    (async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase
          .from("merchants")
          .select("name")
          .eq("user_id", currentUser.id)
          .single();
        if (data) setStoreName(data.name);
      }
    })();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const userInitial = storeName
    ? storeName.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <aside className="sidebar-shell">
      <div className="brand-lockup">
        <div className="brand-mark">
          A<span>·</span>
        </div>
        <div>
          <p className="brand-name">
            AgentCart <em>AI</em>
          </p>
          <p className="brand-caption">Revenue intelligence</p>
        </div>
      </div>

      <div className="sidebar-section-label">MERCHANT</div>
      <nav className="nav-list" aria-label="Merchant navigation">
        {merchantNavigation.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${active ? "is-active" : ""}`}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
              {item.label === "AI Growth Agent" && (
                <span className="nav-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-section-label" style={{ marginTop: 16 }}>
        AI BUYER
      </div>
      <nav className="nav-list" aria-label="Buyer navigation">
        {buyerNavigation.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${active ? "is-active" : ""}`}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <Link href="/settings" className="merchant-console-footer">
          <div className="merchant-console-avatar">{userInitial}</div>
          <div className="merchant-console-info">
            <span className="merchant-console-name">
              {storeName || "Merchant Console"}
            </span>
            {user && (
              <span className="merchant-console-email">{user.email}</span>
            )}
          </div>
          <svg className="merchant-console-chevron" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 4l4 4-4 4" />
          </svg>
        </Link>
        <button
          className="sidebar-signout-btn"
          onClick={handleSignOut}
          title="Sign out"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3" />
            <path d="M11 11l3-3-3-3" />
            <path d="M14 8H6" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
