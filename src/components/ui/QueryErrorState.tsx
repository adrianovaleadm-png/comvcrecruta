import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
}

/**
 * Estado de erro padronizado para páginas com useQuery.
 * Usa em conjunto com { isError, refetch } do @tanstack/react-query.
 */
export default function QueryErrorState({
  title = "Não conseguimos carregar os dados",
  description = "Verifique sua conexão ou tente novamente. Se o problema persistir, avise o suporte.",
  error,
  onRetry,
}: Props) {
  const errMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : null;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 py-12 px-6 text-center">
      <AlertTriangle className="mb-3 h-10 w-10 text-destructive" />
      <p className="mb-1 text-lg font-semibold text-foreground">{title}</p>
      <p className="mb-4 max-w-md text-sm text-muted-foreground">{description}</p>
      {errMessage && (
        <p className="mb-4 max-w-md rounded-md bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
          {errMessage}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
        </Button>
      )}
    </div>
  );
}
