import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { title, description } = await req.json();

    if (!title || typeof title !== "string") {
      return new Response(JSON.stringify({ error: "Campo 'title' é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Com base na vaga abaixo, gere de 4 a 6 perguntas de triagem que ajudem a avaliar se o candidato é adequado para esta posição.

Título da vaga: ${title}
${description ? `Descrição da vaga:\n${description}` : ""}

Para cada pergunta, retorne um objeto JSON com:
- "question": texto da pergunta
- "type": "text" (resposta aberta), "yes_no" (sim/não) ou "choice" (múltipla escolha)
- "options": array de strings (apenas se type for "choice", senão array vazio)
- "required": true ou false

Retorne APENAS um array JSON válido, sem markdown, sem explicação.
Exemplo: [{"question":"...","type":"text","options":[],"required":true}]

Regras:
- Perguntas em pt-BR
- Misture tipos (pelo menos 1 yes_no, 1 text, e se cabível 1 choice)
- Foque em: experiência relevante, disponibilidade, pretensão salarial, habilidades-chave da vaga
- Não pergunte nome, email ou dados pessoais básicos`;

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
            content: "Você é um especialista em recrutamento. Gere perguntas de triagem relevantes e objetivas. Retorne apenas JSON válido.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Erro ao gerar perguntas." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? "[]";

    // Strip markdown fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let questions;
    try {
      questions = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Resposta da IA em formato inválido." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-screening-questions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
