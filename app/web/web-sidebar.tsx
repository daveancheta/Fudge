"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createAuthClient } from "better-auth/react";
import { AudioLines, ChevronRight, LogOut, MessageCircle, Moon, Settings2, Sun, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { setWebTheme, WEB_THEME_KEY } from "./theme-provider";

const authClient = createAuthClient();

export default function WebSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [theme, setTheme] = useState("light");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    setTheme(document.documentElement.dataset.webTheme === "dark" ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setWebTheme(next);
  };

  const signOut = async () => {
    setSignOutError("");
    setSigningOut(true);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        setSignOutError(error.message || "Could not sign out.");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setSigningOut(false);
    }
  };

  return <>
    <aside className="web-sidebar" id="primary-sidebar">
      <Link href="/web/chat" className="web-brand" aria-label="Fudge home">fudge<span>.</span></Link>
      <div className="web-sidebar-workspace">
        <span className="web-sidebar-label">WORKSPACE</span>
        <nav className="web-sidebar-nav" aria-label="Main navigation">
          <Link href="/web/chat" aria-current={pathname === "/web/chat" ? "page" : undefined} className={`web-nav-link${pathname === "/web/chat" ? " active" : ""}`}>
            <MessageCircle size={17} strokeWidth={1.8} /><span>Chat</span>{pathname === "/web/chat" && <i className="web-nav-indicator" />}
          </Link>
          <Link href="/web/settings" aria-current={pathname === "/web/settings" ? "page" : undefined} className={`web-nav-link${pathname === "/web/settings" ? " active" : ""}`}>
            <Settings2 size={17} strokeWidth={1.8} /><span>Settings</span>{pathname === "/web/settings" && <i className="web-nav-indicator" />}
          </Link>
        </nav>
      </div>
      <div className="web-sidebar-bottom">
        <button type="button" className="web-theme-control" onClick={toggleTheme} aria-label={`Change appearance, currently ${theme}`}>
          {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
          <span>Appearance</span><span className="web-theme-value">{theme}</span><ChevronRight className="web-theme-chevron" size={15} />
        </button>
        {isPending ? <div className="web-profile-card" role="status" aria-label="Checking your account"><span className="web-profile-avatar pulse" /><span className="web-profile-lines"><i /><i /></span></div> : session?.user ? (
          <div className="web-profile-card" title={session.user.email || "Fudge account"}>
            {session.user.image ? <img src={session.user.image} alt="" className="web-profile-avatar" /> : <span className="web-profile-avatar"><UserRound size={17} /></span>}
            <span className="web-profile-copy"><strong>{session.user.name || "Fudge account"}</strong><small>{session.user.email}</small></span>
            <button type="button" className="web-signout-button" onClick={signOut} disabled={signingOut} aria-label={signingOut ? "Signing out" : "Sign out"} title="Sign out">
              <LogOut size={15} /><span>{signingOut ? "…" : "Sign out"}</span>
            </button>
          </div>
        ) : <Link href="/login" className="web-profile-card web-profile-link"><span className="web-profile-avatar"><AudioLines size={16} /></span><span className="web-profile-copy"><strong>Sign in</strong><small>Connect your Fudge account</small></span></Link>}
        {signOutError && <p className="web-signout-error" role="alert">{signOutError}</p>}
      </div>
    </aside>
    <div className="web-mobile-header">
      <Link href="/web/chat" className="web-brand">fudge<span>.</span></Link>
      <nav aria-label="Main navigation"><Link href="/web/chat">Chat</Link><Link href="/web/settings">Settings</Link>{session?.user && <button type="button" onClick={signOut} disabled={signingOut} aria-label="Sign out"><LogOut size={16} /></button>}</nav>
    </div>
    {signOutError && <p className="web-mobile-signout-error" role="alert">{signOutError}</p>}
  </>;
}
