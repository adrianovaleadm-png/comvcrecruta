import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth guard: rejeita anônimos (a anon key isolada não basta).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authErr } = await authClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user || user.aud !== "authenticated") {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const jobId = url.searchParams.get("job_id");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get stages
    let stagesQuery = supabase.from("stages").select("*").order("order_index");
    if (jobId) stagesQuery = stagesQuery.eq("job_id", jobId);
    const { data: stages } = await stagesQuery;

    // Get applications with activity events for stage changes
    let appsQuery = supabase.from("applications").select("id, job_id, stage_id, status, created_at, updated_at");
    if (jobId) appsQuery = appsQuery.eq("job_id", jobId);
    if (from) appsQuery = appsQuery.gte("created_at", from);
    if (to) appsQuery = appsQuery.lte("created_at", to);
    const { data: apps } = await appsQuery;

    // Build unique stages by name (sorted by order_index)
    const uniqueStages = new Map<string, { name: string; order_index: number; ids: string[] }>();
    for (const s of (stages || [])) {
      const ex = uniqueStages.get(s.name);
      if (ex) { ex.ids.push(s.id); } else { uniqueStages.set(s.name, { name: s.name, order_index: s.order_index, ids: [s.id] }); }
    }
    const sortedStages = Array.from(uniqueStages.values()).sort((a, b) => a.order_index - b.order_index);

    // Count apps per stage
    const stageCountMap = new Map<string, number>();
    for (const app of (apps || [])) {
      stageCountMap.set(app.stage_id, (stageCountMap.get(app.stage_id) || 0) + 1);
    }

    const funnel = sortedStages.map((s) => ({
      stageName: s.name,
      count: s.ids.reduce((sum, id) => sum + (stageCountMap.get(id) || 0), 0),
    }));

    // Conversion rates between consecutive stages
    const conversions = [];
    for (let i = 0; i < funnel.length - 1; i++) {
      const from = funnel[i];
      const to = funnel[i + 1];
      const rate = from.count > 0 ? Math.round((to.count / from.count) * 100) : 0;
      conversions.push({ from: from.stageName, to: to.stageName, rate });
    }

    // Avg time per stage (using activity_events stage_changed)
    let eventsQuery = supabase.from("activity_events").select("entity_id, created_at, metadata").eq("type", "stage_changed");
    const { data: events } = await eventsQuery;

    // Group events by application
    const appEvents = new Map<string, { created_at: string; stage: string }[]>();
    for (const ev of (events || [])) {
      const list = appEvents.get(ev.entity_id) || [];
      const meta = ev.metadata as any;
      list.push({ created_at: ev.created_at, stage: meta?.new_stage || "" });
      appEvents.set(ev.entity_id, list);
    }

    // Calculate avg time between stage transitions
    const stageTimeSums = new Map<string, { totalHours: number; count: number }>();
    for (const [, evList] of appEvents) {
      const sorted = evList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      for (let i = 1; i < sorted.length; i++) {
        const hours = (new Date(sorted[i].created_at).getTime() - new Date(sorted[i - 1].created_at).getTime()) / 3600000;
        const stageName = sorted[i].stage;
        const ex = stageTimeSums.get(stageName) || { totalHours: 0, count: 0 };
        ex.totalHours += hours;
        ex.count += 1;
        stageTimeSums.set(stageName, ex);
      }
    }

    const avgTimePerStage = sortedStages.map((s) => {
      const data = stageTimeSums.get(s.name);
      return {
        stageName: s.name,
        avgHours: data && data.count > 0 ? Math.round(data.totalHours / data.count * 10) / 10 : null,
        transitions: data?.count || 0,
      };
    });

    // Summary stats
    const totalApps = apps?.length || 0;
    const hired = apps?.filter((a) => a.status === "hired").length || 0;
    const rejected = apps?.filter((a) => a.status === "rejected").length || 0;
    const active = apps?.filter((a) => a.status === "active").length || 0;

    return new Response(JSON.stringify({
      funnel, conversions, avgTimePerStage,
      summary: { totalApps, hired, rejected, active, hireRate: totalApps > 0 ? Math.round((hired / totalApps) * 100) : 0 },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("get-funnel-metrics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
