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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Converte texto simples em HTML profissional para o corpo do e-mail.
 * - Escapa entidades
 * - Preserva quebras de linha
 * - Envolve em container com fonte de sistema, cores discretas
 */
function buildEmailHtml(corpoPlain: string, companyName: string): string {
  const body = escapeHtml(corpoPlain).replace(/\n/g, "<br>");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border:1px solid #e5e5ea;border-radius:12px;padding:32px;">
      <div style="font-size:15px;line-height:1.65;color:#1a1a1a;">
        ${body}
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#999;margin-top:16px;">
      Este e-mail foi enviado pelo sistema de Recrutamento e Seleção da ${escapeHtml(companyName)}.
    </p>
  </div>
</body>
</html>`;
}

interface SendResult {
  ok: boolean;
  provider: string;
  id?: string;
  error?: string;
}

/**
 * Envia via Resend API. Retorna { ok, id?, error? } sem lançar.
 */
async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        reply_to: params.replyTo ? [params.replyTo] : undefined,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return {
        ok: false,
        provider: "resend",
        error: (data as any)?.message || `HTTP ${resp.status}`,
      };
    }

    return { ok: true, provider: "resend", id: (data as any)?.id };
  } catch (e: any) {
    return { ok: false, provider: "resend", error: e?.message || String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth guard: rejeita anônimos.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authErr } = await authClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user || user.aud !== "authenticated") {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { application_id, new_stage_id } = (await req.json()) as Payload;
    if (!application_id || !new_stage_id) {
      return new Response(JSON.stringify({ error: "application_id e new_stage_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Application + candidate + job + company
    const { data: app, error: appErr } = await supabase
      .from("applications")
      .select("id, job_id, candidate_id, candidates(name, email), jobs(title, companies(nome_fantasia))")
      .eq("id", application_id)
      .single();
    if (appErr || !app) throw new Error("Candidatura não encontrada");

    const candidate = (app as any).candidates;
    const job = (app as any).jobs;
    const companyFromJob = job?.companies;

    const stageRes = await supabase.from("stages").select("name").eq("id", new_stage_id).maybeSingle();
    const stageName = stageRes.data?.name ?? "—";

    if (!candidate?.email) {
      await supabase.from("activity_events").insert({
        type: "email_skipped",
        entity_type: "application",
        entity_id: application_id,
        message: `E-mail não enviado: candidato sem endereço (etapa "${stageName}")`,
        metadata: { stage_name: stageName, reason: "no_email" },
      });
      return new Response(JSON.stringify({ skipped: true, reason: "Sem e-mail do candidato" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Template da etapa
    const { data: tpl } = await supabase
      .from("stage_templates")
      .select("assunto, corpo, enviar_automatico")
      .eq("stage_id", new_stage_id)
      .maybeSingle();
    if (!tpl) {
      await supabase.from("activity_events").insert({
        type: "email_skipped",
        entity_type: "application",
        entity_id: application_id,
        message: `E-mail não enviado: sem template para etapa "${stageName}"`,
        metadata: { stage_name: stageName, reason: "no_template", to_email: candidate.email },
      });
      return new Response(JSON.stringify({ skipped: true, reason: "Sem template configurado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Nome da empresa: FK da vaga (correto) com fallback para a primeira do banco.
    let companyName = companyFromJob?.nome_fantasia || "";
    if (!companyName) {
      const { data: firstCompany } = await supabase
        .from("companies")
        .select("nome_fantasia")
        .limit(1)
        .maybeSingle();
      companyName = firstCompany?.nome_fantasia || "nossa empresa";
    }

    const vars = {
      candidato: candidate.name || "Candidato(a)",
      vaga: job?.title || "vaga",
      empresa: companyName,
    };

    const assunto = renderTemplate(tpl.assunto, vars);
    const corpo = renderTemplate(tpl.corpo, vars);

    // ========== Modo Resend (produção) ou log-only (fallback) ==========
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const RESEND_FROM_NAME = Deno.env.get("RESEND_FROM_NAME") || companyName;
    const RESEND_REPLY_TO = Deno.env.get("RESEND_REPLY_TO"); // opcional

    if (RESEND_API_KEY) {
      const html = buildEmailHtml(corpo, companyName);
      const from = `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`;

      const result = await sendViaResend({
        apiKey: RESEND_API_KEY,
        from,
        to: candidate.email,
        replyTo: RESEND_REPLY_TO,
        subject: assunto,
        html,
        text: corpo,
      });

      if (result.ok) {
        await supabase.from("activity_events").insert({
          type: "email_sent",
          entity_type: "application",
          entity_id: application_id,
          message: `E-mail enviado para ${candidate.email} (etapa "${stageName}"): "${assunto}"`,
          metadata: {
            stage_name: stageName,
            assunto,
            to_email: candidate.email,
            from_email: from,
            provider: "resend",
            provider_id: result.id,
            mode: "sent",
          },
        });

        return new Response(
          JSON.stringify({ sent: true, mode: "sent", provider: "resend", id: result.id, to: candidate.email, subject: assunto }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Falhou no envio: loga como falha e faz fallback pra log-only.
      await supabase.from("activity_events").insert({
        type: "email_failed",
        entity_type: "application",
        entity_id: application_id,
        message: `Falha ao enviar e-mail para ${candidate.email} (etapa "${stageName}"): ${result.error}. Mensagem gravada como log.`,
        metadata: {
          stage_name: stageName,
          assunto,
          to_email: candidate.email,
          body: corpo,
          provider: "resend",
          error: result.error,
          mode: "failed_fallback_to_log",
        },
      });
      // continua para o log-only abaixo, para nao perder o audit trail
    }

    // ========== Fallback log-only ==========
    // Executa quando: RESEND_API_KEY nao existe OU o envio via Resend falhou.
    await supabase.from("activity_events").insert({
      type: "email_logged",
      entity_type: "application",
      entity_id: application_id,
      message: `E-mail registrado para ${candidate.email} (etapa "${stageName}"): "${assunto}"`,
      metadata: {
        stage_name: stageName,
        assunto,
        to_email: candidate.email,
        body: corpo,
        mode: RESEND_API_KEY ? "log-only-after-failure" : "log-only-no-provider",
      },
    });

    return new Response(
      JSON.stringify({
        sent: true,
        mode: "log-only",
        reason: RESEND_API_KEY ? "resend_failure" : "no_provider_configured",
        to: candidate.email,
        subject: assunto,
      }),
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
