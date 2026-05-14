import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Política de Privacidade</h1>
            <p className="text-xs text-muted-foreground">Versão v1 — 14 de maio de 2026</p>
          </div>
        </div>

        <article className="prose prose-sm max-w-none text-foreground space-y-5">
          <p>
            Esta Política de Privacidade descreve como a <strong>COM VOCE SCALA</strong> coleta,
            usa, armazena e protege os dados pessoais dos candidatos que utilizam a plataforma{" "}
            <strong>com você, Recruta.</strong>, em conformidade com a Lei Geral de Proteção de
            Dados (Lei nº 13.709/2018 — LGPD).
          </p>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">1. Controlador dos dados</h2>
            <p>
              <strong>COM VOCE SCALA</strong>, doravante denominada "Controladora", é responsável
              pelo tratamento dos seus dados pessoais coletados nesta plataforma.
              <br />
              Contato do encarregado (DPO): a definir.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">2. Quais dados coletamos</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Dados de identificação: nome completo, e-mail, telefone, cidade</li>
              <li>Dados profissionais: URL do LinkedIn, currículo (CV), resumo profissional, habilidades</li>
              <li>Respostas às perguntas de triagem da vaga</li>
              <li>Histórico de candidaturas e movimentação no processo seletivo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">3. Finalidades do tratamento</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Análise de aderência do seu perfil à vaga em questão</li>
              <li>Comunicação sobre o andamento do processo seletivo</li>
              <li>Avaliação automatizada com apoio de Inteligência Artificial (score de fit)</li>
              <li>Manutenção no banco de talentos da Controladora, para futuras oportunidades</li>
              <li>Cumprimento de obrigações legais e regulatórias</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">4. Base legal</h2>
            <p>
              O tratamento dos seus dados está fundamentado no <strong>consentimento</strong>{" "}
              (art. 7º, I da LGPD) que você fornece ao marcar o aceite no formulário de
              candidatura, e na <strong>execução de procedimentos preliminares a contrato</strong>{" "}
              (art. 7º, V) inerentes ao processo seletivo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">5. Compartilhamento</h2>
            <p>
              Seus dados poderão ser compartilhados com:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Equipe interna de Recrutamento e Seleção e gestores das vagas em que você se inscrever</li>
              <li>Provedores de infraestrutura (hospedagem, armazenamento) sob contrato de confidencialidade</li>
              <li>Provedores de Inteligência Artificial utilizados para análise de aderência</li>
            </ul>
            <p className="mt-2">
              Não compartilhamos seus dados com terceiros para fins comerciais ou de marketing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">6. Prazo de retenção</h2>
            <p>
              Seus dados serão mantidos enquanto o processo seletivo estiver ativo e,
              após o encerramento, por até <strong>24 meses</strong> no banco de talentos,
              salvo se você solicitar a exclusão antes desse prazo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">7. Seus direitos como titular</h2>
            <p>Conforme a LGPD, você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Confirmar a existência de tratamento</li>
              <li>Acessar seus dados</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários</li>
              <li>Solicitar a portabilidade dos dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
              <li>Pedir a eliminação dos dados tratados com base em consentimento</li>
            </ul>
            <p className="mt-2">
              Para exercer qualquer um desses direitos, envie um e-mail para o canal de contato
              indicado no item 1.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">8. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados contra
              acessos não autorizados, perda acidental, alteração ou destruição.
              Utilizamos provedores reconhecidos para hospedagem e criptografia em trânsito.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">9. Alterações nesta Política</h2>
            <p>
              Esta Política pode ser atualizada periodicamente. Mudanças relevantes serão
              comunicadas e poderão exigir novo consentimento. A versão vigente está
              sempre identificada no topo desta página.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">10. Contato</h2>
            <p>
              Em caso de dúvidas sobre esta Política ou sobre o tratamento dos seus dados,
              entre em contato pelo canal oficial da COM VOCE SCALA.
            </p>
          </section>

          <div className="mt-10 p-4 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
            <strong>Aviso:</strong> este documento é um modelo inicial. A redação final deve
            ser revisada por profissional jurídico antes de uso em produção com candidatos reais.
          </div>
        </article>
      </div>
    </div>
  );
}
