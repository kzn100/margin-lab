-- Perf fixes from Supabase advisor:
-- 1) auth_rls_initplan: wrap auth.*()/is_admin() in (select ...) so RLS
--    evaluates once per query, not once per row.
-- 2) unindexed_foreign_keys: cover FKs hit by joins/cascades.

alter policy leads_read_own_or_admin on public.leads
  using (user_id = (select auth.uid()) or (select public.is_admin()));

alter policy pnl_uploads_read_own_or_admin on public.pnl_uploads
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.leads l
      where l.id = pnl_uploads.lead_id and l.user_id = (select auth.uid())
    )
  );

alter policy pnl_results_read_own_or_admin on public.pnl_results
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.leads l
      where l.id = pnl_results.lead_id and l.user_id = (select auth.uid())
    )
  );

alter policy marketing_campaigns_admin_all on public.marketing_campaigns
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create index pnl_results_upload_id_idx on public.pnl_results (upload_id);
create index marketing_campaigns_sent_by_idx on public.marketing_campaigns (sent_by);
