"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "⬡", label: "Dashboard" },
  { href: "/agents",    icon: "◈", label: "Agents" },
  { href: "/memory",    icon: "◎", label: "Memory" },
  { href: "/settings",  icon: "⊕", label: "Settings" },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="sidenav">
      {/* Logo mark */}
      <div className="nav-logo">
        <div className="logo-mark">A</div>
      </div>

      {/* Nav items */}
      <div className="nav-items">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`} title={item.label}>
              <span className="nav-icon">{item.icon}</span>
              {active && <span className="nav-indicator" />}
            </Link>
          );
        })}
      </div>

      {/* Bottom: user */}
      <div className="nav-bottom">
        <Link href="/settings" className="nav-user" title="Settings">
          <div className="user-avatar">R</div>
        </Link>
      </div>

      <style jsx>{`
        .sidenav {
          width: 64px;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          border-right: 1px solid rgba(212,175,55,0.08);
          background: rgba(5,5,8,0.9);
          padding: 16px 0;
          gap: 0;
          flex-shrink: 0;
        }

        .nav-logo {
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(212,175,55,0.08);
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .logo-mark {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid rgba(212,175,55,0.3);
          background: rgba(212,175,55,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 14px;
          color: #D4AF37;
          box-shadow: 0 0 20px rgba(212,175,55,0.1);
        }

        .nav-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          width: 100%;
          padding: 0 10px;
        }

        :global(.nav-item) {
          position: relative;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          color: rgba(107,107,128,0.6);
          text-decoration: none;
          transition: all 0.2s;
          font-size: 18px;
        }
        :global(.nav-item:hover) {
          background: rgba(212,175,55,0.06);
          color: rgba(212,175,55,0.6);
        }
        :global(.nav-item.active) {
          background: rgba(212,175,55,0.08);
          color: #D4AF37;
        }

        .nav-indicator {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 2px;
          height: 20px;
          background: #D4AF37;
          border-radius: 2px 0 0 2px;
          box-shadow: 0 0 8px rgba(212,175,55,0.5);
        }

        .nav-bottom {
          padding-top: 16px;
          border-top: 1px solid rgba(212,175,55,0.08);
          width: 100%;
          display: flex;
          justify-content: center;
        }

        :global(.nav-user) {
          text-decoration: none;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(212,175,55,0.25);
          background: rgba(212,175,55,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 13px;
          color: #D4AF37;
          cursor: pointer;
          transition: all 0.2s;
        }
        .user-avatar:hover {
          border-color: rgba(212,175,55,0.5);
          background: rgba(212,175,55,0.12);
        }
      `}</style>
    </nav>
  );
}
