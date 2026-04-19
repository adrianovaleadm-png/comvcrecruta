
O usuário quer testar o fluxo do candidato. Já existe a página pública `/vaga/:id/candidatar` implementada. Preciso explicar como acessá-la.

Olhando o código:
- Rota: `/vaga/:id/candidatar` (PublicApplication.tsx)
- Requer que a vaga tenha `status = 'open'`
- Não requer login

O problema: não há link visível em lugar nenhum para o recrutador copiar/compartilhar essa URL pública. Atualmente o recrutador precisa montar a URL manualmente pegando o ID da vaga.

Vou propor adicionar um botão "Copiar link público" na página de detalhe da vaga (`JobDetail.tsx`) e na lista de vagas, para facilitar.
