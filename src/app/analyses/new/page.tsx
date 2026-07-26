import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AnalysisForm } from "@/components/AnalysisForm";
import { SiteFooter } from "@/components/SiteChrome";
import { homeFor, roleOf } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import s from "@/components/auth.module.css";

export const metadata: Metadata = { title: "New analysis" };

export default async function NewAnalysisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Middleware already bounces anonymous visitors; this covers the route being
  // reached another way and satisfies the type checker.
  if (!user) redirect("/login?next=/analyses/new");

  const role = roleOf(user);
  if (role === "admin") redirect(homeFor(role));

  const name = (user.user_metadata?.name as string | undefined) ?? "";

  return (
    <>
      <AppHeader role={role} name={name} email={user.email ?? ""} current="dashboard" />

      <main className={s.auth} style={{ gridTemplateColumns: "1fr" }}>
        <section className={s.form}>
          <div className={s.inner}>
            <h1>Add another analysis</h1>
            <p className="sub">
              One upload. Your margin bridge, cost gaps and revenue split, back in minutes.
            </p>
            <AnalysisForm />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
