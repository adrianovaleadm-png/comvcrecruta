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
    const { candidate_id, job_id } = await req.json();
    if (!candidate_id || !job_id) return jsonResp({ error: "candidate_id e job_id são obrigatórios" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch candidate + tags
    const { data: candidate, error: cErr } = await supabase
      .from("candidates")
      .select("name, email, phone, city, linkedin_url, summary")
      .eq("id", candidate_id)
      .single();
    if (cErr || !candidate) return jsonResp({ error: "Candidato não encontrado" }, 404);

    const { data: tagRows } = await supabase
      .from("candidate_tags")
      .select("tags(name)")
      .eq("candidate_id", candidate_id);
    const candidateTags = tagRows?.map((t: any) => t.tags?.name).filter(Boolean) || [];

    // Fetch job (including score_weights)
    const { data: job, error: jErr } = await supabase
      .from("jobs")
      .select("title, description, location, type, status, score_weights")
      .eq("id", job_id)
      .single();
    if (jErr || !job) return jsonResp({ error: "Vaga não encontrada" }, 404);

    // Fetch screening answers for this candidate+job
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
          .map((a: any) => `- ${a.screening_questions?.question || "Pergunta"}: ${a.answer}`)
          .join("\n");
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResp({ error: "LOVABLE_API_KEY não configurada" }, 500);

    const hasScreening = screeningText.length > 0;
    const criteriaList = `1. experiencia - Experiência e senioridade
2. habilidades_tecnicas - Habilidades técnicas relevantes
3. localizacao - Compatibilidade geográfica
4. senioridade - Nível de senioridade adequado
5. soft_skills - Habilidades comportamentais
${hasScreening ? "6. triagem - Qualidade e relevância das respostas de triagem" : ""}`;

    const prompt = `Você é um especialista em recrutamento e seleção.

Avalie a aderência (fit) do candidato abaixo para a vaga descrita. Retorne APENAS via tool call.

## Candidato
- Nome: ${candidate.name}
- Cidade: ${candidate.city || "Não informada"}
- Resumo: ${candidate.summary || "Não informado"}
- Tags/Habilidades: ${candidateTags.length > 0 ? candidateTags.join(", ") : "Não informadas"}
- LinkedIn: ${candidate.linkedin_url || "Não informado"}

## Vaga
- Título: ${job.title}
- Tipo: ${job.type || "Não informado"}
- Localização: ${job.location || "Não informada"}
- Descrição: ${job.description || "Não informada"}
${hasScreening ? `\n## Respostas de Triagem\n${screeningText}` : ""}

## Instruções
Avalie em ${hasScreening ? "6" : "5"} critérios (score 0-100 cada):
${criteriaList}

Use o JSON via tool call.`;

    // Build criteria properties for tool
    const criteriaProps: any = {
      experiencia: { type: "object", properties: { score: { type: "integer" }, nota: { type: "string" } }, required: ["score", "nota"] },
      habilidades_tecnicas: { type: "object", properties: { score: { type: "integer" }, nota: { type: "string" } }, required: ["score", "nota"] },
      localizacao: { type: "object", properties: { score: { type: "integer" }, nota: { type: "string" } }, required: ["score", "nota"] },
      senioridade: { type: "object", properties: { score: { type: "integer" }, nota: { type: "string" } }, required: ["score", "nota"] },
      soft_skills: { type: "object", properties: { score: { type: "integer" }, nota: { type: "string" } }, required: ["score", "nota"] },
    };
    const criteriaRequired = ["experiencia", "habilidades_tecnicas", "localizacao", "senioridade", "soft_skills"];
    if (hasScreening) {
      criteriaProps.triagem = { type: "object", properties: { score: { type: "integer" }, nota: { type: "string" } }, required: ["score", "nota"] };
      criteriaRequired.push("triagem");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um avaliador de fit candidato-vaga. Responda apenas via tool call." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_fit_score",
            description: "Submete a avaliação de fit do candidato para a vaga",
            parameters: {
              type: "object",
              properties: {
                overall_score: { type: "integer", description: "Score geral de 0 a 100 (será recalculado com pesos)" },
                ai_summary: { type: "string", description: "Resumo em PT-BR de 2-3 frases sobre o fit" },
                criteria_scores: { type: "object", properties: criteriaProps, required: criteriaRequired },
              },
              required: ["overall_score", "ai_summary", "criteria_scores"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_fit_score" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return jsonResp({ error: "Limite de requisições excedido. Tente novamente em instantes." }, 429);
      if (status === 402) return jsonResp({ error: "Créditos de IA esgotados." }, 402);
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      return jsonResp({ error: "Erro na avaliação de IA" }, 500);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return jsonResp({ error: "IA não retornou avaliação estruturada" }, 500);
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Calculate weighted overall score
    const weights = (job as any).score_weights || null;
    let overallScore: number;

    if (weights && typeof weights === "object") {
      let totalWeight = 0;
      let weightedSum = 0;
      for (const [key, val] of Object.entries(result.criteria_scores)) {
        const w = (weights as Record<string, number>)[key] ?? 0;
        weightedSum += (val as any).score * w;
        totalWeight += w;
      }
      overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : result.overall_score;
    } else {
      // Simple average
      const scores = Object.values(result.criteria_scores).map((v: any) => v.score);
      overallScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
    }
    overallScore = Math.max(0, Math.min(100, overallScore));

    const { data: saved, error: saveErr } = await supabase
      .from("candidate_scores")
      .upsert({
        candidate_id, job_id,
        overall_score: overallScore,
        criteria_scores: result.criteria_scores,
        ai_summary: result.ai_summary,
      }, { onConflict: "candidate_id,job_id" })
      .select()
      .single();

    if (saveErr) {
      console.error("Save error:", saveErr);
      return jsonResp({ error: "Erro ao salvar score" }, 500);
    }

    return jsonResp(saved);
  } catch (e) {
    console.error("score-candidate-job error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
