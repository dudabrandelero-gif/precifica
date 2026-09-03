// ============================================================================
// CONFIGURAÇÃO DO FIREBASE — preencha com as chaves do SEU projeto.
//
// Onde encontrar: console.firebase.google.com → seu projeto → ⚙️ Configurações
// do projeto → aba "Geral" → seção "Seus apps" → app da Web (ícone </>) →
// "Configuração do SDK" → escolha "Config".
//
// Essas chaves NÃO são secretas — é normal e seguro elas aparecerem no código
// que roda no navegador. Quem protege seus dados de verdade são as REGRAS do
// Firestore (arquivo firestore.rules), não o sigilo dessas chaves.
// ============================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyCaLWYZmqzSBFDsAPTzj11Hxf7ckkqmh4I",
  authDomain: "precifica-archetti.firebaseapp.com",
  projectId: "precifica-archetti",
  storageBucket: "precifica-archetti.firebasestorage.app",
  messagingSenderId: "655418028873",
  appId: "1:655418028873:web:514f2d403dc651ce772098",
};

// E-mails autorizados a virar "mentor" (painel com a turma inteira) no
// primeiro cadastro. Ajuste a lista abaixo — e ajuste TAMBÉM a mesma lista
// dentro de firestore.rules (função isAllowedMentorEmail), porque é lá que a
// permissão é realmente aplicada. Esta lista aqui só controla o que aparece
// na tela de cadastro.
export const MENTOR_EMAILS = [
  "ubiratan@archettiodonto.com.br",
];
