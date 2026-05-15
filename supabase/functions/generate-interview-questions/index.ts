import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResp = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth guard: rejeita anonimos.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp({ error: "Não autorizado" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authErr } = await authClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user || user.aud !== "authenticated") {
      return jsonResp({ error: "Não autorizado" }, 401);
    }

    const { candidate_id, job_id, stage_name } = await req.json();
    if (!candidate_id || !job_id || !stage_name) {
      return jsonResp({ error: "candidate_id, job_id e stage_name são obrigatórios" }, 400);
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, serviceKey);

    // Candidate
    const { data: candidate } = await supabase
      .from("candidates")
      .select("name, city, summary, linkedin_url")
      .eq("id", candidate_id)
      .single();
    if (!candidate) return jsonResp({ error: "Candidato não encontrado" }, 404);

    // Tags
    const { data: tagRows } = await supabase
      .from("candidate_tags")
      .select("tags(name)")
      .eq("candidate_id", candidate_id);
    const candidateTags = (tagRows ?? []).map((t: any) => t.tags?.name).filter(Boolean);

    // Job
    const { data: job } = await supabase
      .from("jobs")
      .select("title, description, seniority, work_model, required_skills")
      .eq("id", job_id)
      .single();
    if (!job) return jsonResp({ error: "Vaga não encontrada" }, 404);

    // Application (para pegar respostas de triagem)
    const { data: appRow } = await supabase
      .from("applications")
      .select("id")
      .eq("candidate_id", candidate_id)
      .eq("job_id", job_id)
      .limit(1)
      .maybeSingle();

    let screeningText = "";
    if (appRow) {
      const { data: answerRows } = await supabase
        .from("screening_answers")
        .select("answer, screening_questions(question)")
        .eq("application_id", appRow.id);
      if (answerRows && answerRows.length > 0) {
        screeningText = answerRows
          .map((a: any) => `- "${a.screening_questions?.question || "?"}": ${a.answer}`)
          .join("\n");
      }
    }

    // Score (se houver)
    const { data: scoreRow } = await supabase
      .from("candidate_scores")
      .select("overall_score, ai_summary, criteria_scores")
      .eq("candidate_id", candidate_id)
      .eq("job_id", job_id)
      .maybeSingle();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResp({ error: "LOVABLE_API_KEY não configurada" }, 500);

    const jobAny = job as any;

    const prompt = `Você é um especialista em recrutamento e seleção. Gere perguntas personalizadas para a etapa "${stage_name}" de um processo seletivo, considerando o perfil específico do candidato abaixo.

## Vaga
- Título: ${job.title}
- Senioridade: ${jobAny.seniority || "não informada"}
- Modalidade: ${jobAny.work_model || "não informada"}
- Habilidades requeridas: ${jobAny.required_skills?.join(", ") || "não informadas"}
- Descrição: ${(job.description || "").substring(0, 500)}

## Candidato
- Nome: ${candidate.name}
- Cidade: ${candidate.city || "não informada"}
- Resumo profissional: ${candidate.summary || "não informado"}
- Tags/Habilidades declaradas: ${candidateTags.length > 0 ? candidateTags.join(", ") : "nenhuma"}
- LinkedIn: ${candidate.linkedin_url ? "informado" : "não informado"}

${screeningText ? `## Respostas de Triagem do candidato\n${screeningText}\n` : ""}

${scoreRow ? `## Avaliação IA prévia\nScore geral: ${scoreRow.overall_score}/100\n${scoreRow.ai_summary ? `Resumo: ${scoreRow.ai_summary}` : ""}` : ""}

## Instruções

Etapa atual: **${stage_name}**

Gere de 5 a 8 perguntas em português brasileiro, **personalizadas para este candidato e vaga**, apropriadas para a etapa "${stage_name}".

Regras de qualidade:
- Refira-se a coisas específicas que o candidato disse (na triagem, no resumo, nas tags) sempre que possível
- Misture tipos: comportamentais, técnicas, situacionais, motivacionais
- Para "Triagem": foco em fit e conhecimento básico
- Para "Entrevista": comportamental + experiência (STAR) + motivação
- Para "Case": orientações para um exercício prático relevante (não perguntas)
- Para "Oferta": perguntas sobre expectativas salariais, disponibilidade, contraproposta
- Evite perguntas genéricas tipo "fale sobre você" ou "quais suas qualidades/defeitos"
- Não pergunte dados pessoais já fornecidos
- Cada pergunta deve ser direta e fazer sentido sozinha

Retorne APENAS um array JSON válido (sem markdown), com objetos do formato:
[{"question":"texto da pergunta","rationale":"breve justificativa de por que perguntar isso para este candidato (1 frase)"}]
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em recrutamento. Gere perguntas personalizadas em pt-BR para a etapa indicada do processo seletivo. Retorne apenas JSON válido sem markdown.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return jsonResp({ error: "Limite de requisições excedido. Tente novamente em instantes." }, 429);
      if (status === 402) return jsonResp({ error: "Créditos de IA esgotados." }, 402);
      const errText = await response.text();
      console.error("AI error:", status, errText);
      return jsonResp({ error: "Erro ao gerar perguntas." }, 500);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? "[]";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let questions: { question: string; rationale?: string }[];
    try {
      questions = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return jsonResp({ error: "Resposta da IA em formato inválido." }, 500);
    }

    return jsonResp({ questions, stage_name });
  } catch (e) {
    console.error("generate-interview-questions error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
