import { Construction } from "lucide-react";

interface Props {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground mb-1">{title}</h1>
      <p className="text-sm text-muted-foreground mb-8">{description}</p>

      <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center text-center">
        <Construction className="w-10 h-10 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-card-foreground mb-1">Em breve</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Esta funcionalidade está sendo desenvolvida e estará disponível em uma próxima atualização.
        </p>
      </div>
    </div>
  );
}
