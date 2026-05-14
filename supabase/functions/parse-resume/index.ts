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
    // Auth guard: rejeita anônimos (a anon key isolada não basta).
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

    const { file_url } = await req.json();
    if (!file_url) return jsonResp({ error: "file_url é obrigatório" }, 400);

    // SSRF guard: aceita apenas URLs do bucket candidate-files do projeto.
    const allowedPrefix = `${SUPABASE_URL}/storage/v1/object/public/candidate-files/`;
    if (typeof file_url !== "string" || !file_url.startsWith(allowedPrefix)) {
      return jsonResp({ error: "URL inválida — apenas arquivos do bucket candidate-files são aceitos" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResp({ error: "LOVABLE_API_KEY não configurada" }, 500);

    // Fetch the file content
    const fileResp = await fetch(file_url);
    if (!fileResp.ok) return jsonResp({ error: "Não foi possível acessar o arquivo" }, 400);

    const contentType = fileResp.headers.get("content-type") || "";
    let textContent = "";

    if (contentType.includes("pdf")) {
      // For PDFs, we pass the URL to the AI model which can process it
      textContent = `[Arquivo PDF disponível em: ${file_url}]`;
    } else {
      textContent = await fileResp.text();
    }

    const prompt = `Analise o currículo abaixo e extraia as informações estruturadas. Se for um link de PDF, analise com base no nome do arquivo e contexto disponível.

Conteúdo/Referência do currículo:
${textContent.substring(0, 8000)}

Extraia via tool call as seguintes informações (deixe vazio se não encontrar):`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um especialista em análise de currículos. Extraia informações estruturadas de CVs." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_resume_data",
            description: "Extrai dados estruturados de um currículo",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Nome completo do candidato" },
                email: { type: "string", description: "Email do candidato" },
                phone: { type: "string", description: "Telefone do candidato" },
                city: { type: "string", description: "Cidade/localização do candidato" },
                linkedin_url: { type: "string", description: "URL do LinkedIn" },
                summary: { type: "string", description: "Resumo profissional em 2-3 frases" },
                skills: { type: "array", items: { type: "string" }, description: "Lista de habilidades/competências identificadas" },
              },
              required: ["name"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_resume_data" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return jsonResp({ error: "Limite de requisições excedido." }, 429);
      if (status === 402) return jsonResp({ error: "Créditos de IA esgotados." }, 402);
      return jsonResp({ error: "Erro na análise de IA" }, 500);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return jsonResp({ error: "IA não retornou dados estruturados" }, 500);

    const result = JSON.parse(toolCall.function.arguments);
    return jsonResp(result);
  } catch (e) {
    console.error("parse-resume error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
