import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Video, Copy, Check, Phone, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  applicationId: string;
  checklistItemId: string;
  onScheduled?: () => void;
}

type Modality = "presencial" | "online";

function phoneToWhatsapp(phone: string): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  return "55" + digits;
}

function formatDateBR(dateIso: string): string {
  if (!dateIso) return "";
  const [y, m, d] = dateIso.split("-");
  if (!y || !m || !d) return dateIso;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
  const formatted = `${d}/${m}/${y}`;
  return `${weekday}, ${formatted}`;
}

export default function ScheduleInterviewModal({
  open,
  onOpenChange,
  applicationId,
  checklistItemId,
  onScheduled,
}: Props) {
  const queryClient = useQueryClient();
  const { company, profile } = useAuth();

  const [modality, setModality] = useState<Modality>("presencial");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [link, setLink] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [duration, setDuration] = useState("45");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carrega contexto: candidato + vaga + empresa (via FK da vaga, mais confiavel
  // que AuthContext que pode estar desatualizado em alguns casos).
  const { data: ctx } = useQuery({
    queryKey: ["schedule-context", applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "id, candidate_id, job_id, " +
          "candidates(name, phone), " +
          "jobs(title, companies(nome_fantasia, endereco))"
        )
        .eq("id", applicationId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!applicationId && open,
  });

  // Fontes preferenciais: dados frescos vindos da query; fallback para AuthContext.
  const fetchedCompany = ctx?.jobs?.companies ?? null;
  const companyName = fetchedCompany?.nome_fantasia ?? company?.nome_fantasia ?? "";
  const companyAddress = fetchedCompany?.endereco ?? company?.endereco ?? "";

  // Pré-preenche endereço e entrevistador quando os dados ficam disponíveis.
  useEffect(() => {
    if (open && companyAddress && !address) {
      setAddress(companyAddress);
    }
    if (open && profile?.full_name && !interviewer) {
      setInterviewer(profile.full_name);
    }
  }, [open, companyAddress, profile, address, interviewer]);

  const candidateName = ctx?.candidates?.name ?? "candidato(a)";
  const candidatePhone = ctx?.candidates?.phone ?? "";
  const jobTitle = ctx?.jobs?.title ?? "a vaga";
  const whatsappNumber = phoneToWhatsapp(candidatePhone);

  const message = useMemo(() => {
    if (!date || !time) return "";
    const dateFmt = formatDateBR(date);
    const senderName = profile?.full_name || "";
    // Fallback amigavel: se o nome da empresa ainda nao carregou, ao inves
    // de aparecer "nossa empresa" usamos uma frase neutra.
    const companyClause = companyName ? `da ${companyName}` : "do time de Recrutamento";
    const lines: string[] = [];
    lines.push(`Olá, ${candidateName}!`);
    lines.push("");
    lines.push(`Tudo bem? Aqui é ${senderName || "do RH"}, ${companyClause}.`);
    lines.push("");
    lines.push(`Você foi selecionado(a) para a próxima etapa do nosso processo para a vaga de *${jobTitle}*.`);
    lines.push("");
    lines.push(`Sua entrevista está agendada:`);
    lines.push("");
    lines.push(`*Data:* ${dateFmt}`);
    lines.push(`*Horário:* ${time}`);
    if (modality === "presencial" && address) {
      lines.push(`*Local:* ${address}`);
    } else if (modality === "online" && link) {
      lines.push(`*Link:* ${link}`);
    }
    if (interviewer) {
      lines.push(`*Com:* ${interviewer}`);
    }
    lines.push(`*Duração estimada:* ${duration} minutos`);
    lines.push("");
    if (modality === "online") {
      lines.push("Sugestão: teste seu microfone, câmera e conexão alguns minutos antes do horário.");
      lines.push("");
    }
    lines.push("Por favor, *confirme sua presença* respondendo esta mensagem.");
    lines.push("");
    lines.push("Qualquer dúvida estou à disposição.");
    lines.push("");
    lines.push("Atenciosamente,");
    if (senderName) lines.push(senderName);
    if (companyName) lines.push(companyName);
    return lines.join("\n");
  }, [date, time, address, link, interviewer, duration, modality, candidateName, jobTitle, companyName, profile]);

  const isValid = !!date && !!time && (modality === "online" ? !!link : !!address);

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Mensagem copiada.");
  };

  const openWhatsapp = () => {
    if (!whatsappNumber) {
      toast.error("Candidato sem telefone cadastrado.");
      return;
    }
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const confirmSchedule = async () => {
    if (!isValid) {
      toast.error("Preencha data, hora e " + (modality === "online" ? "link." : "endereço."));
      return;
    }
    setSaving(true);
    try {
      // 1) marca o item do checklist como concluído
      const { error: e1 } = await supabase
        .from("application_checklist")
        .update({ concluido: true, concluido_em: new Date().toISOString() })
        .eq("id", checklistItemId);
      if (e1) throw e1;

      // 2) registra evento na timeline
      const dateFmt = formatDateBR(date);
      const { error: e2 } = await supabase.from("activity_events").insert({
        type: "interview_scheduled",
        entity_type: "application",
        entity_id: applicationId,
        message:
          `Entrevista ${modality} agendada para ${dateFmt} às ${time}` +
          (interviewer ? ` com ${interviewer}` : ""),
        metadata: {
          modality,
          date,
          time,
          address: modality === "presencial" ? address : null,
          link: modality === "online" ? link : null,
          interviewer,
          duration_minutes: Number(duration) || null,
          candidate_phone: candidatePhone || null,
        },
      });
      if (e2) throw e2;

      queryClient.invalidateQueries({ queryKey: ["app-checklist", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["drawer-application", applicationId] });
      toast.success("Agendamento registrado.");
      onScheduled?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar agendamento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Agendar entrevista
          </DialogTitle>
          <DialogDescription>
            Para <strong>{candidateName}</strong>{candidatePhone ? ` · ${candidatePhone}` : " · sem telefone"}
            {" · "}vaga: <strong>{jobTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Modalidade */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase font-semibold text-muted-foreground">Modalidade</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModality("presencial")}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  modality === "presencial"
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <MapPin className="h-4 w-4" /> Presencial
              </button>
              <button
                type="button"
                onClick={() => setModality("online")}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  modality === "online"
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Video className="h-4 w-4" /> Online
              </button>
            </div>
          </div>

          {/* Data + hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-date" className="text-xs uppercase font-semibold text-muted-foreground">Data</Label>
              <Input
                id="schedule-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-time" className="text-xs uppercase font-semibold text-muted-foreground">Hora</Label>
              <Input
                id="schedule-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Endereço ou link */}
          {modality === "presencial" ? (
            <div className="space-y-1.5">
              <Label htmlFor="schedule-address" className="text-xs uppercase font-semibold text-muted-foreground">
                Endereço {company?.endereco ? "(pré-preenchido com endereço da empresa)" : ""}
              </Label>
              <Input
                id="schedule-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="schedule-link" className="text-xs uppercase font-semibold text-muted-foreground">Link da reunião</Label>
              <Input
                id="schedule-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://meet.google.com/... ou https://zoom.us/j/..."
              />
            </div>
          )}

          {/* Entrevistador + duração */}
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-interviewer" className="text-xs uppercase font-semibold text-muted-foreground">Entrevistador</Label>
              <Input
                id="schedule-interviewer"
                value={interviewer}
                onChange={(e) => setInterviewer(e.target.value)}
                placeholder="Nome de quem vai conduzir"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-duration" className="text-xs uppercase font-semibold text-muted-foreground">Duração (min)</Label>
              <Input
                id="schedule-duration"
                type="number"
                min="15"
                step="15"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          {/* Preview da mensagem */}
          {isValid && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Mensagem pronta para WhatsApp
                </Label>
              </div>
              <pre className="whitespace-pre-wrap font-sans rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground max-h-64 overflow-y-auto">
                {message}
              </pre>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={copyMessage}>
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiada" : "Copiar mensagem"}
                </Button>
                {whatsappNumber && (
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 bg-[#25D366] hover:bg-[#1ebe57] text-white"
                    onClick={openWhatsapp}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Abrir no WhatsApp
                  </Button>
                )}
                {!whatsappNumber && candidatePhone && (
                  <span className="text-xs text-muted-foreground self-center">
                    Telefone inválido para WhatsApp.
                  </span>
                )}
                {!candidatePhone && (
                  <span className="text-xs text-muted-foreground self-center">
                    Sem telefone — só dá pra copiar a mensagem.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={confirmSchedule} disabled={!isValid || saving} className="gap-1.5">
              <Clock className="h-4 w-4" />
              {saving ? "Salvando..." : "Confirmar agendamento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
