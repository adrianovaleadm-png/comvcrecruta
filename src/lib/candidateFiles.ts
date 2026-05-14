import { supabase } from "@/integrations/supabase/client";

/**
 * Gera uma URL assinada (signed URL) para um arquivo do bucket privado
 * candidate-files. A URL expira em 1 hora — sempre gerar uma nova no
 * momento de exibir/baixar.
 *
 * @param path Caminho relativo dentro do bucket (ex: "<candidate_id>/<timestamp>.pdf")
 * @returns URL assinada pronta para uso, ou null em caso de erro.
 */
export async function getCandidateFileSignedUrl(path: string): Promise<string | null> {
  // Defensivo: se por engano vier uma URL completa, extrai o path.
  const normalized = path.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(public|sign)\/candidate-files\//, "");

  const { data, error } = await supabase
    .storage
    .from("candidate-files")
    .createSignedUrl(normalized, 3600); // 1 hora

  if (error || !data) {
    console.error("createSignedUrl error:", error);
    return null;
  }
  return data.signedUrl;
}
