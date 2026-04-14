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
    const { title, location, type, status, existingDescription } = await req.json();

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

    const contextParts: string[] = [];
    contextParts.push(`Título da vaga: ${title}`);
    if (location) contextParts.push(`Localização: ${location}`);
    if (type) contextParts.push(`Tipo de contratação: ${type}`);
    if (status) contextParts.push(`Status: ${status}`);
    const context = contextParts.join("\n");

    let userPrompt: string;

    if (existingDescription && existingDescription.trim().length > 0) {
      userPrompt = `Reescreva e melhore a descrição de vaga abaixo, mantendo o sentido original mas tornando o texto mais claro, profissional e bem estruturado. Use as informações de contexto para enriquecer se necessário.

Contexto:
${context}

Descrição atual:
${existingDescription}

Mantenha a estrutura: resumo, responsabilidades (bullets), requisitos (bullets), diferenciais (bullets), benefícios (bullets, opcional) e chamada final "Como se candidatar". Tamanho: 150 a 250 palavras. Não prometa salários se não informado. Evite termos discriminatórios.`;
    } else {
      userPrompt = `Crie uma descrição de vaga de emprego com base nas informações abaixo.

${context}

Estrutura obrigatória:
a) Resumo da vaga (2-3 linhas)
b) Responsabilidades (4-6 bullets)
c) Requisitos (4-6 bullets)
d) Diferenciais (3-5 bullets)
e) Benefícios (opcional, 3-5 bullets)
f) Chamada final "Como se candidatar"

Regras:
- Tom profissional, claro, sem exageros.
- Tamanho: 150 a 250 palavras.
- Não prometa salários se não informado.
- Evite termos discriminatórios.
- Escreva em pt-BR.`;
    }

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
              "Você é um especialista em recrutamento e employer branding. Gere descrições de vagas em pt-BR, profissionais e inclusivas. Retorne apenas o texto da descrição, sem explicações extras.",
          },
          { role: "user", content: userPrompt },
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
      return new Response(JSON.stringify({ error: "Erro ao gerar descrição." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ description: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-job-description error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
