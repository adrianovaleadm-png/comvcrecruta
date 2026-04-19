
O usuário quer uma aba dedicada de "Cultura" mais rica que apenas missão/visão/valores. Vou propor campos adicionais comuns em employer branding.

## Plano: Aba dedicada de Cultura da Empresa

### 1. Banco de dados — novas colunas em `companies`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `missao` | text | Propósito da empresa |
| `visao` | text | Onde quer chegar |
| `valores` | text | Um valor por linha |
| `proposito` | text | "Por que existimos" (manifesto) |
| `ambiente_trabalho` | text | Como é o dia a dia |
| `beneficios` | text[] | Lista de benefícios (vale, plano, home office...) |
| `diferenciais` | text[] | O que torna a empresa única |
| `politicas_dei` | text | Diversidade, equidade e inclusão |
| `modelo_trabalho` | text | Remoto / Híbrido / Presencial (padrão) |
| `linkedin_url` | text | Rede social institucional |
| `instagram_url` | text | Rede social institucional |

### 2. Página `/app/empresa` com **abas**
Estrutura usando `Tabs` do shadcn:

```text
┌─ Perfil da Empresa ────────────────────────┐
│ [Geral] [Cultura] [Benefícios] [Redes]     │
├────────────────────────────────────────────┤
│                                            │
│ ABA GERAL                                  │
│   Logo, Nome fantasia, Razão social,       │
│   CNPJ, Setor, Tamanho, Endereço,          │
│   Telefone, Website, Descrição curta       │
│                                            │
│ ABA CULTURA                                │
│   Propósito (manifesto)                    │
│   Missão                                   │
│   Visão                                    │
│   Valores (um por linha)                   │
│   Ambiente de trabalho                     │
│   Diferenciais (chips editáveis)           │
│   Políticas DEI                            │
│   Modelo de trabalho padrão                │
│                                            │
│ ABA BENEFÍCIOS                             │
│   Lista editável (chips/tags)              │
│   Sugestões rápidas: VR, VA, Plano saúde,  │
│   Plano odonto, Gympass, Home office...    │
│                                            │
│ ABA REDES SOCIAIS                          │
│   LinkedIn, Instagram, Website             │
└────────────────────────────────────────────┘
```

### 3. Exibição na **página pública de candidatura**
`PublicApplication.tsx` ganha um card "Sobre a empresa" com tabs ou seções:
- Cabeçalho: logo + nome + setor + descrição
- Cultura: propósito, missão, visão, valores
- Benefícios: lista visual com ícones
- Redes sociais: links

### 4. Arquivos afetados
| Arquivo | Ação |
|---------|------|
| Migration SQL | Adicionar 11 colunas em `companies` |
| `src/pages/app/CompanyProfile.tsx` | Criar com 4 abas |
| `src/App.tsx` | Rota `/app/empresa` |
| `src/components/AppSidebar.tsx` | Item "Empresa" na seção ADMINISTRADOR |
| `src/pages/app/PublicApplication.tsx` | Card "Sobre a empresa" expandido |

### Resultado
Empresa tem perfil completo organizado em abas (Geral / Cultura / Benefícios / Redes), com conteúdo de employer branding exibido automaticamente em cada vaga pública.
