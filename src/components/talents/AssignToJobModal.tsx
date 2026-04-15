import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  candidateId: string;
}

interface Job {
  id: string;
  title: string;
  status: string;
}

interface Stage {
  id: string;
  name: string;
  order_index: number;
}

export default function AssignToJobModal({ open, onClose, candidateId }: Props) {
  const queryClient = useQueryClient();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedJob(""); setSelectedStage(""); setStages([]);
    supabase.from("jobs").select("id, title, status").eq("status", "open").order("created_at", { ascending: false })
      .then(({ data }) => setJobs(data || []));
  }, [open]);

  useEffect(() => {
    if (!selectedJob) { setStages([]); setSelectedStage(""); return; }
    supabase.from("stages").select("*").eq("job_id", selectedJob).order("order_index")
      .then(({ data }) => {
        setStages(data || []);
        const first = data?.find((s) => s.order_index === Math.min(...(data.map((s) => s.order_index))));
        if (first) setSelectedStage(first.id);
      });
  }, [selectedJob]);

  const handleSave = async () => {
    if (!selectedJob || !selectedStage) { toast.error("Selecione vaga e etapa."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("applications").insert({
        job_id: selectedJob,
        candidate_id: candidateId,
        stage_id: selectedStage,
        status: "active",
      });
      if (error) throw error;
      toast.success("Candidato adicionado à vaga!");
      queryClient.invalidateQueries({ queryKey: ["talent-applications", candidateId] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao indicar candidato.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Indicar para Vaga</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Vaga</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
            >
              <option value="">Selecione uma vaga...</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>
          {stages.length > 0 && (
            <div>
              <Label>Etapa inicial</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <Button className="w-full" onClick={handleSave} disabled={saving || !selectedJob}>
            {saving ? "Salvando..." : "Confirmar indicação"}
          </Button>
        </div>
      </div>
    </div>
  );
}
