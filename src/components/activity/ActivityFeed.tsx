import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Briefcase, UserCheck, UserX, ArrowRightLeft, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ICONS: Record<string, typeof Activity> = {
  created: Plus,
  status_changed: UserCheck,
  stage_changed: ArrowRightLeft,
};

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days}d`;
}

interface Props {
  entityId?: string;
  entityType?: string;
  limit?: number;
  title?: string;
}

export default function ActivityFeed({ entityId, entityType, limit = 15, title = "Atividade Recente" }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["activity-feed", entityId, entityType, limit],
    queryFn: async () => {
      let query = supabase
        .from("activity_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (entityId) query = query.eq("entity_id", entityId);
      if (entityType) query = query.eq("entity_type", entityType);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
      ) : (
        <div className="space-y-3">
          {data.map((ev) => {
            const Icon = ICONS[ev.type] || Activity;
            return (
              <div key={ev.id} className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
                  <Icon className="h-3 w-3 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-card-foreground">{ev.message}</p>
                  <p className="text-xs text-muted-foreground">{relativeTime(ev.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
