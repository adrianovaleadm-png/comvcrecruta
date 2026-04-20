import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  application_id: string;
  new_stage_id: string;
}

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { application_id, new_stage_id } = (await req.json()) as Payload;
    if (!application_id || !new_stage_id) {
      return new Response(JSON.stringify({ error: "application_id e new_stage_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Application + candidate + job
    const { data: app, error: appErr } = await supabase
      .from("applications")
      .select("id, job_id, candidate_id, candidates(name, email), jobs(title)")
      .eq("id", application_id)
      .single();
    if (appErr || !app) throw new Error("Candidatura não encontrada");

    const candidate = (app as any).candidates;
    const job = (app as any).jobs;
    if (!candidate?.email) {
      return new Response(JSON.stringify({ skipped: true, reason: "Sem e-mail do candidato" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Template
    const { data: tpl } = await supabase
      .from("stage_templates")
      .select("assunto, corpo, enviar_automatico")
      .eq("stage_id", new_stage_id)
      .maybeSingle();
    if (!tpl) {
      return new Response(JSON.stringify({ skipped: true, reason: "Sem template configurado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Empresa (pega a primeira — modo dev single-tenant)
    const { data: company } = await supabase
      .from("companies")
      .select("nome_fantasia")
      .limit(1)
      .maybeSingle();

    const vars = {
      candidato: candidate.name || "Candidato(a)",
      vaga: job?.title || "vaga",
      empresa: company?.nome_fantasia || "nossa empresa",
    };

    const assunto = renderTemplate(tpl.assunto, vars);
    const corpo = renderTemplate(tpl.corpo, vars);

    // Modo log-only (sem provedor de e-mail configurado)
    await supabase.from("activity_events").insert({
      type: "email_sent",
      entity_type: "application",
      entity_id: application_id,
      message: `E-mail enviado para ${candidate.email}: "${assunto}"`,
      metadata: { to: candidate.email, subject: assunto, body: corpo, mode: "log-only" },
    });

    return new Response(
      JSON.stringify({ sent: true, mode: "log-only", to: candidate.email, subject: assunto }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("send-stage-notification error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
