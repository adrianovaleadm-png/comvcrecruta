import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface FitScoreBadgeProps {
  score: number | null | undefined;
  candidateId: string;
  jobId: string;
  compact?: boolean;
}

function getScoreColor(score: number) {
  if (score >= 70) return "bg-success/10 text-success border-success/30";
  if (score >= 40) return "bg-warning/10 text-warning border-warning/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

export default function FitScoreBadge({ score, candidateId, jobId, compact = false }: FitScoreBadgeProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const evaluate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("score-candidate-job", {
        body: { candidate_id: candidateId, job_id: jobId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Fit Score: ${data.overall_score}%`);
      queryClient.invalidateQueries({ queryKey: ["candidate-scores"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-scores"] });
      queryClient.invalidateQueries({ queryKey: ["job-ranking"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao avaliar fit.");
    } finally {
      setLoading(false);
    }
  };

  if (score != null) {
    return (
      <Badge variant="outline" className={`${getScoreColor(score)} cursor-pointer`} onClick={evaluate} title="Clique para reavaliar">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : `${score}%`}
      </Badge>
    );
  }

  if (compact) {
    return (
      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-muted-foreground" onClick={evaluate} disabled={loading}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Sparkles className="h-3 w-3" /> Fit</>}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={evaluate} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      Avaliar Fit
    </Button>
  );
}
