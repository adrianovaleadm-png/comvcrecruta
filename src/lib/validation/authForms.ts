import { z } from "zod";

/**
 * Schemas Zod compartilhados entre Signup e Onboarding.
 *
 * Convencao: schemas retornam sempre dados TRIMADOS quando aplicavel.
 * Todos os textos de erro em pt-BR.
 */

// ============== SIGNUP ==============

// Fields comuns a todos os user_types no step 1
const step1Common = {
  fullName: z.string().trim().min(1, "Nome completo é obrigatório").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(72, "Senha muito longa"),
  confirmPassword: z.string(),
};

const passwordsMatch = (data: { password: string; confirmPassword: string }) =>
  data.password === data.confirmPassword;

const passwordsMatchOpts = {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"] as [string],
};

/** Step 1 para user_type = candidato ou recrutador (sem campo cargo obrigatório) */
export const signupStep1CandidatoSchema = z
  .object(step1Common)
  .refine(passwordsMatch, passwordsMatchOpts);

/** Step 1 para user_type = empresa (adiciona cargo) */
export const signupStep1EmpresaSchema = z
  .object({
    ...step1Common,
    cargo: z.string().trim().min(1, "Cargo é obrigatório").max(120),
  })
  .refine(passwordsMatch, passwordsMatchOpts);

/**
 * Valida CNPJ com base em comprimento (14 dígitos após remover
 * mascara). Não valida os dígitos verificadores — validação
 * matemática de CNPJ pode ser adicionada em futuro PR.
 */
const cnpjRule = z
  .string()
  .trim()
  .refine((v) => v.replace(/\D/g, "").length === 14, "CNPJ deve ter 14 dígitos");

/** Step 2 para user_type = empresa */
export const signupStep2Schema = z.object({
  nomeFantasia: z.string().trim().min(1, "Nome fantasia é obrigatório").max(120),
  razaoSocial: z.string().trim().min(1, "Razão social é obrigatória").max(200),
  cnpj: cnpjRule,
  setor: z.string().trim().max(80).optional().or(z.literal("")),
  tamanho: z.string().trim().max(40).optional().or(z.literal("")),
  website: z
    .string()
    .trim()
    .max(200)
    .refine(
      (v) => v === "" || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+/.test(v),
      "URL de website inválida"
    )
    .optional()
    .or(z.literal("")),
});

// ============== ONBOARDING ==============

/**
 * Formato brasileiro de telefone. Aceita variações:
 * (11) 99999-9999, 11999999999, +55 11 99999-9999.
 * Regra: pelo menos 10 e no máximo 14 dígitos.
 * Deixamos opcional — quem não preencher, não é validado.
 */
const telefoneOpcionalBR = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (v.replace(/\D/g, "").length >= 10 && v.replace(/\D/g, "").length <= 14),
    "Telefone deve ter entre 10 e 14 dígitos"
  )
  .optional()
  .or(z.literal(""));

export const onboardingSchema = z.object({
  descricao: z.string().trim().max(1000, "Descrição muito longa").optional().or(z.literal("")),
  endereco: z.string().trim().max(300).optional().or(z.literal("")),
  telefone: telefoneOpcionalBR,
});

// ============== HELPER ==============

/**
 * Extrai um mapa { field: mensagem_de_erro } a partir do resultado
 * de safeParse do Zod. Se validação passou, retorna null.
 * Se falhou, retorna um objeto com o primeiro erro de cada campo.
 */
export function zodErrorsToFieldMap(
  result: { success: false; error: z.ZodError } | { success: true; data: unknown }
): Record<string, string> | null {
  if (result.success) return null;
  const map: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_root";
    if (!map[key]) map[key] = issue.message;
  }
  return map;
}
