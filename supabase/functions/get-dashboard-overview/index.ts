import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Run queries in parallel
    const [
      openJobsRes,
      activeCandidatesRes,
      hiredThisMonthRes,
      appsThisMonthRes,
      closedAppsRes,
      pendingRes,
      funnelRes,
      activityRes,
    ] = await Promise.all([
      // openJobs
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
      // activeCandidates
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "active"),
      // hiredThisMonth
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "hired").gte("created_at", monthStart),
      // appsThisMonth (for conversion rate)
      supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
      // closed apps for avg time
      supabase.from("applications").select("created_at, updated_at").in("status", ["hired", "rejected"]),
      // pending (active + updated > 7 days ago)
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "active").lt("updated_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      // funnel: stages with application counts
      supabase.from("stages").select("name, order_index, id"),
      // recent activity
      supabase.from("activity_events").select("message, created_at").order("created_at", { ascending: false }).limit(10),
    ]);

    const openJobs = openJobsRes.count ?? 0;
    const activeCandidates = activeCandidatesRes.count ?? 0;
    const hiredThisMonth = hiredThisMonthRes.count ?? 0;
    const appsThisMonth = appsThisMonthRes.count ?? 0;
    const conversionRateThisMonth = appsThisMonth > 0 ? Math.round((hiredThisMonth / appsThisMonth) * 100) : 0;
    const pendingItems = pendingRes.count ?? 0;

    // Avg time to close
    let avgTimeToCloseDays: number | null = null;
    if (closedAppsRes.data && closedAppsRes.data.length > 0) {
      const totalDays = closedAppsRes.data.reduce((sum: number, app: any) => {
        const diff = new Date(app.updated_at).getTime() - new Date(app.created_at).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgTimeToCloseDays = Math.round((totalDays / closedAppsRes.data.length) * 10) / 10;
    }

    // Funnel: count active applications per stage
    let funnel: { stageName: string; count: number }[] = [];
    if (funnelRes.data && funnelRes.data.length > 0) {
      // Get unique stages across all jobs, sorted by order_index
      const uniqueStages = new Map<string, { name: string; order_index: number; ids: string[] }>();
      for (const s of funnelRes.data) {
        const existing = uniqueStages.get(s.name);
        if (existing) {
          existing.ids.push(s.id);
        } else {
          uniqueStages.set(s.name, { name: s.name, order_index: s.order_index, ids: [s.id] });
        }
      }

      const sortedStages = Array.from(uniqueStages.values()).sort((a, b) => a.order_index - b.order_index);

      // Get all active application counts by stage_id
      const { data: activeApps } = await supabase
        .from("applications")
        .select("stage_id")
        .eq("status", "active");

      const countByStageId = new Map<string, number>();
      if (activeApps) {
        for (const app of activeApps) {
          countByStageId.set(app.stage_id, (countByStageId.get(app.stage_id) ?? 0) + 1);
        }
      }

      funnel = sortedStages.map((s) => ({
        stageName: s.name,
        count: s.ids.reduce((sum, id) => sum + (countByStageId.get(id) ?? 0), 0),
      }));
    }

    const recentActivity = activityRes.data ?? [];

    return new Response(
      JSON.stringify({
        kpis: { openJobs, activeCandidates, hiredThisMonth, conversionRateThisMonth, avgTimeToCloseDays, pendingItems },
        funnel,
        recentActivity,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-dashboard-overview error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
