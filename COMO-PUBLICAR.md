# Como publicar o Precifica (passo a passo)

Este pacote tem 5 arquivos:

- `index.html`, `style.css`, `app.js` — o site em si (não precisa mexer neles).
- `firebase-config.js` — aqui você cola as chaves do seu projeto Firebase.
- `firestore.rules` — as regras de segurança (quem pode ler/escrever o quê).

O Precifica usa o **Firebase** (do Google, tem plano gratuito de sobra pro seu caso) só para login e para guardar os dados de cada aluno. O site em si fica hospedado de graça no **GitHub Pages**. Nenhum dos dois pede cartão de crédito no plano gratuito (Spark, no caso do Firebase).

Leva uns 15–20 minutos na primeira vez. Depois disso é só usar.

---

## Parte 1 — Criar o projeto no Firebase

1. Acesse **console.firebase.google.com** e entre com sua conta Google.
2. Clique em **"Criar projeto"** (ou "Add project"). Dê um nome, por exemplo `precifica-archetti`. Pode desmarcar o Google Analytics (não precisa dele aqui).
3. Espere o projeto ser criado e abra ele.

### 1.1 Ativar login por e-mail/senha

1. No menu à esquerda, vá em **Compilação → Authentication** ("Build → Authentication").
2. Clique em **"Vamos começar"** / **"Get started"**.
3. Na lista de provedores, clique em **"E-mail/senha"** ("Email/Password"), ative o primeiro interruptor e clique em **Salvar**.

### 1.2 Criar o banco de dados (Firestore)

1. No menu à esquerda, vá em **Compilação → Firestore Database**.
2. Clique em **"Criar banco de dados"**.
3. Escolha a localização do servidor — qualquer uma nas Américas serve (ex.: `southamerica-east1` se aparecer, ou `us-central`). Isso não pode ser trocado depois, mas não é crítico para o seu caso.
4. Em "modo de segurança", escolha **"Iniciar no modo de produção"** (não use "modo de teste" — vamos colar regras próprias no próximo passo, mais seguras que as automáticas).
5. Clique em **Criar**.

### 1.3 Publicar as regras de segurança

1. Ainda em Firestore Database, clique na aba **"Regras"** ("Rules") lá em cima.
2. Apague tudo o que estiver escrito lá.
3. Abra o arquivo `firestore.rules` (deste pacote) num editor de texto, copie tudo e cole no lugar.
4. Clique em **"Publicar"**.

Essas regras garantem que cada aluno só vê os próprios dados detalhados, e que só o resumo (meta, se bateu ou não) fica visível para você, como mentor — nunca os gastos pessoais de ninguém.

### 1.4 Pegar as chaves do site (config)

1. Clique na engrenagem ⚙️ ao lado de "Visão geral do projeto" → **"Configurações do projeto"**.
2. Na aba **Geral**, desça até **"Seus apps"** e clique no ícone **`</>`** (Web) para criar um app da Web.
3. Dê um apelido (ex.: `precifica-web`) e clique em **Registrar app**. Não precisa marcar "Firebase Hosting".
4. Vai aparecer um bloco de código com `const firebaseConfig = { apiKey: "...", ... }`. É só esse trecho que importa.
5. Abra `firebase-config.js` (deste pacote) e substitua os valores `"COLE_AQUI_..."` pelos valores reais que apareceram, mantendo as aspas. Salve o arquivo.

Essas chaves não são segredo — é normal elas aparecerem no código do navegador. Quem protege os dados de verdade é o arquivo `firestore.rules` que você já publicou.

### 1.5 Confirmar quem pode ser "mentor"

Ainda em `firebase-config.js`, confira a lista `MENTOR_EMAILS` — ela já vem com `ubiratan@archettiodonto.com.br`. Quem se cadastrar com um desses e-mails vira automaticamente mentor (com acesso ao painel da turma); todo o resto vira aluno comum.

Se quiser adicionar mais mentores no futuro, adicione o e-mail em **dois lugares**: nessa lista em `firebase-config.js` **e** na função `isAllowedMentorEmail()` dentro de `firestore.rules` (e publique as regras de novo) — o arquivo de regras é quem realmente garante a permissão; a lista em `firebase-config.js` só controla o que aparece na tela.

---

## Parte 2 — Colocar o site no ar (GitHub Pages)

1. Crie uma conta em **github.com**, se ainda não tiver.
2. Clique em **"New repository"**. Dê um nome, ex.: `precifica`. Marque como **Public** (necessário para o GitHub Pages gratuito) e clique em **Create repository**.
3. Na página do repositório vazio, clique em **"uploading an existing file"** (ou arraste os arquivos).
4. Envie os 5 arquivos deste pacote (`index.html`, `style.css`, `app.js`, `firebase-config.js` — já com suas chaves preenchidas — e `firestore.rules`, opcional só como referência). Clique em **Commit changes**.
5. Vá em **Settings → Pages** (menu lateral do repositório).
6. Em "Branch", escolha `main` e a pasta `/ (root)`, depois clique em **Save**.
7. Espere 1–2 minutos. A mesma tela vai mostrar um link tipo `https://seu-usuario.github.io/precifica/` — esse é o endereço do seu site.

### 2.1 Autorizar esse endereço no Firebase

O Firebase só aceita login vindo de domínios que você autorizou (é uma proteção contra sites clonados usando suas chaves):

1. Volte ao Firebase Console → **Authentication → Settings → Authorized domains** ("Domínios autorizados").
2. Clique em **Add domain** e cole `seu-usuario.github.io` (sem `https://` e sem o `/precifica/` do final).
3. Salve.

Pronto — o link `https://seu-usuario.github.io/precifica/` já funciona com cadastro, login e dados salvos.

---

## Como usar no dia a dia

- **Você (mentor):** cadastre-se no site com `ubiratan@archettiodonto.com.br` — você cai direto como mentor, com o botão "📊 Painel do mentor" no menu.
- **Cada aluno da mentoria:** cadastra-se com o próprio e-mail, escolhe um dos 3 modelos e preenche. Os dados ficam salvos automaticamente (indicador "salvo na sua conta" no topo) e acessíveis de qualquer aparelho, durante todo o período da mentoria.
- **Atualizar o site depois:** se algum dia eu (ou você) precisar mudar algo no código, é só enviar os arquivos atualizados para o mesmo repositório no GitHub (substituindo os antigos) — o GitHub Pages atualiza sozinho em menos de um minuto.

## Se algo der errado

- **"Não deu certo (auth/...)" na tela de login:** geralmente é e-mail/senha errados, ou domínio não autorizado (veja o passo 2.1).
- **Página em branco:** confira se `firebase-config.js` foi mesmo preenchido com as chaves reais (e não deixou nenhum `"COLE_AQUI_..."` esquecido) — abra o site, aperte F12 (ferramentas do desenvolvedor) → aba "Console" para ver a mensagem de erro exata.
- **Painel do mentor sem ninguém listado:** só aparece depois que pelo menos um aluno logar e preencher alguma coisa.
