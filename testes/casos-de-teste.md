# Casos de teste do Gerenciador de Escalas

## CT-001 — Login com credenciais válidas

- **Tipo:** Teste de sistema
- **Situação:** APROVADO
- **Data da execução:** 22/11/2026
- **Procedimento:** Abrir a página de login, informar credenciais válidas e entrar no sistema.
- **Entrada:** E-mail cadastrado e senha correta.
- **Resultado esperado:** Acesso à página inicial.
- **Resultado obtido:** Carregamento do painel Empresa Teste com os menus Colaboradores, Escalas e Funções, sem erros aparentes.
- **Caminho da captura de tela:** [CT-001-login-valido.png](evidencias/CT-001-login-valido.png)

## CT-002 — Login com senha inválida

- **Tipo:** Teste de sistema
- **Situação:** APROVADO
- **Data da execução:** 22/11/2026
- **Procedimento:** Abrir a página de login, informar um e-mail cadastrado e uma senha incorreta e tentar entrar.
- **Entrada:** E-mail cadastrado e senha incorreta.
- **Resultado esperado:** Recusar a autenticação, exibir uma mensagem de erro e manter a página de login.
- **Resultado obtido:** A autenticação foi recusada. O sistema exibiu “Não foi possível fazer login — INVALID_LOGIN_CREDENTIALS” e permaneceu na tela de login.
- **Caminho da captura de tela:** [CT-002-senha-incorreta.png](evidencias/CT-002-senha-incorreta.png)

## CT-003 — Acesso a página interna sem autenticação

- **Tipo:** Teste de sistema
- **Situação:** APROVADO
- **Data da execução:** 22/11/2026
- **Procedimento:** Sem iniciar sessão, abrir diretamente uma página interna e clicar em OK no aviso.
- **Entrada:** URL de uma página interna, sem sessão autenticada.
- **Resultado esperado:** Bloquear o acesso à página interna, exibir um aviso e redirecionar ao login após a confirmação.
- **Resultado obtido:** O sistema exibiu “Sessão expirada. Faça login novamente.” e redirecionou ao login após clicar em OK.
- **Caminho da captura de tela:** [CT-003-acesso-sem-autenticacao.png](evidencias/CT-003-acesso-sem-autenticacao.png)

## CT-004 — Expiração de sessão

- **Tipo:** Teste de sistema
- **Situação:** APROVADO
- **Data da execução:** 22/11/2026
- **Procedimento:** Entrar com credenciais válidas, alterar manualmente `tokenExpiresAt` para `0` no Local Storage, atualizar a página e clicar em OK no aviso.
- **Entrada:** Credenciais válidas e valor `0` para `tokenExpiresAt` no Local Storage.
- **Resultado esperado:** Detectar a expiração da sessão, exibir um aviso e redirecionar ao login após a confirmação.
- **Resultado obtido:** O sistema detectou a expiração, exibiu um aviso e redirecionou ao login após clicar em OK.
- **Caminho da captura de tela:** [CT-004-expiracao-de-sessao.png](evidencias/CT-004-expiracao-de-sessao.png)

## CT-005 — Consulta de colaboradores

- **Tipo:** Teste de sistema
- **Situação atual:** APROVADO
- **Procedimento:** Com uma sessão ativa, abrir **Colaboradores** e consultar a lista.
- **Entrada:** Colaborador Mario, código 2, previamente cadastrado.
- **Resultado esperado:** A consulta exibe Mario com o código 2.
- **Defeito vinculado:** DF-001.

| Execução | Data | Situação | Resultado obtido | Evidência |
| --- | --- | --- | --- | --- |
| 1ª | Data não registrada | REPROVADO | A consulta exibiu “Não foi possível validar o token ou consultar a API registradora”. | [CT-005-erro-consulta.png](evidencias/CT-005-erro-consulta.png) |
| 2ª | 22/11/2026 | APROVADO | Mario, código 2, apareceu corretamente na consulta. | [CT-005-consulta-corrigida.png](evidencias/CT-005-consulta-corrigida.png) |

## DF-001 — Erro na consulta de colaboradores

- **Situação:** CORRIGIDO
- **Causa verificada:** Em `ApiGerenciador/ApiGerenciador.js`, a rota `GET /consultausuario` chamava a função inexistente `obterUserId(token)`. A exceção era capturada e retornava HTTP 503 com a mensagem genérica da primeira execução.
- **Correção verificada:** A rota passou a usar `obterUidAutenticado(request, reply)`, o validador existente. A rota retorna HTTP 401 quando a sessão não pode ser validada e encaminha a consulta à ApiRegistrador quando obtém um UID válido.
- **Verificação:** Segunda execução do CT-005, aprovada em 22/11/2026.

## CT-006 — Validação de cadastro inválido

- **Tipo:** Teste de sistema
- **Data da execução:** 22/11/2026
- **Situação:** APROVADO
- **Tela:** Cadastro de colaboradores.

| Subteste | Procedimento | Entrada | Resultado esperado | Resultado obtido | Situação | Evidência |
| --- | --- | --- | --- | --- | --- | --- |
| CT-006A | Deixar o nome em branco, preencher os demais campos com valores válidos e tentar salvar. | Nome vazio. | Bloquear o cadastro e informar que os dados estão incompletos. | Cadastro bloqueado. Mensagem exibida: “Dados incompletos — Preencha os campos obrigatórios com valores válidos”. | APROVADO | Sem captura na pasta de evidências |
| CT-006B | Informar um e-mail sem `@`, preencher os demais campos com valores válidos e tentar salvar. | E-mail sem `@`. | Bloquear o cadastro e informar que os dados estão incompletos. | Cadastro bloqueado. Mensagem exibida: “Dados incompletos — Preencha os campos obrigatórios com valores válidos”. | APROVADO | Sem captura na pasta de evidências |
| CT-006C | Deixar a senha em branco, preencher os demais campos com valores válidos e tentar salvar. | Senha vazia. | Bloquear o cadastro e informar que os dados estão incompletos. | Cadastro bloqueado. Mensagem exibida: “Dados incompletos — Preencha os campos obrigatórios com valores válidos”. | APROVADO | [CT-006C-senha-vazia.png](evidencias/CT-006C-senha-vazia.png) |

## CT-007 — Cadastro de funções

- **Tipo:** Teste de sistema
- **Data da execução:** 22/11/2026
- **Situação:** APROVADO
- **Entrada:** Descrição `supervisor`.
- **Procedimento:** Acessar **Funções**, clicar em **Incluir**, preencher a descrição, salvar e consultar a função cadastrada.
- **Resultado esperado:** Cadastrar a função, gerar um código e permitir sua consulta.
- **Resultado obtido:** O sistema confirmou o cadastro com o código 4 e exibiu a função `supervisor` com o código 4 na consulta.
- **Evidência da consulta:** [CT-007-consulta-funcao.png](evidencias/CT-007-consulta-funcao.png).

## CT-008 — Consulta de colaboradores e funções

- **Tipo:** Teste de sistema
- **Data da execução:** 22/11/2026
- **Situação:** APROVADO

| Subteste | Procedimento | Resultado esperado | Resultado obtido | Situação | Evidência |
| --- | --- | --- | --- | --- | --- |
| CT-008A | Abrir **Colaboradores** e pesquisar por nome usando `mario`. | Exibir somente Mario, código 2. | A consulta retornou somente Mario, código 2. | APROVADO | [CT-008A-filtro-nome.png](evidencias/CT-008A-filtro-nome.png) |
| CT-008B | Abrir **Colaboradores** e pesquisar por código usando `2`. | Exibir somente Mario, código 2. | A consulta retornou somente Mario, código 2. | APROVADO | Sem captura na pasta de evidências |
| CT-008C | Abrir **Funções** e pesquisar por descrição usando `supervisor`. | Exibir somente supervisor, código 4. | A consulta retornou somente supervisor, código 4. | APROVADO | Sem captura na pasta de evidências |
| CT-008D | Abrir **Funções** e pesquisar por código usando `4`. | Exibir somente supervisor, código 4. | A consulta retornou somente supervisor, código 4. | APROVADO | [CT-008D-filtro-codigo-funcao.png](evidencias/CT-008D-filtro-codigo-funcao.png) |

## CT-009 — Cadastro manual de escalas

- **Tipo:** Teste de sistema
- **Data da execução:** 22/11/2026
- **Situação:** APROVADO
- **Entrada:** Data 26/11/2026, período Manhã, função Auxiliar e colaborador Mario.
- **Procedimento:** Cadastrar a escala manualmente com os dados informados, salvar e consultar a escala cadastrada.
- **Resultado esperado:** Salvar a escala e permitir sua consulta.
- **Resultado obtido:** O cadastro exibiu o status **Salva**. A consulta exibiu a escala de código 1, data 26/11/2026, período Manhã e 1 colaborador.
- **Evidência do cadastro:** [CT-009-cadastro-escala.png](evidencias/CT-009-cadastro-escala.png).
- **Evidência da consulta:** [CT-009-consulta-escala.png](evidencias/CT-009-consulta-escala.png).

## CT-010 — Geração de escalas com inteligência artificial

- **Tipo:** Teste de sistema
- **Data da execução:** 22/11/2026
- **Situação final:** APROVADO
- **Escala:** 23/11/2026, período Tarde, função Auxiliar, colaborador Mario.

### Procedimento

1. Acessar o cadastro de escalas.
2. Configurar 23/11/2026, período Tarde e função Auxiliar.
3. Clicar em Gerar com IA, confirmar que 1 vaga foi preenchida e conferir que Mario foi selecionado.
4. Clicar em Salvar escalas e confirmar o sucesso do salvamento.
5. Abrir a consulta de escalas e verificar a escala salva.

- **Resultado esperado:** Gerar uma escala com 1 vaga preenchida, salvar a escala e permitir sua consulta.
- **Resultado obtido:** A geração preencheu 1 vaga com Mario. O salvamento foi bem-sucedido, o cadastro exibiu o status Salva e a escala foi confirmada na consulta.
- **Evidências:** [Geração com IA](evidencias/CT-010-ia-geracao.png) e [Salvamento da escala](evidencias/CT-010-ia-salvamento.png).

## CT-011 — Tratamento de falha de comunicação com a IA

- **Tipo:** Teste de sistema
- **Data da execução:** 22/11/2026
- **Situação:** APROVADO
- **Entrada:** Escala de 23/11/2026, período Manhã, função supervisor e usuário não preenchido.
- **Procedimento:** Acessar o cadastro de escalas, configurar a data, o período e a função, deixar a vaga sem usuário, simular a falha de comunicação com o Gemini e clicar em Gerar com IA.
- **Resultado esperado:** Exibir um aviso de falha na geração, manter o sistema acessível e impedir o salvamento da escala.
- **Resultado obtido:** O sistema exibiu “Não foi possível gerar as escalas — Falha na comunicação com o Gemini”, permaneceu acessível e não salvou a escala.
- **Evidência:** [CT-011-falha-comunicacao-ia.png](evidencias/CT-011-falha-comunicacao-ia.png).

## CT-012 — Consulta de colaboradores

- **Tipo:** Teste de sistema
- **Data da execução:** 22/11/2026
- **Situação:** APROVADO
- **Procedimento:** Acessar o sistema com uma conta válida e abrir Colaboradores no painel.
- **Resultado esperado:** A página de consulta de colaboradores abre sem erros aparentes.
- **Resultado obtido:** A página abriu corretamente, exibindo Mario (código 2), Thiago Teste (código 1), o campo de pesquisa e os botões de navegação.
- **Evidência:** [CT-012-consulta-colaboradores.png](evidencias/CT-012-consulta-colaboradores.png).

## CT-013 — Consulta de escalas

- **Tipo:** Teste de sistema
- **Data da execução:** 22/11/2026
- **Situação:** APROVADO
- **Procedimento:** Acessar com uma conta válida e abrir a consulta de escalas pelo painel.
- **Resultado esperado:** A página abre e apresenta as escalas cadastradas.
- **Resultado obtido:** A página carregou sem erros aparentes e exibiu a escala de código 1 (26/11/2026, Manhã, 1 colaborador) e a de código 2 (23/11/2026, Tarde, 1 colaborador). O campo de filtro e os botões de navegação estavam visíveis.
- **Evidência:** `evidencias/CT-013-consulta-escalas.png` (arquivo ainda não localizado).

## CT-014 — Consulta de funções

- **Tipo:** Teste de sistema
- **Data da execução:** 22/11/2026
- **Situação:** APROVADO
- **Procedimento:** Acessar com uma conta válida e abrir Funções pelo painel.
- **Resultado esperado:** A página abre sem erros aparentes.
- **Resultado obtido:** A página abriu corretamente e exibiu as funções Administrador (código 1), Auxiliar (código 2), flautista (código 3) e supervisor (código 4). O campo de pesquisa e os botões Voltar e Incluir estavam visíveis.
- **Evidência:** evidencias/CT-014-consulta-funcoes.png (arquivo ainda não localizado).

## CT-015 — Edição de escala cadastrada

- **Tipo:** Teste de sistema
- **Data da execução:** 22/11/2026
- **Situação:** APROVADO
- **Dados:** Escala código 1, data 26/11/2026, período original Manhã, novo período Tarde, função Auxiliar e colaborador Mario.
- **Procedimento:** Abrir a escala código 1 na consulta, alterar o período para Tarde, salvar, retornar à consulta e reabrir a escala.
- **Resultado esperado:** A atualização é confirmada e o período Tarde permanece após reabrir a escala.
- **Resultado obtido:** O sistema exibiu “Escala atualizada com sucesso”. Após retornar à consulta e reabrir a escala, o período permaneceu Tarde, confirmando a persistência da alteração.
- **Evidência:** evidencias/CT-015-edicao-escala.png (arquivo ainda não localizado).

## CT-016 — Exclusão de escala cadastrada

- **Tipo:** Teste de sistema
- **Data da execução:** 22/11/2026
- **Situação:** APROVADO
- **Dados:** Escala código 3, data 24/11/2026, período Manhã, função Administrador e colaborador Thiago Teste.
- **Procedimento:** Abrir a escala 3 na consulta, confirmar a exclusão e verificar a listagem.
- **Resultado esperado:** Excluir a escala cadastrada sem afetar os demais registros.
- **Resultado obtido:** O sistema exibiu “Escala excluída com sucesso”. Na consulta, a escala 3 desapareceu e as escalas 1 e 2 permaneceram.
- **Evidência:** [CT-016-exclusao-escala.png](evidencias/CT-016-exclusao-escala.png).

## Resumo dos resultados

CT-001 a CT-016: 16 casos com situação final APROVADO.

Os cenários pendentes de consulta de colaboradores e escalas, antes registrados como CT-003 e CT-004, foram renumerados como CT-006 e CT-007.

O caso pendente de consulta de funções, anteriormente registrado como CT-005, CT-008 e CT-011, passou a CT-014.

O caso pendente de consulta de colaboradores, anteriormente registrado como CT-006 e CT-009, passou a CT-012.

O caso pendente de consulta de escalas, anteriormente registrado como CT-007 e CT-010, passou a CT-013.
