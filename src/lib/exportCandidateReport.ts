import { supabase } from "@/integrations/supabase/client";

const CRITERION_LABELS: Record<string, string> = {
  experiencia: "Experiência",
  habilidades_tecnicas: "Habilidades técnicas",
  localizacao: "Localização",
  senioridade: "Senioridade",
  soft_skills: "Soft skills",
  triagem: "Triagem",
};

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(s: any): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nl2br(s: any): string {
  return escapeHtml(s).replace(/\n/g, "<br>");
}

function statusLabel(status: string): string {
  return status === "active" ? "Ativo" : status === "hired" ? "Contratado" : "Reprovado";
}

function statusClass(status: string): string {
  return status === "active" ? "status-active" : status === "hired" ? "status-hired" : "status-rejected";
}

export async function exportCandidateReport(jobId: string, searchTerm?: string): Promise<void> {
  // 1) Vaga
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("title, description, location, type, seniority, work_model, required_skills, deadline")
    .eq("id", jobId)
    .single();
  if (jobErr || !job) throw new Error("Vaga não encontrada.");

  // 2) Aplicações + candidato + etapa
  const { data: apps, error: appsErr } = await supabase
    .from("applications")
    .select(
      "id, status, created_at, updated_at, candidate_id, stage_id, " +
      "candidates(name, email, phone, city, linkedin_url, summary), " +
      "stages(name, order_index)"
    )
    .eq("job_id", jobId);
  if (appsErr) throw appsErr;

  let filteredApps = (apps ?? []) as any[];
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filteredApps = filteredApps.filter((a) =>
      a.candidates?.name?.toLowerCase().includes(term) ||
      a.candidates?.email?.toLowerCase().includes(term)
    );
  }

  // 3) Scores
  const candidateIds = filteredApps.map((a) => a.candidate_id).filter(Boolean);
  let scores: any[] = [];
  if (candidateIds.length > 0) {
    const { data: scoresData } = await supabase
      .from("candidate_scores")
      .select("candidate_id, overall_score, ai_summary, criteria_scores")
      .eq("job_id", jobId)
      .in("candidate_id", candidateIds);
    scores = scoresData ?? [];
  }

  // 4) Respostas de triagem
  const appIds = filteredApps.map((a) => a.id);
  let answers: any[] = [];
  if (appIds.length > 0) {
    const { data: ansData } = await supabase
      .from("screening_answers")
      .select("application_id, answer, screening_questions(question, order_index)")
      .in("application_id", appIds);
    answers = ansData ?? [];
  }

  // 5) Ordena por score (maior primeiro), sem score vai pro fim
  filteredApps.sort((a, b) => {
    const sa = scores.find((s) => s.candidate_id === a.candidate_id);
    const sb = scores.find((s) => s.candidate_id === b.candidate_id);
    return (sb?.overall_score ?? -1) - (sa?.overall_score ?? -1);
  });

  // 6) HTML por candidato
  const candidatesHtml = filteredApps.map((app) => {
    const c = app.candidates ?? {};
    const stage = app.stages ?? {};
    const score = scores.find((s) => s.candidate_id === app.candidate_id);
    const myAnswers = answers
      .filter((a) => a.application_id === app.id)
      .sort((a, b) => (a.screening_questions?.order_index ?? 0) - (b.screening_questions?.order_index ?? 0));

    const criteriaHtml = score?.criteria_scores
      ? Object.entries(score.criteria_scores).map(([key, val]: [string, any]) => `
          <div class="criterion">
            <div class="criterion-head">
              <span class="criterion-label">${escapeHtml(CRITERION_LABELS[key] ?? key)}</span>
              <span class="criterion-score">${escapeHtml(val.score)}</span>
            </div>
            <div class="criterion-bar"><div class="criterion-bar-fill" style="width: ${Math.min(100, Math.max(0, val.score))}%"></div></div>
            ${val.nota ? `<div class="criterion-nota">${nl2br(val.nota)}</div>` : ""}
          </div>
        `).join("")
      : `<div class="empty-msg">Sem avaliação IA registrada para este candidato.</div>`;

    const triagemHtml = myAnswers.length > 0
      ? myAnswers.map((a: any) => `
          <div class="qa">
            <div class="qa-q">${escapeHtml(a.screening_questions?.question ?? "Pergunta sem texto")}</div>
            <div class="qa-a">${nl2br(a.answer)}</div>
          </div>
        `).join("")
      : `<div class="empty-msg">Sem respostas de triagem.</div>`;

    return `
      <section class="candidate">
        <header class="candidate-header">
          <div class="candidate-id">
            <h2 class="candidate-name">${escapeHtml(c.name ?? "Candidato sem nome")}</h2>
            <div class="candidate-contact">
              ${c.email ? escapeHtml(c.email) : ""}${c.phone ? ` &middot; ${escapeHtml(c.phone)}` : ""}${c.city ? ` &middot; ${escapeHtml(c.city)}` : ""}
              ${c.linkedin_url ? ` &middot; <a href="${escapeHtml(c.linkedin_url)}" target="_blank">LinkedIn</a>` : ""}
            </div>
            <div class="candidate-meta">Candidatou-se em ${formatDate(app.created_at)}</div>
          </div>
          <div class="candidate-badges">
            ${score?.overall_score !== undefined && score?.overall_score !== null ? `<span class="badge score-badge">${score.overall_score}%</span>` : ""}
            <span class="badge stage-badge">${escapeHtml(stage.name ?? "—")}</span>
            <span class="badge ${statusClass(app.status)}">${statusLabel(app.status)}</span>
          </div>
        </header>

        ${score?.ai_summary ? `
          <div class="section">
            <h3 class="section-title">✨ Análise IA</h3>
            <p class="ai-summary">${nl2br(score.ai_summary)}</p>
          </div>
        ` : ""}

        <div class="section">
          <h3 class="section-title">📊 Score &amp; Critérios</h3>
          ${criteriaHtml}
        </div>

        <div class="section">
          <h3 class="section-title">📝 Triagem</h3>
          ${triagemHtml}
        </div>
      </section>
    `;
  }).join("");

  // 7) Header da vaga
  const jobMeta: string[] = [];
  if ((job as any).location) jobMeta.push(`📍 ${escapeHtml((job as any).location)}`);
  if ((job as any).type) jobMeta.push(`💼 ${escapeHtml((job as any).type)}`);
  if ((job as any).seniority) jobMeta.push(`🎯 ${escapeHtml((job as any).seniority)}`);
  if ((job as any).work_model) jobMeta.push(`🖥️ ${escapeHtml((job as any).work_model)}`);
  if ((job as any).deadline) jobMeta.push(`⏰ até ${formatDate((job as any).deadline)}`);

  const requiredSkills: string[] | null = (job as any).required_skills ?? null;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Candidaturas — ${escapeHtml(job.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      background: #f5f5f7;
      color: #1a1a1a;
      line-height: 1.5;
    }
    .toolbar {
      position: sticky; top: 0; z-index: 10;
      background: white; border-bottom: 1px solid #e5e5ea;
      padding: 12px 24px; display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .toolbar-brand { display: flex; align-items: center; gap: 10px; font-weight: 600; }
    .brand-mark {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: bold; font-size: 16px;
    }
    .toolbar-actions { display: flex; gap: 8px; }
    .btn {
      padding: 8px 14px; border: none; border-radius: 6px; cursor: pointer;
      font-size: 14px; font-weight: 500;
    }
    .btn-primary { background: #6366f1; color: white; }
    .btn-primary:hover { background: #4f46e5; }
    .btn-ghost { background: transparent; color: #666; border: 1px solid #e5e5ea; }

    .container { max-width: 880px; margin: 24px auto; padding: 0 24px 80px; }
    .report-header {
      background: white; border: 1px solid #e5e5ea; border-radius: 12px;
      padding: 28px; margin-bottom: 20px;
    }
    .report-title { font-size: 13px; font-weight: 600; color: #6366f1; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px; }
    .report-job-title { font-size: 28px; font-weight: 700; margin: 0 0 12px; color: #111; }
    .report-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: #666; margin-bottom: 16px; }
    .report-generated { font-size: 12px; color: #888; }
    .skills { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 0; }
    .skill { background: #f0f0f5; padding: 3px 10px; border-radius: 12px; font-size: 12px; }

    .job-description {
      background: #fafafc; border-left: 3px solid #6366f1; padding: 16px 20px;
      margin-top: 20px; border-radius: 0 8px 8px 0; white-space: pre-wrap;
      font-size: 14px; color: #333; line-height: 1.65;
    }

    .candidates-header { font-size: 16px; font-weight: 600; margin: 28px 0 16px; color: #444; }
    .candidates-count { color: #6366f1; }

    .candidate {
      background: white; border: 1px solid #e5e5ea; border-radius: 12px;
      padding: 24px; margin-bottom: 16px;
    }
    .candidate-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 12px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f5; margin-bottom: 18px;
      flex-wrap: wrap;
    }
    .candidate-name { font-size: 20px; font-weight: 700; margin: 0 0 4px; color: #111; }
    .candidate-contact { font-size: 13px; color: #666; }
    .candidate-contact a { color: #6366f1; text-decoration: none; }
    .candidate-meta { font-size: 11px; color: #999; margin-top: 4px; }
    .candidate-badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .badge { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .score-badge { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; }
    .stage-badge { background: #eef2ff; color: #4338ca; }
    .status-active { background: #ecfeff; color: #0e7490; }
    .status-hired { background: #f0fdf4; color: #15803d; }
    .status-rejected { background: #fef2f2; color: #b91c1c; }

    .section { margin-top: 16px; }
    .section-title { font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px; }
    .ai-summary {
      background: #fef9c3; border: 1px solid #fde68a; padding: 12px 14px;
      border-radius: 8px; margin: 0; font-size: 14px; line-height: 1.65; color: #422;
    }

    .criterion { margin-bottom: 12px; }
    .criterion-head { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; }
    .criterion-label { color: #333; }
    .criterion-score { font-weight: 700; color: #111; }
    .criterion-bar { background: #f0f0f5; height: 6px; border-radius: 3px; overflow: hidden; }
    .criterion-bar-fill { background: linear-gradient(90deg, #6366f1, #8b5cf6); height: 100%; }
    .criterion-nota { font-size: 12px; color: #666; margin-top: 4px; font-style: italic; }

    .qa { margin-bottom: 14px; padding: 12px 14px; background: #fafafc; border-radius: 8px; border-left: 2px solid #e5e5ea; }
    .qa-q { font-size: 13px; font-weight: 600; color: #444; margin-bottom: 4px; }
    .qa-a { font-size: 14px; color: #1a1a1a; white-space: pre-wrap; }

    .empty-msg { color: #999; font-style: italic; font-size: 13px; padding: 8px 0; }

    .empty-state {
      background: white; border: 1px dashed #e5e5ea; border-radius: 12px;
      padding: 48px; text-align: center; color: #999;
    }

    /* ========== Print styles ========== */
    @media print {
      body { background: white; }
      .toolbar, .no-print { display: none !important; }
      .container { max-width: none; margin: 0; padding: 0; }
      .candidate { break-inside: avoid; page-break-inside: avoid; box-shadow: none; border: 1px solid #ddd; margin-bottom: 12px; }
      .report-header { border: 1px solid #ddd; }
      .score-badge, .criterion-bar-fill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      a { color: #1a1a1a; text-decoration: underline; }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <div class="toolbar-brand">
      <div class="brand-mark">✨</div>
      <span>com você, Recruta. — Relatório</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn btn-ghost" onclick="window.close()">Fechar</button>
      <button class="btn btn-primary" onclick="window.print()">🖨 Imprimir / Salvar PDF</button>
    </div>
  </div>

  <div class="container">
    <div class="report-header">
      <p class="report-title">Relatório de Candidaturas</p>
      <h1 class="report-job-title">${escapeHtml(job.title)}</h1>
      ${jobMeta.length > 0 ? `<div class="report-meta">${jobMeta.join(" &nbsp; ")}</div>` : ""}
      ${requiredSkills && requiredSkills.length > 0 ? `
        <div class="skills">
          ${requiredSkills.map((s) => `<span class="skill">${escapeHtml(s)}</span>`).join("")}
        </div>
      ` : ""}
      <p class="report-generated">Gerado em ${formatDate(new Date().toISOString())}</p>

      ${job.description ? `
        <div class="job-description">${nl2br(job.description)}</div>
      ` : ""}
    </div>

    <h2 class="candidates-header">
      Candidatos <span class="candidates-count">(${filteredApps.length})</span>
      ${searchTerm && searchTerm.trim() ? ` <span style="font-size:13px;color:#999;font-weight:400;">— filtrado por "${escapeHtml(searchTerm)}"</span>` : ""}
    </h2>

    ${filteredApps.length > 0
      ? candidatesHtml
      : `<div class="empty-state">Nenhum candidato encontrado${searchTerm ? ` para a busca "${escapeHtml(searchTerm)}"` : ""}.</div>`
    }
  </div>
</body>
</html>`;

  // 8) Abre em nova aba
  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Não foi possível abrir nova aba. Permita popups deste site nas configurações do navegador.");
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
