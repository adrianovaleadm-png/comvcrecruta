

## Plano: Restaurar Index como página inicial

### Objetivo
Remover o redirecionamento automático da rota raiz ("/") para "/app", fazendo com que `src/pages/Index.tsx` volte a ser a porta de entrada do site.

### Alterações em src/App.tsx

1. **Linha 2** — Remover `Navigate` do import (não é mais usado):
   ```typescript
   import { BrowserRouter, Route, Routes } from "react-router-dom";
   ```

2. **Linha 34** — Substituir o redirecionamento pela renderização do componente Index:
   ```typescript
   <Route path="/" element={<Index />} />
   ```

### Guardrails respeitados
- Nenhuma outra rota alterada
- Conteúdo de `src/pages/Index.tsx` preservado
- Providers mantidos na ordem original
- Apenas o import de Navigate removido (sem outros usos no arquivo)

