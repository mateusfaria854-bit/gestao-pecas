# GestãoPeças

Sistema web para gestão de peças, movimentações de estoque, reformas e fornecedores.

Este repositório contém uma demonstração com dados fictícios e integração simulada com ordens de serviço.

**Demonstração online:** O projeto funciona abrindo `index.html` localmente, sem cadastro nem banco externo.

> Acesse o modo demonstração com **Administrador Demo** para explorar os relatórios e os logs, ou com **Usuário Demo** para conferir as permissões.

## Sobre o projeto
O sistema centraliza o cadastro de peças, o acompanhamento das movimentações e o controle de itens enviados para reforma. Também reúne custos e indicadores em um único painel.

## Funcionalidades
- **Estoque**: cadastro de peças, categorias, localização, estoque mínimo com alertas, busca, filtros, paginação e exportação CSV
- **Entradas** com **média ponderada histórica de compras** (ajustes manuais são registrados sem reescrever entradas)
- **Baixas para ônibus** (status Realizado / Pendente / Extra-Saldo), agrupadas por peça, ônibus ou data, com exportação CSV
- **Curva A · Peças Paradas**: estoque secundário para itens parados (denominação interna; não é uma análise ABC tradicional)
- **Reformas, consertos e garantias**: envio, acompanhamento e retorno
- **Fornecedores** e **ranking de fornecedores**
- **Dashboard** e **relatórios** (gastos mensais, valor do estoque, etc.), com exportação de envios e ranking em CSV
- **Auditoria**: log de atividades (somente administradores)
- **Usuários e perfis** (admin/usuário) com Firebase Authentication
- Validação de **ordem de serviço aberta** antes da baixa (integração simulada)

## Tecnologias
HTML, CSS e JavaScript puro (sem build) · Firebase Authentication · Firebase Realtime Database (opcional).

## Arquitetura

O código-fonte está organizado em módulos ES, com separação das regras de negócio e da interface:

```text
src/
  core/             inicialização, estado e configuração
  domain/           regras de estoque, baixas e CSV
  services/         Firebase/demonstração e integração simulada
  features/         telas e fluxos de cada área
  components/       modais e notificações
  utils/            formatação e utilitários
  styles/           CSS por responsabilidade e responsividade
  main.js           entrada ES para evolução futura
scripts/build.mjs   gera o bundle compatível dist/app.js
tests/unit/         testes de regras puras
```

A versão publicada utiliza `dist/app.js`, gerado com `npm run build` a partir dos módulos ES. A ponte preserva os manipuladores HTML antigos durante a migração. **Não edite o bundle diretamente.** Mais detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Como executar (modo demonstração)
Abra `index.html` no navegador. Ao alterar JavaScript em `src/`, execute `npm run build` (Node.js 22+). Se preferir um servidor local:
```bash
python3 -m http.server 8000
# abra http://localhost:8000
```
Escolha "Administrador Demo" ou "Usuário Demo" na tela de entrada (não há senha no modo demo).
As alterações ficam em memória e são perdidas ao recarregar a página.

Dica: a baixa para o ônibus **108** é bloqueada de propósito (sem OS aberta na simulação); os ônibus 101–107, 109 e 110 têm OS aberta.

## Configurar com Firebase (opcional)
Veja [docs/FIREBASE.md](docs/FIREBASE.md): copie `src/core/firebase-config.example.js` para `src/core/firebase-config.local.js`
(ignorado pelo Git), publique `database.rules.json` e crie o primeiro administrador.
Use sempre um projeto Firebase **separado** de qualquer ambiente real.

## Dados de demonstração
`data/demo-data.json` contém dados 100% fictícios (ex.: "Filtro de óleo", PEC-001, "Fornecedor Demo Alfa Ltda", ônibus 101).
Para alterar a demonstração, **atualize `data/demo-data.js` e `data/demo-data.json` juntos**. O arquivo JavaScript é usado primeiro ao abrir localmente; o JSON serve como alternativa ao usar servidor. Para atualizar os dois sem divergências, use `python3 scripts/sincronizar-demo.py` após editar o JSON.

## Segurança
Autenticação por Firebase Authentication no modo opcional, perfis por `role` e regras de acesso iniciais do banco. **O modo Firebase é experimental** e requer testes das regras, validações no backend e auditoria de logs antes do uso em produção.
Detalhes em [docs/PERMISSOES.md](docs/PERMISSOES.md) e [docs/FIREBASE.md](docs/FIREBASE.md).
A integração de ordens de serviço é simulada nesta versão.

## Demonstração visual
![Visão geral das telas principais](docs/demo-rapido.gif)

## Screenshots
| Dashboard | Estoque | Baixas |
|---|---|---|
| ![Dashboard](docs/screenshots/01-dashboard.png) | ![Estoque](docs/screenshots/02-estoque.png) | ![Baixas](docs/screenshots/05-baixas.png) |

## Testes
Execute os testes unitários com Node.js 22+ e os testes de regressão com Chromium e Playwright:
```bash
npm run build
npm test
python3 tests/test_demo.py
python3 tests/test_melhorias.py
```
Em outros sistemas, defina `CHROMIUM_BIN` com o caminho do Chromium. Os testes abrangem as baixas, saldo, entradas, histórico de custos, envios, XSS, exportação CSV, notificações, navegação acessível e responsividade mobile.

O GitHub Actions executa o build, os testes unitários e os testes integrados automaticamente a cada *push* e *pull request*, em `.github/workflows/testes.yml`. Os testes do Firebase real no Emulator Suite são uma etapa separada.

## Limitações conhecidas
- Coleções operacionais são gravadas como um array inteiro: edições simultâneas podem se sobrepor (última gravação vence), e as regras não distinguem criar/editar/excluir dentro de uma coleção.
- O front-end esconde telas por perfil, mas a proteção efetiva é feita pelas Security Rules (que ainda devem ser testadas no Emulator Suite).
- Excluir usuário remove o perfil, não a conta no Firebase Authentication (exige Admin SDK/Cloud Function).
- Testes de regressão disponíveis em `tests/` (dependem de Playwright/Chromium); sem build/empacotamento.
- Fontes e SDK do Firebase são carregados de CDNs públicas.

## Regras de negócio
- O custo exibido é a **média histórica ponderada das entradas**, não o custo contábil médio móvel. Uma edição manual do valor atual gera um ajuste sem reescrever entradas anteriores; a próxima entrada volta a considerar a média histórica.
- Uma baixa com status **Realizado** desconta o saldo somente se houver estoque suficiente. **Extra-Saldo** e **Pendente** não descontam.
- As quantidades são inteiras para peças por unidade; `kg`, `m` e `litro` admitem frações.

## Melhorias futuras
- Gravações granulares por registro (`push`/`update`) e regras por tipo de operação
- Cloud Functions para criação/remoção completa de usuários e para a integração real de manutenção
- Testes de regras no Firebase Emulator, cobertura unitária adicional e monitoramento em produção
- Exportação em PDF e importação de planilhas
- Migrar os eventos HTML inline para módulos ES nativos e remover o bundle de compatibilidade
