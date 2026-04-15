import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export interface ScoreWeights {
  experiencia: number;
  habilidades_tecnicas: number;
  localizacao: number;
  senioridade: number;
  soft_skills: number;
  triagem: number;
}

const LABELS: Record<keyof ScoreWeights, string> = {
  experiencia: "Experiência",
  habilidades_tecnicas: "Habilidades Técnicas",
  localizacao: "Localização",
  senioridade: "Senioridade",
  soft_skills: "Soft Skills",
  triagem: "Triagem",
};

const PRESETS: Record<string, ScoreWeights> = {
  padrao: { experiencia: 20, habilidades_tecnicas: 20, localizacao: 15, senioridade: 15, soft_skills: 15, triagem: 15 },
  tecnico: { experiencia: 15, habilidades_tecnicas: 40, localizacao: 5, senioridade: 15, soft_skills: 5, triagem: 20 },
  cultural: { experiencia: 10, habilidades_tecnicas: 10, localizacao: 10, senioridade: 10, soft_skills: 30, triagem: 30 },
};

interface Props {
  weights: ScoreWeights;
  onChange: (w: ScoreWeights) => void;
}

export default function ScoreWeightsConfig({ weights, onChange }: Props) {
  const total = Object.values(weights).reduce((s, v) => s + v, 0);

  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

  const updateKey = (key: keyof ScoreWeights, val: number) => {
    onChange({ ...weights, [key]: val });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Pesos do Fit Score</h3>
        <div className="flex gap-1">
          {Object.entries(PRESETS).map(([name, preset]) => (
            <Button key={name} type="button" variant="outline" size="sm" className="h-6 text-xs capitalize" onClick={() => onChange(preset)}>
              {name === "padrao" ? "Padrão" : name === "tecnico" ? "Técnico" : "Cultural"}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {(Object.keys(LABELS) as (keyof ScoreWeights)[]).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-36 text-xs text-muted-foreground">{LABELS[key]}</span>
            <Slider
              value={[weights[key]]}
              onValueChange={([v]) => updateKey(key, v)}
              min={0}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="w-12 text-right text-xs font-medium text-foreground">{pct(weights[key])}%</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Os valores são proporcionais. Score final = Σ(score × peso) / Σ(pesos).
      </p>
    </div>
  );
}
