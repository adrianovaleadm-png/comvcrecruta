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
    const { candidate_id, job_id } = await req.json();
    if (!candidate_id || !job_id) {
      return new Response(JSON.stringify({ error: "candidate_id e job_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch candidate + tags
    const { data: candidate, error: cErr } = await supabase
      .from("candidates")
      .select("name, email, phone, city, linkedin_url, summary")
      .eq("id", candidate_id)
      .single();
    if (cErr || !candidate) {
      return new Response(JSON.stringify({ error: "Candidato não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tagRows } = await supabase
      .from("candidate_tags")
      .select("tags(name)")
      .eq("candidate_id", candidate_id);
    const candidateTags = tagRows?.map((t: any) => t.tags?.name).filter(Boolean) || [];

    // Fetch job
    const { data: job, error: jErr } = await supabase
      .from("jobs")
      .select("title, description, location, type, status")
      .eq("id", job_id)
      .single();
    if (jErr || !job) {
      return new Response(JSON.stringify({ error: "Vaga não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Você é um especialista em recrutamento e seleção.

Avalie a aderência (fit) do candidato abaixo para a vaga descrita. Retorne APENAS o JSON estruturado, sem markdown.

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

## Instruções
Avalie em 5 critérios (score 0-100 cada):
1. experiencia - Experiência e senioridade
2. habilidades_tecnicas - Habilidades técnicas relevantes
3. localizacao - Compatibilidade geográfica
4. senioridade - Nível de senioridade adequado
5. soft_skills - Habilidades comportamentais

Use o JSON via tool call.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um avaliador de fit candidato-vaga. Responda apenas via tool call." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_fit_score",
              description: "Submete a avaliação de fit do candidato para a vaga",
              parameters: {
                type: "object",
                properties: {
                  overall_score: { type: "integer", description: "Score geral de 0 a 100" },
                  ai_summary: { type: "string", description: "Resumo em PT-BR de 2-3 frases sobre o fit" },
                  criteria_scores: {
                    type: "object",
                    properties: {
                      experiencia: {
                        type: "object",
                        properties: { score: { type: "integer" }, nota: { type: "string" } },
                        required: ["score", "nota"],
                      },
                      habilidades_tecnicas: {
                        type: "object",
                        properties: { score: { type: "integer" }, nota: { type: "string" } },
                        required: ["score", "nota"],
                      },
                      localizacao: {
                        type: "object",
                        properties: { score: { type: "integer" }, nota: { type: "string" } },
                        required: ["score", "nota"],
                      },
                      senioridade: {
                        type: "object",
                        properties: { score: { type: "integer" }, nota: { type: "string" } },
                        required: ["score", "nota"],
                      },
                      soft_skills: {
                        type: "object",
                        properties: { score: { type: "integer" }, nota: { type: "string" } },
                        required: ["score", "nota"],
                      },
                    },
                    required: ["experiencia", "habilidades_tecnicas", "localizacao", "senioridade", "soft_skills"],
                  },
                },
                required: ["overall_score", "ai_summary", "criteria_scores"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_fit_score" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      return new Response(JSON.stringify({ error: "Erro na avaliação de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "IA não retornou avaliação estruturada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    const overallScore = Math.max(0, Math.min(100, result.overall_score));

    // Upsert score
    const { data: saved, error: saveErr } = await supabase
      .from("candidate_scores")
      .upsert(
        {
          candidate_id,
          job_id,
          overall_score: overallScore,
          criteria_scores: result.criteria_scores,
          ai_summary: result.ai_summary,
        },
        { onConflict: "candidate_id,job_id" }
      )
      .select()
      .single();

    if (saveErr) {
      console.error("Save error:", saveErr);
      return new Response(JSON.stringify({ error: "Erro ao salvar score" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(saved), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("score-candidate-job error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
