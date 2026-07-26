import Link from "next/link";
import { Brand } from "@/components/Brand";
import { logout } from "@/app/auth-actions";
import { initials, type Role } from "@/lib/auth";
import s from "./AppHeader.module.css";

/**
 * Header for signed-in surfaces. The admin variant swaps the nav for the CRM
 * links; everything else is shared.
 */
export function AppHeader({
  role,
  name,
  email,
  current,
}: {
  role: Role;
  name?: string;
  email: string;
  current?: "dashboard" | "leads" | "marketing";
}) {
  return (
    <header className="hdr">
      <div className="wrap">
        <Brand />
        <nav>
          {role === "admin" ? (
            <>
              <Link href="/admin" aria-current={current === "leads" ? "page" : undefined}>
                Leads
              </Link>
              <Link
                href="/admin/marketing"
                aria-current={current === "marketing" ? "page" : undefined}
              >
                Marketing
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" aria-current={current === "dashboard" ? "page" : undefined}>
                Dashboard
              </Link>
              <Link className="opt" href="/articles">
                Articles
              </Link>
            </>
          )}

          <form action={logout}>
            <button className="btn btn-quiet" type="submit">
              Log out
            </button>
          </form>

          <span className={s.who}>
            <span className="avatar" aria-hidden="true">
              {initials(name, email)}
            </span>
            <span className={s.name}>{name || email}</span>
          </span>
        </nav>
      </div>
    </header>
  );
}
