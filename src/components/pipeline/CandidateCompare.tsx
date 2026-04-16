import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Scale } from "lucide-react";
import FitScoreBadge from "./FitScoreBadge";

const CRITERIA_LABELS: Record<string, string> = {
  experiencia: "Experiência",
  habilidades_tecnicas: "Hab. Técnicas",
  localizacao: "Localização",
  senioridade: "Senioridade",
  soft_skills: "Soft Skills",
  triagem: "Triagem",
};

interface Props {
  open: boolean;
  onClose: () => void;
  candidateIds: string[];
  jobId: string;
}

export default function CandidateCompare({ open, onClose, candidateIds, jobId }: Props) {
  const { data: candidates } = useQuery({
    queryKey: ["compare-candidates", candidateIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .in("id", candidateIds);
      if (error) throw error;
      return data;
    },
    enabled: open && candidateIds.length > 0,
  });

  const { data: scores } = useQuery({
    queryKey: ["compare-scores", candidateIds, jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_scores")
        .select("*")
        .eq("job_id", jobId)
        .in("candidate_id", candidateIds);
      if (error) throw error;
      return data;
    },
    enabled: open && candidateIds.length > 0,
  });

  const { data: screeningData } = useQuery({
    queryKey: ["compare-screening", candidateIds, jobId],
    queryFn: async () => {
      const { data: apps } = await supabase
        .from("applications")
        .select("id, candidate_id")
        .eq("job_id", jobId)
        .in("candidate_id", candidateIds);
      if (!apps || apps.length === 0) return [];
      const appIds = apps.map((a) => a.id);
      const { data: answers } = await supabase
        .from("screening_answers")
        .select("application_id, answer, screening_questions(question)")
        .in("application_id", appIds);
      return apps.map((app) => ({
        candidateId: app.candidate_id,
        answers: (answers || []).filter((a: any) => a.application_id === app.id),
      }));
    },
    enabled: open && candidateIds.length > 0,
  });

  if (!open) return null;

  const getScore = (cid: string) => scores?.find((s) => s.candidate_id === cid);
  const getCandidate = (cid: string) => candidates?.find((c) => c.id === cid);
  const getScreening = (cid: string) => screeningData?.find((s) => s.candidateId === cid);

  // Collect all criteria keys
  const allCriteria = new Set<string>();
  scores?.forEach((s) => {
    Object.keys((s.criteria_scores as Record<string, any>) || {}).forEach((k) => allCriteria.add(k));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Scale className="h-5 w-5 text-primary" /> Comparar Candidatos
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-3 text-left text-muted-foreground font-medium">Critério</th>
                {candidateIds.map((cid) => (
                  <th key={cid} className="py-2 px-3 text-center font-medium text-foreground">
                    {getCandidate(cid)?.name || "Candidato"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Overall Score */}
              <tr className="border-b border-border bg-primary/5">
                <td className="py-2 px-3 font-semibold text-foreground">Score Geral</td>
                {candidateIds.map((cid) => (
                  <td key={cid} className="py-2 px-3 text-center">
                    <FitScoreBadge score={getScore(cid)?.overall_score} candidateId={cid} jobId={jobId} />
                  </td>
                ))}
              </tr>

              {/* Per-criteria */}
              {Array.from(allCriteria).map((key) => (
                <tr key={key} className="border-b border-border">
                  <td className="py-2 px-3 text-muted-foreground">{CRITERIA_LABELS[key] || key}</td>
                  {candidateIds.map((cid) => {
                    const cs = (getScore(cid)?.criteria_scores as Record<string, { score: number; nota: string }>) || {};
                    const val = cs[key];
                    return (
                      <td key={cid} className="py-2 px-3 text-center">
                        {val ? (
                          <div>
                            <span className="font-semibold text-foreground">{val.score}</span>
                            <div className="mt-1 h-1.5 w-full max-w-[80px] mx-auto rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${val.score}%` }} />
                            </div>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* AI Summary */}
              <tr className="border-b border-border">
                <td className="py-2 px-3 text-muted-foreground">Resumo IA</td>
                {candidateIds.map((cid) => (
                  <td key={cid} className="py-2 px-3 text-xs text-muted-foreground">
                    {getScore(cid)?.ai_summary || "—"}
                  </td>
                ))}
              </tr>

              {/* Screening */}
              {getScreening(candidateIds[0])?.answers?.map((a: any, idx: number) => (
                <tr key={idx} className="border-b border-border">
                  <td className="py-2 px-3 text-xs text-muted-foreground">{a.screening_questions?.question}</td>
                  {candidateIds.map((cid) => {
                    const sa = getScreening(cid)?.answers?.[idx] as any;
                    return (
                      <td key={cid} className="py-2 px-3 text-xs text-foreground">
                        {sa?.answer || "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}
