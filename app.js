/* ============================================================================
   Firebase — init e helpers de autenticação/dados
   ============================================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile, sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp,
  collection, getDocs, query, orderBy, limit,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const dbfs = getFirestore(fbApp);

const FS = { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, query, orderBy, limit };

function authErrorPt(err){
  const code = (err && err.code) || '';
  const map = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-disabled': 'Essa conta foi desativada.',
    'auth/user-not-found': 'Não achamos uma conta com esse e-mail.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Tente entrar em vez de cadastrar.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com a internet no momento.',
  };
  return map[code] || ('Não deu certo (' + (code || 'erro desconhecido') + '). Tente de novo.');
}
const VIDA_CATS = [{"name": "MORADIA", "items": ["Aluguel ou financiamento", "Condomínio", "IPTU (anual ÷ 12)", "Luz / energia", "Água", "Gás (botijão ou encanado)", "Internet", "TV a cabo / streaming (Netflix, Spotify etc)", "Empregada / diarista", "Jardineiro / piscineiro / manutenção", "Móveis, decoração, reformas (reserva mensal)"]}, {"name": "ALIMENTAÇÃO", "items": ["Supermercado", "Feira / hortifruti", "Açougue / peixaria", "Padaria / laticínios", "Restaurantes", "Delivery / fast food", "Cafés e lanches fora"]}, {"name": "TRANSPORTE", "items": ["Combustível", "Parcela do carro / financiamento", "Seguro do carro (anual ÷ 12)", "IPVA + licenciamento (anual ÷ 12)", "Manutenção do carro (revisão, pneus)", "Uber / 99 / táxi", "Transporte público", "Estacionamento"]}, {"name": "SAÚDE", "items": ["Plano de saúde", "Plano odontológico", "Academia / personal / crossfit", "Terapia / psicólogo", "Nutricionista", "Medicamentos de uso contínuo", "Exames e consultas", "Suplementos / vitaminas"]}, {"name": "FAMÍLIA", "items": ["Escola / faculdade dos filhos", "Babá / berçário / creche", "Fraldas e itens de bebê", "Material escolar e uniforme (anual ÷ 12)", "Roupas e calçados dos filhos", "Plano de saúde dos filhos", "Atividades dos filhos (aulas extras)", "Pensão alimentícia (que você paga)", "Pets (ração, vet, banho)", "Presentes (aniversários, Natal)", "Apoio a familiares"]}, {"name": "PESSOAL", "items": ["Cabeleireiro / barbeiro", "Unha / estética", "Cosméticos e higiene", "Roupas e calçados", "Acessórios"]}, {"name": "LAZER", "items": ["Viagens (reserva mensal)", "Cinema, teatro, shows", "Hobbies (curso, material)", "Eventos e festas", "Assinaturas de lazer (clubes, revistas)"]}, {"name": "INVESTIMENTOS E RESERVAS", "items": ["Reserva de emergência", "Poupança", "Previdência privada", "Investimentos em renda variável", "Outros aportes"]}, {"name": "DÍVIDAS E FINANCIAMENTOS", "items": ["Cartão de crédito (rotativo)", "Empréstimo pessoal", "Financiamento imóvel (se não for moradia atual)", "Outras parcelas"]}, {"name": "OUTROS", "items": ["Doações / dízimo", "Assinaturas diversas (apps, jornais)", "Imprevistos / reserva 10%"]}];
// Lista da Minha Vida antes de 29/10/2026 (salvamentos antigos guardavam só os valores, na ordem desta lista).
const VIDA_LABELS_V1 = ["Aluguel ou financiamento", "Condomínio", "IPTU (anual ÷ 12)", "Luz / energia", "Água", "Gás (botijão ou encanado)", "Internet", "TV a cabo / streaming (Netflix, Spotify etc)", "Empregada / diarista", "Jardineiro / piscineiro / manutenção", "Móveis, decoração, reformas (reserva mensal)", "Supermercado", "Feira / hortifruti", "Açougue / peixaria", "Padaria / laticínios", "Restaurantes", "Delivery / fast food", "Cafés e lanches fora", "Combustível", "Parcela do carro / financiamento", "Seguro do carro (anual ÷ 12)", "IPVA + licenciamento (anual ÷ 12)", "Manutenção do carro (revisão, pneus)", "Uber / 99 / táxi", "Transporte público", "Estacionamento", "Plano de saúde", "Plano odontológico", "Academia / personal / crossfit", "Terapia / psicólogo", "Nutricionista", "Medicamentos de uso contínuo", "Exames e consultas", "Suplementos / vitaminas", "Escola / faculdade dos filhos", "Atividades dos filhos (aulas extras)", "Pensão alimentícia", "Pets (ração, vet, banho)", "Presentes (aniversários, Natal)", "Apoio a familiares", "Cabeleireiro / barbeiro", "Unha / estética", "Cosméticos e higiene", "Roupas e calçados", "Acessórios", "Viagens (reserva mensal)", "Cinema, teatro, shows", "Hobbies (curso, material)", "Eventos e festas", "Assinaturas de lazer (clubes, revistas)", "Reserva de emergência", "Poupança", "Previdência privada", "Investimentos em renda variável", "Outros aportes", "Cartão de crédito (rotativo)", "Empréstimo pessoal", "Financiamento imóvel (se não for moradia atual)", "Outras parcelas", "Doações / dízimo", "Assinaturas diversas (apps, jornais)", "Imprevistos / reserva 10%"];
// Itens renomeados: nome antigo → nome novo.
const VIDA_ALIASES = {"Pensão alimentícia": "Pensão alimentícia (que você paga)"};
// Itens que contam como gasto com filhos (pro "gasto médio por filho").
const VIDA_ITENS_FILHOS = ["Escola / faculdade dos filhos","Babá / berçário / creche","Fraldas e itens de bebê","Material escolar e uniforme (anual ÷ 12)","Roupas e calçados dos filhos","Plano de saúde dos filhos","Atividades dos filhos (aulas extras)","Pensão alimentícia (que você paga)"];
const NEGOCIO_CATS = {"prestador": [{"name": "ESPAÇO DE ATENDIMENTO", "items": ["Aluguel de sala / consultório / clínica", "Condomínio comercial", "IPTU comercial (anual ÷ 12)", "Luz / energia da sala", "Água", "Internet e telefone", "Limpeza (diarista, produtos)", "Manutenção predial e reformas", "Segurança (alarme, câmeras)", "Decoração e ambientação (amortização mensal)"]}, {"name": "EQUIPAMENTOS", "items": ["Depreciação de equipamentos (valor ÷ vida útil)", "Manutenção e calibração", "Seguro de equipamentos", "Licenças de software clínico/prontuário eletrônico", "Computador, impressora, câmera"]}, {"name": "EQUIPE", "items": ["Secretária / recepcionista (salário + encargos)", "Auxiliar técnico (enfermeiro, aux. odonto, estagiário)", "Limpeza terceirizada", "Contador", "Treinamentos e atualizações da equipe"]}, {"name": "INSUMOS E MATERIAIS FIXOS", "items": ["Material de escritório (papel, canetas, impressos)", "Água, café, lanche para pacientes", "Descartáveis gerais (papel toalha, álcool)", "EPIs da equipe", "Reposição de itens clínicos gerais"]}, {"name": "MARKETING E CAPTAÇÃO", "items": ["Gestão de redes sociais / social media", "Tráfego pago (Meta, Google)", "Site e hospedagem", "Cartões, panfletos, material gráfico", "Participação em congressos e eventos"]}, {"name": "ADMINISTRATIVO E LEGAL", "items": ["Anuidades de conselho (CRM, CRO, CRP, CAU, CRC)", "Seguros de responsabilidade profissional", "Alvarás e licenças (Vigilância Sanitária)", "Jurídico (mensal ou provisionado)", "Tarifas bancárias e taxas de pagamento mensais"]}, {"name": "RESERVA", "items": ["Caixa mínimo da operação", "Imprevistos (10%)"]}], "produto": [{"name": "ESTRUTURA FÍSICA", "items": ["Aluguel da fábrica / loja / escritório", "Condomínio comercial", "IPTU comercial (÷12)", "Luz / energia da operação", "Água / esgoto", "Gás industrial (se usar)", "Internet e telefone", "Limpeza (produtos, serviço terceirizado)", "Manutenção predial", "Segurança (alarme, câmeras, vigilância)"]}, {"name": "EQUIPAMENTOS E DEPRECIAÇÃO", "items": ["Manutenção de máquinas", "Depreciação de equipamentos (valor ÷ vida útil em meses)", "Aluguel de equipamentos (se alugar)", "Ferramentas de reposição"]}, {"name": "EQUIPE", "items": ["Salários (CLT) — base total", "Encargos e benefícios (≈70% do salário)", "Vale transporte / alimentação", "Plano de saúde da equipe", "Treinamentos e capacitações", "Freelancers e prestadores fixos"]}, {"name": "SOFTWARES E SISTEMAS", "items": ["ERP / sistema de gestão", "Sistema de estoque / PDV", "E-commerce (plataforma, hospedagem)", "Design e edição (Canva, Photoshop)", "Outras assinaturas (CRM, e-mail, IA)"]}, {"name": "MARKETING E VENDAS", "items": ["Tráfego pago (Meta, Google)", "Agência ou assessoria de marketing", "Produção de conteúdo / fotografia", "Influenciadores / parcerias", "Materiais promocionais e brindes", "Participação em feiras e eventos"]}, {"name": "ADMINISTRATIVO E FINANCEIRO", "items": ["Contador", "Jurídico (mensal ou provisionado)", "Tarifas bancárias", "Certificações e licenças", "Seguros da empresa"]}, {"name": "RESERVA", "items": ["Caixa mínimo da empresa (reserva mensal)", "Imprevistos operacionais (10%)"]}], "conhecimento": [{"name": "PLATAFORMAS E SOFTWARES", "items": ["Plataforma de cursos (Hotmart, Kiwify, Hubla) — assinatura fixa", "Plataforma de comunidade (Circle, Discord paid, Telegram VIP)", "Plataforma de lives (Zoom, StreamYard, Riverside)", "E-mail marketing (ActiveCampaign, RD, MailerLite)", "CRM (RD Station, Pipedrive, HubSpot)", "Página / Site / Landing pages (Wordpress, Webflow, Klicksend)", "Ferramentas de IA (ChatGPT Plus, Claude Pro, etc.)", "Design (Canva Pro, Adobe Creative, Figma)", "Automações (Zapier, Make)", "Armazenamento e backup (Drive, Dropbox)", "Outras assinaturas recorrentes"]}, {"name": "EQUIPE FIXA", "items": ["Assistente virtual / executiva", "Social media / gestão de conteúdo", "Editor de vídeo", "Designer", "Copywriter", "Tráfego pago (gestor)", "Atendimento / suporte ao aluno", "Contador", "Jurídico"]}, {"name": "MARKETING E CAPTAÇÃO", "items": ["Tráfego pago (Meta, Google, YouTube)", "Produção de conteúdo orgânico (editor, fotógrafo)", "Permutas e parcerias (custo real)", "Eventos, congressos, lives externas", "Materiais gráficos e de apoio"]}, {"name": "ESTRUTURA FÍSICA", "items": ["Aluguel de escritório / coworking (se houver)", "Internet e telefone dedicados", "Luz / água (proporcional)", "Equipamentos (depreciação mensal: câmera, microfone, notebook)", "Material de gravação (iluminação, fundo, acústica)"]}, {"name": "ADMINISTRATIVO", "items": ["Tarifas bancárias (conta PJ, Pix, boletos)", "Certificação digital", "Seguros", "Licenças e registros"]}, {"name": "RESERVA", "items": ["Caixa mínimo da empresa", "Imprevistos (10%)"]}]};
/* =========================================================================
   PRECIFICA — motor de cálculo + estado
   Replica os 3 modelos da planilha 4C: Prestador de Serviço, Produto Físico,
   Profissional do Conhecimento.
   ========================================================================= */

const STORAGE_PREFIX = 'precifica_v1_';

/* ---------------------------------------------------------------------- */
/* Utils                                                                   */
/* ---------------------------------------------------------------------- */

function parseBR(str){
  if (typeof str === 'number') return str;
  if (str == null) return 0;
  let s = String(str).trim();
  if (s === '') return 0;
  s = s.replace(/[^0-9.,-]/g,'');
  const hasComma = s.indexOf(',') !== -1;
  const hasDot = s.indexOf('.') !== -1;
  if (hasComma && hasDot){
    s = s.replace(/\./g,'').replace(',', '.');
  } else if (hasComma){
    s = s.replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)){
    // "15.000" / "1.250.000": ponto como separador de milhar (padrão brasileiro)
    s = s.replace(/\./g,'');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function fmtBRL(n){
  if (!isFinite(n)) n = 0;
  return n.toLocaleString('pt-BR', {style:'currency', currency:'BRL', maximumFractionDigits:2});
}
function fmtNum(n, dec){
  if (!isFinite(n)) n = 0;
  return n.toLocaleString('pt-BR', {maximumFractionDigits: dec==null?2:dec, minimumFractionDigits:0});
}
function fmtPct(n){ // n is fraction (0.06 -> "6%")
  if (!isFinite(n)) n = 0;
  return (n*100).toLocaleString('pt-BR', {maximumFractionDigits:2}) + '%';
}
function safeDiv(a,b){ return (!b) ? 0 : a/b; }
function el(tag, attrs, children){
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs){
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  (children||[]).forEach(c => { if (c!=null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
}
function uid(){ return Math.random().toString(36).slice(2,9); }

/* ---------------------------------------------------------------------- */
/* Config por modelo                                                       */
/* ---------------------------------------------------------------------- */

const MODELS = {
  prestador: {
    key:'prestador',
    label:'Prestador de Serviço',
    tag:'Você vende sua hora',
    desc:'Consultas, sessões, procedimentos — o seu tempo de atendimento é o produto.',
    examples:'dentista · psicólogo · fisioterapeuta · advogado · personal trainer',
    metaDefault:20000,
    crescimentoDefault:3000,
    negocioTitle:'Vida do consultório / empresa',
    negocioDesc:'Custos fixos: tudo que sua operação gasta por mês mesmo se você não atender ninguém.',
    negocioTotalLabel:'Total custo fixo mensal da operação',
    hasInsumos:true,
    insumosLabel:'Insumos',
    insumosItemLabel:'Insumo',
    insumosUnitLabel:'Embalagem',
    insumosQtyLabel:'Qtd. da embalagem',
    insumosCodePrefix:'IN',
    insumosDesc:'Materiais descartáveis e consumíveis usados nos procedimentos. Serve de referência pra você preencher o custo de insumos de cada serviço na etapa Calcular.',
    insumosDefaults:[
      ['Luvas descartáveis','caixa 100 un',100,45],
      ['Máscara cirúrgica','caixa 50 un',50,25],
      ['Gaze estéril','pacote 10 un',10,12],
      ['Anestésico tópico','frasco 30ml',30,80],
      ['Álcool 70%','litro',1,18],
      ['Seringa descartável','unidade',1,2],
      ['Papel lençol','rolo 50m',50,22],
      ['Touca descartável','pacote 100 un',100,30],
    ],
    horaType:'prestador',
    calcType:'prestador',
    calcTitle:'Meus Serviços',
    calcRowNoun:'serviço',
    resumoType:'prestador',
  },
  produto: {
    key:'produto',
    label:'Produto Físico',
    tag:'Você vende um item que fabrica ou revende',
    desc:'Roupas, comidas, artesanato, cosméticos — tem matéria-prima, produção e frete.',
    examples:'costura · confeitaria · marcenaria · cosméticos · papelaria',
    metaDefault:15000,
    crescimentoDefault:2000,
    negocioTitle:'Vida da empresa (custos fixos da operação)',
    negocioDesc:'Tudo que sua empresa gasta por mês mesmo se não vender nada. Inclui estrutura, equipe, marketing.',
    negocioTotalLabel:'Total custo fixo mensal da empresa',
    hasInsumos:true,
    insumosLabel:'Matéria-Prima',
    insumosItemLabel:'Matéria-prima / Insumo',
    insumosUnitLabel:'Unidade',
    insumosQtyLabel:'Qtd. comprada',
    insumosCodePrefix:'MP',
    insumosDesc:'Cada insumo com sua unidade de compra e preço. Serve de referência pra você preencher o custo de matéria-prima de cada produto na etapa Calcular.',
    insumosDefaults:[
      ['Tecido algodão','metro',50,450],
      ['Linha de costura','cone',10,80],
      ['Botão plástico','unidade',100,20],
      ['Etiqueta de marca','unidade',500,75],
      ['Embalagem kraft','unidade',200,100],
    ],
    horaType:'produto',
    calcType:'produto',
    calcTitle:'Meus Produtos',
    calcRowNoun:'produto',
    resumoType:'produto',
  },
  conhecimento: {
    key:'conhecimento',
    label:'Profissional do Conhecimento',
    tag:'Você vende curso, mentoria ou consultoria',
    desc:'Infoproduto, mentoria em grupo ou individual, consultoria — o que escala é o formato.',
    examples:'mentor · coach · consultor · criador de curso online',
    metaDefault:25000,
    crescimentoDefault:5000,
    negocioTitle:'Custos fixos do negócio',
    negocioDesc:'Plataformas, equipe, tráfego, estrutura. Tudo que paga mesmo sem vender nada.',
    negocioTotalLabel:'Total custo fixo mensal do negócio',
    hasInsumos:false,
    horaType:'conhecimento',
    calcType:'conhecimento',
    calcTitle:'Minhas Ofertas',
    calcRowNoun:'oferta',
    resumoType:'conhecimento',
  },
};

const STEP_ORDER = ['sonhos','vida','meta','negocio','insumos','hora','calcular','resumo','crescer'];

function stepsFor(modelKey){
  const m = MODELS[modelKey];
  return STEP_ORDER.filter(s => s !== 'insumos' || m.hasInsumos);
}

const STEP_LABEL = {
  sonhos:'Meus Sonhos', meta:'Minha Meta', vida:'Minha Vida', negocio:'Meu Negócio',
  insumos:null, hora:'Minha Hora', calcular:null, resumo:'Resumo', crescer:'Rotina de Crescimento',
};
/* ---------------------------------------------------------------------- */
/* Listas achatadas (a partir de VIDA_CATS / NEGOCIO_CATS)                 */
/* ---------------------------------------------------------------------- */

function flatItems(cats){
  const out = [];
  cats.forEach(c => c.items.forEach(label => out.push({cat:c.name, label})));
  return out;
}
const VIDA_FLAT = flatItems(VIDA_CATS);
function negocioFlat(modelKey){ return flatItems(NEGOCIO_CATS[modelKey]); }

/* ---------------------------------------------------------------------- */
/* Exemplos (linhas iniciais da etapa Calcular, por modelo)                */
/* ---------------------------------------------------------------------- */

const CALC_EXAMPLES = {
  prestador: [
    {nome:'Consulta inicial (particular)', atend:30, dur:1, insumos:8, outros:0, impostos:.06, repasse:0, comissao:0, cartao:.03, margem:.5},
    {nome:'Retorno (particular)', atend:25, dur:.75, insumos:5, outros:0, impostos:.06, repasse:0, comissao:0, cartao:.03, margem:.5},
    {nome:'Consulta por convênio', atend:40, dur:.75, insumos:8, outros:0, impostos:.06, repasse:.4, comissao:0, cartao:.02, margem:.4},
    {nome:'Procedimento / sessão', atend:15, dur:1.5, insumos:35, outros:10, impostos:.06, repasse:0, comissao:0, cartao:.03, margem:.55},
    {nome:'Teleconsulta (online)', atend:20, dur:.75, insumos:0, outros:0, impostos:.06, repasse:.1, comissao:0, cartao:.03, margem:.55},
    {nome:'Pacote 5 sessões (preço total)', atend:4, dur:5, insumos:50, outros:0, impostos:.06, repasse:0, comissao:.1, cartao:.03, margem:.5},
  ],
  produto: [
    {nome:'Camiseta básica algodão', unidades:80, materiaPrima:25, tempo:.5, embalagem:8, frete:5, outros:0, impostos:.06, comissao:.1, plataforma:.05, margem:.4},
    {nome:'Calça jeans premium', unidades:40, materiaPrima:65, tempo:1.5, embalagem:15, frete:10, outros:0, impostos:.06, comissao:.1, plataforma:.05, margem:.45},
    {nome:'Vestido estampado', unidades:30, materiaPrima:55, tempo:2, embalagem:18, frete:8, outros:0, impostos:.06, comissao:.1, plataforma:.05, margem:.5},
    {nome:'Conjunto moletom', unidades:25, materiaPrima:90, tempo:2.5, embalagem:20, frete:15, outros:0, impostos:.06, comissao:.1, plataforma:.05, margem:.45},
  ],
  conhecimento: [
    {nome:'Consultoria de Branding (pacote 3m)', modalidade:'1:1', alunos:2, duracao:3, horasVivoAluno:4, horasVivoGrupo:0, horasPrep:6, horasSuporte:0, custoMaterial:200, custoFixoPrograma:0, plataforma:0, afiliados:0, impostos:.06, margem:.5},
    {nome:'The Lab (programa em grupo)', modalidade:'GRUPO', alunos:10, duracao:6, horasVivoAluno:0, horasVivoGrupo:4, horasPrep:8, horasSuporte:4, custoMaterial:150, custoFixoPrograma:500, plataforma:.1, afiliados:0, impostos:.06, margem:.45},
    {nome:'Forza (aceleração — misto)', modalidade:'MISTO', alunos:8, duracao:4, horasVivoAluno:0, horasVivoGrupo:6, horasPrep:12, horasSuporte:6, custoMaterial:300, custoFixoPrograma:800, plataforma:.1, afiliados:.1, impostos:.06, margem:.45},
    {nome:'Mentoria avulsa (1h)', modalidade:'1:1', alunos:6, duracao:1, horasVivoAluno:1, horasVivoGrupo:0, horasPrep:.5, horasSuporte:0, custoMaterial:0, custoFixoPrograma:0, plataforma:0, afiliados:0, impostos:.06, margem:.6},
    {nome:'Curso gravado perpétuo', modalidade:'GRAVADO', alunos:30, duracao:1, horasVivoAluno:0, horasVivoGrupo:0, horasPrep:2, horasSuporte:1, custoMaterial:0, custoFixoPrograma:200, plataforma:.1, afiliados:.2, impostos:.06, margem:.55},
    {nome:'Mastermind mensal (grupo)', modalidade:'GRUPO', alunos:12, duracao:1, horasVivoAluno:0, horasVivoGrupo:4, horasPrep:2, horasSuporte:2, custoMaterial:50, custoFixoPrograma:100, plataforma:0, afiliados:0, impostos:.06, margem:.5},
    {nome:'Workshop in-company', modalidade:'GRUPO', alunos:1, duracao:1, horasVivoAluno:0, horasVivoGrupo:8, horasPrep:12, horasSuporte:0, custoMaterial:0, custoFixoPrograma:500, plataforma:0, afiliados:0, impostos:.06, margem:.5},
  ],
};

/* ---------------------------------------------------------------------- */
/* Estado padrão                                                          */
/* ---------------------------------------------------------------------- */

const SONHO_TIPOS = [
  {key:'', label:'Selecione…'},
  {key:'moradia', label:'Moradia (casa própria)'},
  {key:'automovel', label:'Automóvel'},
  {key:'viagem', label:'Viagem'},
  {key:'outro', label:'Outro (escreva)'},
];
// Correção do custo dos sonhos pagos à vista (Viagem, Outro sem financiamento):
// só a inflação oficial (IPCA, IBGE). Quem junta dinheiro não paga juros.
// Padrão: IPCA acumulado 12 meses até set/2026 = 4,58%. Editável pelo aluno.
const SONHOS_IPCA_PADRAO = 0.0458;

// "Moradia" tem matemática própria: em vez da correção genérica acima, a casa
// própria normalmente é FINANCIADA — então calculamos a parcela mensal de
// verdade (Tabela Price), com faixas de taxa de juros de referência pesquisadas
// no mercado (Caixa / Minha Casa Minha Vida, out/2026). São taxas de
// REFERÊNCIA — a taxa real depende de renda, região, relacionamento bancário
// e análise de crédito; o aluno deve confirmar o valor exato com o banco.
const MORADIA_TAXAS = [
  {key:'mcmv1', label:'Minha Casa Minha Vida — Faixa 1 (renda familiar até R$ 3.200)', taxa:0.0463},
  {key:'mcmv2', label:'Minha Casa Minha Vida — Faixa 2 (renda familiar até R$ 5.000)', taxa:0.0588},
  {key:'mcmv3', label:'Minha Casa Minha Vida — Faixa 3 (renda familiar até R$ 9.600)', taxa:0.0791},
  {key:'mcmv4', label:'Minha Casa Minha Vida — Faixa 4 / Classe Média (renda familiar até R$ 13.000)', taxa:0.10},
  {key:'sbpe', label:'Financiamento bancário comum (SBPE, fora do programa)', taxa:0.115},
  {key:'personalizado', label:'Taxa personalizada (digite ao lado)', taxa:null},
];
const MORADIA_TAXA_PADRAO = 'mcmv3';

// "Automóvel" segue a mesma lógica: carro normalmente é financiado (CDC), então
// calculamos a parcela real pela Tabela Price. Taxas de REFERÊNCIA do Banco
// Central (aquisição de veículos – pessoa física): média de mercado de ago/2026
// e médias por banco da semana de 21–25/set/2026. A taxa real depende de
// entrada, prazo, ano do veículo e análise de crédito.
const AUTO_TAXAS = [
  {key:'publico', label:'Bancos públicos (Caixa / Banco do Brasil)', taxa:0.13},
  {key:'privado', label:'Grandes bancos privados (Bradesco, Santander, Itaú)', taxa:0.245},
  {key:'media', label:'Média do mercado (Banco Central)', taxa:0.264},
  {key:'loja', label:'Financeira de loja / concessionária (usado)', taxa:0.32},
  {key:'personalizado', label:'Taxa personalizada (digite ao lado)', taxa:null},
];
const AUTO_TAXA_PADRAO = 'media';

// "Outro" pode ser pago à vista (correção só pelo IPCA) ou financiado/parcelado.
// Referências: crédito pessoal não consignado — média do Banco Central, ago/2026
// (≈110% a.a.); consignados — medianas do ranking do BC, 7 a 14/out/2026.
const OUTRO_TAXAS = [
  {key:'semjuros', label:'Parcelado sem juros (cartão / loja)', taxa:0},
  {key:'consignado', label:'Consignado (INSS / servidor público)', taxa:0.236},
  {key:'consigclt', label:'Consignado privado (trabalhador CLT)', taxa:0.468},
  {key:'pessoal', label:'Crédito pessoal / empréstimo (média do Banco Central)', taxa:1.10},
  {key:'personalizado', label:'Taxa personalizada (digite ao lado)', taxa:null},
];
const OUTRO_TAXA_PADRAO = 'semjuros';

// Configuração por tipo de sonho financiado.
const FIN_TIPOS = {
  moradia:   {taxas:MORADIA_TAXAS, padrao:MORADIA_TAXA_PADRAO, titulo:'Financiamento da casa própria', btn:'🏠 Financiamento', bem:'imóvel', subsidio:true},
  automovel: {taxas:AUTO_TAXAS,    padrao:AUTO_TAXA_PADRAO,    titulo:'Financiamento do automóvel',   btn:'🚗 Financiamento', bem:'veículo', subsidio:false},
  outro:     {taxas:OUTRO_TAXAS,   padrao:OUTRO_TAXA_PADRAO,   titulo:'Financiamento / parcelamento', btn:'💳 Financiamento', bem:'sonho',   subsidio:false},
};
// Moradia e Automóvel são sempre financiados; "Outro" só quando o aluno marca.
function isFinanciado(r){ return !!FIN_TIPOS[r.tipo] && (r.tipo !== 'outro' || !!r.financiar); }
function finCfg(r){ return FIN_TIPOS[r.tipo] || FIN_TIPOS.moradia; }
function finTaxaInfo(r){
  const c = finCfg(r);
  return c.taxas.find(t => t.key===r.taxaPreset) || c.taxas.find(t => t.key===c.padrao);
}
// Ao trocar o tipo do sonho, garante que a faixa de taxa escolhida existe para ele.
function finAjustaPreset(r){
  if (!isFinanciado(r)) return;
  const c = finCfg(r);
  if (!c.taxas.some(t => t.key===r.taxaPreset)) r.taxaPreset = c.padrao;
}
function moradiaTaxaInfo(key){ return MORADIA_TAXAS.find(t => t.key===key) || MORADIA_TAXAS.find(t=>t.key===MORADIA_TAXA_PADRAO); }

function defaultSonhos(){
  return [0,1,2,3,4,5].map(() => ({
    tipo:'', desc:'', custo:0, prazo:0,
    entrada:0.20, taxaPreset:MORADIA_TAXA_PADRAO, taxaCustom:0.08, subsidio:0,
  }));
}
function normalizeSonhos(rows){
  // Sonhos salvos antes da lista de opções: o texto livre vira "Outro".
  (rows||[]).forEach(r => {
    if (r.tipo == null) r.tipo = (r.desc && String(r.desc).trim()) ? 'outro' : '';
    // Sonhos salvos antes dos campos de financiamento de moradia — preenche com o padrão.
    if (r.entrada == null) r.entrada = 0.20;
    if (r.taxaPreset == null) r.taxaPreset = MORADIA_TAXA_PADRAO;
    if (r.taxaCustom == null) r.taxaCustom = 0.08;
    if (r.subsidio == null) r.subsidio = 0;
    finAjustaPreset(r);
  });
  return rows;
}
function defaultMeta(modelKey){
  const m = MODELS[modelKey];
  return { prolabore: null, crescimento: m.crescimentoDefault, valor: 0 };
}
// Pró-labore sugerido = vida pessoal (contas + reservas + investimentos)
// + o valor mensal dos sonhos (o que precisa SOBRAR além das contas).
function prolaboreSugerido(state){
  return sumVida(state) + sumSonhosMensal(state);
}
// Pró-labore: o que a pessoa decide tirar. Enquanto não digitar, usa a sugestão.
function prolaboreAtual(state){
  const p = state.meta && state.meta.prolabore;
  return (p == null || p === '') ? prolaboreSugerido(state) : parseBR(p);
}
// Meta de lucro = pró-labore + crescimento profissional (o que a pessoa precisa por mês, no total).
function computeMeta(state){
  return prolaboreAtual(state) + parseBR(state.meta && state.meta.crescimento);
}

// Outras fontes de renda (CLT, outros negócios, investimentos, aluguel…).
// Elas cobrem parte da meta — então ESTE negócio só precisa entregar o que falta.
const RENDA_TIPOS = [
  {key:'clt', label:'Salário CLT', help:'Valor líquido que cai na conta (depois de INSS e IR).'},
  {key:'negocio', label:'Outro negócio', help:'Lucro que você realmente retira desse outro negócio por mês.'},
  {key:'investimentos', label:'Investimentos (aplicações, ações, FIIs)', help:'Só o que você saca por mês (juros, dividendos, rendimentos). O que é reinvestido não conta.'},
  {key:'aluguel', label:'Aluguel recebido', help:'Valor líquido que sobra do aluguel (depois de taxas e impostos).'},
  {key:'aposentadoria', label:'Aposentadoria (INSS / previdência)', help:'Valor líquido mensal.'},
  {key:'pensaorecebida', label:'Pensão alimentícia recebida', help:'Valor mensal que você recebe de pensão (pros filhos ou pra você).'},
  {key:'outra', label:'Outra (escreva)', help:'Qualquer outra renda que entra todo mês.'},
];
function rendaTipo(key){ return RENDA_TIPOS.find(t => t.key===key) || RENDA_TIPOS[RENDA_TIPOS.length-1]; }
function defaultRendas(){ return {ativo:false, itens:[]}; }
function sumOutrasRendas(state){
  const r = state.rendas;
  if (!r || !r.ativo) return 0;
  return (r.itens||[]).reduce((s,it) => s + (parseBR(it.valor)||0), 0);
}
// Quanto ESTE negócio precisa entregar: meta total − outras rendas (nunca negativo).
function computeMetaNegocio(state){
  return Math.max(0, computeMeta(state) - sumOutrasRendas(state));
}
function defaultHora(modelKey){
  if (modelKey === 'prestador') return {diasUteis:5, horasDia:8, semanasEfetivas:46, taxaOcupacao:.7};
  if (modelKey === 'produto') return {horasOperacionaisMes:176, salarioMedioProdutor:2500, encargosPct:.7, horasProdutivasMes:176};
  if (modelKey === 'conhecimento') return {diasUteis:5, semanasEfetivas:46, horasProdutivasDia:6};
}
function defaultInsumos(modelKey){
  const m = MODELS[modelKey];
  if (!m.hasInsumos) return [];
  return m.insumosDefaults.map((d,i) => ({
    id: uid(),
    codigo: m.insumosCodePrefix + String(i+1).padStart(3,'0'),
    nome: d[0], unidade: d[1], qtd: d[2], valor: d[3],
  }));
}
function defaultCalc(modelKey){
  const ex = CALC_EXAMPLES[modelKey];
  return ex.map(row => Object.assign({_id:uid(), _example:true}, row));
}

function defaultState(modelKey){
  const calcular = defaultCalc(modelKey);
  const st = {
    sonhos: defaultSonhos(),
    sonhosTaxas: {ipca: SONHOS_IPCA_PADRAO},
    meta: defaultMeta(modelKey),
    rendas: defaultRendas(),
    vida: VIDA_FLAT.map(() => 0),
    vidaLabels: VIDA_FLAT.map(it => it.label),
    filhos: 0,
    negocio: negocioFlat(modelKey).map(() => 0),
    insumos: defaultInsumos(modelKey),
    hora: defaultHora(modelKey),
    calcular,
  };
  if (modelKey === 'prestador'){
    st.calcGlobal = deriveCalcGlobal(calcular);
    calcular.forEach(r => { r.matModo = 'valor'; r.materiais = []; });
  }
  return st;
}

// Reaproveita os valores da Minha Vida mesmo quando a lista de itens muda:
// casa cada valor pelo NOME do item (não pela posição).
function migrateVida(parsed, defVida){
  const vals = parsed.vida;
  if (!Array.isArray(vals)) return defVida;
  const cur = VIDA_FLAT.map(it => it.label);
  let labels = Array.isArray(parsed.vidaLabels) && parsed.vidaLabels.length === vals.length ? parsed.vidaLabels
             : (vals.length === VIDA_LABELS_V1.length ? VIDA_LABELS_V1 : null);
  if (!labels) return vals.length === cur.length ? vals : defVida;
  const byLabel = {};
  labels.forEach((l, i) => { byLabel[VIDA_ALIASES[l] || l] = vals[i]; });
  return cur.map(l => byLabel[l] != null ? byLabel[l] : 0);
}

function mergeWithDefaults(modelKey, parsed){
  const def = defaultState(modelKey);
  if (!parsed) return def;
  const merged = Object.assign({}, def, parsed);
  merged.vida = migrateVida(parsed, def.vida);
  merged.vidaLabels = VIDA_FLAT.map(it => it.label);
  merged.filhos = parseBR(parsed.filhos) || 0;
  if (!merged.negocio || merged.negocio.length !== def.negocio.length) merged.negocio = def.negocio;
  if (!merged.sonhos) merged.sonhos = def.sonhos;
  normalizeSonhos(merged.sonhos);
  merged.sonhosTaxas = Object.assign({}, def.sonhosTaxas, merged.sonhosTaxas);
  delete merged.sonhosTaxas.igpm; // versão antiga usava IGP-M + 10% de juros
  if (!merged.calcular || !merged.calcular.length) merged.calcular = def.calcular;
  if (!merged.insumos) merged.insumos = def.insumos;
  (merged.insumos || []).forEach(ins => { if (!ins.id) ins.id = uid(); });
  if (modelKey === 'prestador'){
    if (!parsed.calcGlobal) merged.calcGlobal = deriveCalcGlobal(merged.calcular);
    else merged.calcGlobal = Object.assign({}, CALC_GLOBAL_DEFAULT, parsed.calcGlobal);
    (merged.calcular || []).forEach(r => { if (!r.matModo) r.matModo = 'valor'; if (!Array.isArray(r.materiais)) r.materiais = []; });
  }
  merged.hora = Object.assign({}, def.hora, merged.hora);
  const savedMeta = parsed.meta || {};
  merged.meta = Object.assign({}, def.meta, savedMeta);
  // Versão antiga guardava 4 componentes; o 4º era o crescimento.
  if (savedMeta.crescimento == null && Array.isArray(savedMeta.comp) && savedMeta.comp.length >= 4){
    merged.meta.crescimento = parseBR(savedMeta.comp[3]);
  }
  delete merged.meta.comp;
  merged.rendas = Object.assign({}, def.rendas, parsed.rendas||{});
  if (!Array.isArray(merged.rendas.itens)) merged.rendas.itens = [];
  merged.meta.valor = computeMeta(merged);
  return merged;
}

// loadState / saveState / scheduleSave are implemented in app_part3 (Firestore-backed),
// once CURRENT_USER and the Firestore handles exist. mergeWithDefaults/defaultState
// above are pure and reused there.
function markSaved(){
  const ind = document.getElementById('save-indicator');
  if (ind){ ind.classList.remove('err'); ind.classList.add('flash'); ind.querySelector('.txt').textContent = 'salvo na sua conta'; }
}
function markSaving(){
  const ind = document.getElementById('save-indicator');
  if (ind){ ind.querySelector('.txt').textContent = 'salvando…'; }
}
function markSaveError(){
  const ind = document.getElementById('save-indicator');
  if (ind){ ind.classList.add('err'); ind.querySelector('.txt').textContent = 'não deu pra salvar — verifique a internet'; }
}

/* ---------------------------------------------------------------------- */
/* Somas simples                                                          */
/* ---------------------------------------------------------------------- */

function sumArr(a){ return (a||[]).reduce((s,v) => s + (parseBR(v)||0), 0); }
function sumVida(state){ return sumArr(state.vida); }
function sumNegocio(state){ return sumArr(state.negocio); }
function sonhosTaxaAnual(state){
  const t = (state.sonhosTaxas)||{};
  return t.ipca != null ? parseBR(t.ipca) : SONHOS_IPCA_PADRAO;
}
// --- Moradia: financiamento real (Tabela Price), em vez da correção genérica ---
function moradiaTaxaAnual(r){
  if (r.taxaPreset === 'personalizado') return parseBR(r.taxaCustom)||0;
  return finTaxaInfo(r).taxa;
}
function moradiaEntradaValor(r){
  return parseBR(r.custo) * (parseBR(r.entrada)||0);
}
function moradiaFinanciado(r){
  const subs = finCfg(r).subsidio ? (parseBR(r.subsidio)||0) : 0;
  const v = parseBR(r.custo) - moradiaEntradaValor(r) - subs;
  return v > 0 ? v : 0;
}
// Parcela mensal pela Tabela Price: PMT = PV · i / (1 − (1+i)^−n), com i = taxa mensal equivalente.
function moradiaParcela(r){
  const n = parseBR(r.prazo);
  if (!n) return 0;
  const pv = moradiaFinanciado(r);
  if (!pv) return 0;
  const i = Math.pow(1 + moradiaTaxaAnual(r), 1/12) - 1;
  if (!i) return pv / n;
  return pv * i / (1 - Math.pow(1+i, -n));
}
// "Custo corrigido" de uma moradia = tudo que realmente sai do bolso: entrada + soma das parcelas.
function moradiaTotalPago(r){
  return moradiaEntradaValor(r) + moradiaParcela(r) * parseBR(r.prazo);
}
function moradiaResumoTexto(r){
  const info = finTaxaInfo(r);
  const nomeTaxa = r.taxaPreset === 'personalizado' ? 'taxa personalizada' : (info.label.split(' (')[0]||info.label);
  const partes = [
    'Entrada ' + fmtNum((parseBR(r.entrada)||0)*100,0) + '%',
    nomeTaxa + ' (' + fmtNum(moradiaTaxaAnual(r)*100,2) + '% a.a.)',
  ];
  if (finCfg(r).subsidio && parseBR(r.subsidio) > 0) partes.push('Subsídio ' + fmtBRL(parseBR(r.subsidio)));
  return partes.join(' • ');
}

function sonhoCustoCorrigido(state, r){
  if (isFinanciado(r)) return moradiaTotalPago(r);
  const custo = parseBR(r.custo), prazo = parseBR(r.prazo);
  if (!custo || !prazo) return custo || 0;
  return custo * Math.pow(1 + sonhosTaxaAnual(state), prazo/12);
}
function sonhoMensal(state, r){
  if (isFinanciado(r)) return moradiaParcela(r);
  return safeDiv(sonhoCustoCorrigido(state, r), parseBR(r.prazo));
}
function sumSonhosMensal(state){
  return (state.sonhos||[]).reduce((s,r) => s + sonhoMensal(state, r), 0);
}

/* ---------------------------------------------------------------------- */
/* Minha Hora                                                              */
/* ---------------------------------------------------------------------- */

function computeHora(modelKey, state){
  const h = state.hora;
  const negocioTotal = sumNegocio(state);
  if (modelKey === 'prestador'){
    const horasDisponiveis = h.diasUteis * h.horasDia * h.semanasEfetivas / 12;
    const horasEfetivas = horasDisponiveis * h.taxaOcupacao;
    const custoHora = safeDiv(negocioTotal, horasEfetivas);
    return {custoFixoNegocio:negocioTotal, horasDisponiveis, horasEfetivas, custoHora};
  }
  if (modelKey === 'produto'){
    const custoFixoEmpresa = negocioTotal;
    const custoHoraEmpresa = safeDiv(custoFixoEmpresa, h.horasOperacionaisMes);
    const custoTotalMaoObraMes = h.salarioMedioProdutor * (1 + h.encargosPct);
    const custoHoraProducao = safeDiv(custoTotalMaoObraMes, h.horasProdutivasMes);
    return {custoFixoEmpresa, custoHoraEmpresa, custoTotalMaoObraMes, custoHoraProducao};
  }
  if (modelKey === 'conhecimento'){
    const horasProdutivasMes = h.diasUteis * h.semanasEfetivas * h.horasProdutivasDia / 12;
    const custoFixoNegocio = negocioTotal;
    const custoHora = safeDiv(custoFixoNegocio, horasProdutivasMes);
    return {custoFixoNegocio, horasProdutivasMes, custoHora};
  }
}

/* ---------------------------------------------------------------------- */
/* Calcular — linha a linha, por modelo                                    */
/* ---------------------------------------------------------------------- */

// Configurações que valem para todos os serviços (Prestador).
const CALC_GLOBAL_DEFAULT = {impostos:.06, cartao:.03, comissao:0, margem:.4, convenio:false};
function calcGlobal(state){ return Object.assign({}, CALC_GLOBAL_DEFAULT, (state && state.calcGlobal) || {}); }
function insumoCustoUn(ins){ return safeDiv(parseBR(ins.valor), parseBR(ins.qtd)); }
function materiaisCusto(state, row){
  const map = {}; ((state && state.insumos) || []).forEach(ins => { map[ins.id] = ins; });
  return (row.materiais || []).reduce((s, m) => s + (map[m.id] ? parseBR(m.qtd) * insumoCustoUn(map[m.id]) : 0), 0);
}
// Valores que realmente entram no cálculo de um serviço.
function prestadorEfetivo(row, state){
  if (!state) return row;
  const g = calcGlobal(state);
  const r = Object.assign({}, row);
  if (r.usaPadrao !== false){ r.impostos = g.impostos; r.cartao = g.cartao; r.comissao = g.comissao; r.margem = g.margem; }
  if (!g.convenio) r.repasse = 0;
  if (r.matModo === 'lista') r.insumos = materiaisCusto(state, row);
  return r;
}
// Gera as configurações gerais a partir de serviços já salvos (migração / exemplos).
function deriveCalcGlobal(rows){
  const g = Object.assign({}, CALC_GLOBAL_DEFAULT);
  const first = (rows || [])[0];
  if (first){ ['impostos','cartao','comissao','margem'].forEach(k => { if (first[k] != null) g[k] = parseBR(first[k]); }); }
  g.convenio = (rows || []).some(r => parseBR(r.repasse) > 0);
  (rows || []).forEach(r => {
    if (r.usaPadrao == null) r.usaPadrao = ['impostos','cartao','comissao','margem'].every(k => Math.abs(parseBR(r[k]) - g[k]) < 1e-9);
  });
  return g;
}

function computeCalcAll(modelKey, rows, horaC, state){
  if (modelKey === 'prestador') return computeCalcPrestador((rows||[]).map(r => prestadorEfetivo(r, state)), horaC);
  if (modelKey === 'produto') return computeCalcProduto(rows, horaC);
  if (modelKey === 'conhecimento') return computeCalcConhecimento(rows, horaC);
}

function computeCalcPrestador(rows, horaC){
  const custoHora = horaC.custoHora || 0;
  const out = rows.map(row => {
    const B = parseBR(row.atend), C = parseBR(row.dur), D = parseBR(row.insumos), E = parseBR(row.outros);
    const H = parseBR(row.impostos), I = parseBR(row.repasse), J = parseBR(row.comissao), K = parseBR(row.cartao), L = parseBR(row.margem);
    const F = C * custoHora;
    const G = D + E + F;
    // Imposto, repasse, comissão, cartão e margem são todos PEDAÇOS do preço:
    // juntos precisam somar menos de 100%, senão não existe preço possível.
    const denomM = 1 - H - J - K - L;
    const denomN = 1 - H - I - J - K - L;
    const invalido = denomM <= 0 || (I > 0 && denomN <= 0);
    // O preço por atendimento não depende de quantos atendimentos há no mês.
    const M = denomM <= 0 ? 0 : G / denomM;
    const N = I === 0 ? 0 : (denomN <= 0 ? 0 : G / denomN);
    const O = invalido ? 0 : (I > 0 ? N*(1-H-I-J-K) - G : M*(1-H-J-K) - G);
    const P = B * C;
    const Q = B === 0 || invalido ? 0 : (I > 0 ? N*B : M*B);
    const liqHora = safeDiv(O, C);
    let status = '';
    if (invalido) status = 'invalido';
    else if (B !== 0) status = liqHora >= custoHora*2 ? 'otimo' : (liqHora >= custoHora ? 'ok' : 'baixo');
    return Object.assign({}, row, {_custoTempo:F, _custoDireto:G, _precoParticular:M, _precoConvenio:N, _liquido:O, _horasTotais:P, _receita:Q, _status:status,
      _somaPct: H + J + K + L + (I > 0 ? I : 0)});
  });
  const totals = {
    atendimentos: out.reduce((s,r)=>s+parseBR(r.atend),0),
    liquido: out.reduce((s,r)=>s + parseBR(r.atend)*r._liquido, 0),
    horas: out.reduce((s,r)=>s+r._horasTotais,0),
    receita: out.reduce((s,r)=>s+r._receita,0),
  };
  return {rows:out, totals};
}

function computeCalcProduto(rows, horaC){
  const custoHoraProducao = horaC.custoHoraProducao || 0;
  const custoFixoEmpresa = horaC.custoFixoEmpresa || 0;
  const totalUnidadesAll = rows.reduce((s,r)=>s+parseBR(r.unidades),0);
  const out = rows.map(row => {
    const B = parseBR(row.unidades), C = parseBR(row.materiaPrima), D = parseBR(row.tempo);
    const F = parseBR(row.embalagem), G = parseBR(row.frete), H = parseBR(row.outros);
    const L = parseBR(row.impostos), M = parseBR(row.comissao), N = parseBR(row.plataforma), O = parseBR(row.margem);
    const E = D * custoHoraProducao;
    const I = C + E + F + G + H;
    const J = B === 0 ? 0 : safeDiv(custoFixoEmpresa, totalUnidadesAll);
    const K = I + J;
    const denomP = 1 - L - M - N - O;
    const P = B === 0 ? 0 : (denomP <= 0 ? 0 : K / denomP);
    const Q = safeDiv(P, K);
    let status = '';
    if (B !== 0) status = Q >= 3 ? 'otimo' : (Q >= 2 ? 'ok' : 'baixo');
    return Object.assign({}, row, {_maoObra:E, _custoUnitario:I, _rateio:J, _custoTotalUnitario:K, _preco:P, _markup:Q, _status:status});
  });
  const totals = {
    unidades: totalUnidadesAll,
    receita: out.reduce((s,r)=>s + parseBR(r.unidades)*r._preco, 0),
    lucroLiquido: out.reduce((s,r)=>s + parseBR(r.unidades)*r._preco*parseBR(r.margem), 0),
  };
  return {rows:out, totals};
}

function computeCalcConhecimento(rows, horaC){
  const custoHora = horaC.custoHora || 0;
  const out = rows.map(row => {
    const C = parseBR(row.alunos), E = parseBR(row.horasVivoAluno), F = parseBR(row.horasVivoGrupo);
    const G = parseBR(row.horasPrep), H = parseBR(row.horasSuporte), K = parseBR(row.custoMaterial), L = parseBR(row.custoFixoPrograma);
    const P = parseBR(row.plataforma), Q = parseBR(row.afiliados), R = parseBR(row.impostos), S = parseBR(row.margem);
    const I = (E*C) + F + G + H;
    const J = safeDiv(I, C);
    const M = I * custoHora;
    const N = M + L + K*C;
    const O = safeDiv(N, C);
    const denomT = 1 - P - Q - R - S;
    const T = C === 0 ? 0 : (denomT <= 0 ? 0 : O / denomT);
    const U = T * C;
    let status = '';
    if (C !== 0){
      if (I === 0) status = 'gravado';
      else {
        const marginPerHour = safeDiv(U*S, I);
        status = marginPerHour >= custoHora*2 ? 'otimo' : (marginPerHour >= custoHora ? 'ok' : 'baixo');
      }
    }
    return Object.assign({}, row, {_horasTotaisMes:I, _horasPorAluno:J, _custoTempo:M, _custoTotalMes:N, _custoPorAluno:O, _preco:T, _receita:U, _status:status});
  });
  const totals = {
    alunos: out.reduce((s,r)=>s+parseBR(r.alunos),0),
    horas: out.reduce((s,r)=>s+r._horasTotaisMes,0),
    receita: out.reduce((s,r)=>s+r._receita,0),
    lucroLiquido: out.reduce((s,r)=>s + r._receita*parseBR(r.margem), 0),
  };
  return {rows:out, totals};
}

/* ---------------------------------------------------------------------- */
/* Resumo                                                                  */
/* ---------------------------------------------------------------------- */

function computeResumo(modelKey, state){
  const horaC = computeHora(modelKey, state);
  const calc = computeCalcAll(modelKey, state.calcular, horaC, state);
  const metaTotal = computeMeta(state);
  const outrasRendas = sumOutrasRendas(state);
  const meta = computeMetaNegocio(state); // o que ESTE negócio precisa entregar
  const custoVida = sumVida(state);
  const metaSonhos = sumSonhosMensal(state);

  if (modelKey === 'prestador'){
    const liquido = calc.totals.liquido;
    return {
      meta, metaTotal, outrasRendas, custoVida, metaSonhos,
      custoFixoNegocio: horaC.custoFixoNegocio,
      horasDisponiveis: horaC.horasDisponiveis,
      horasAtendidas: calc.totals.horas,
      ocupacaoReal: safeDiv(calc.totals.horas, horaC.horasDisponiveis),
      // Quanto deixa na mesa por mês cobrando menos que o preço justo (só serviços com "cobra hoje").
      perdaMensal: calc.rows.reduce((s, r) => {
        const hoje = parseBR(r.cobraHoje);
        return s + (hoje > 0 ? Math.max(0, r._precoParticular - hoje) * parseBR(r.atend) : 0);
      }, 0),
      custoHora: horaC.custoHora,
      receita: calc.totals.receita,
      liquido,
      bateMeta: liquido >= meta,
      diff: Math.abs(liquido - meta),
      horaC, calc,
    };
  }
  if (modelKey === 'produto'){
    const lucro = calc.totals.lucroLiquido;
    return {
      meta, metaTotal, outrasRendas, custoVida, metaSonhos,
      custoFixoEmpresa: horaC.custoFixoEmpresa,
      custoHoraEmpresa: horaC.custoHoraEmpresa,
      custoHoraProducao: horaC.custoHoraProducao,
      unidades: calc.totals.unidades,
      receita: calc.totals.receita,
      liquido: lucro,
      bateMeta: lucro >= meta,
      diff: Math.abs(lucro - meta),
      horaC, calc,
    };
  }
  if (modelKey === 'conhecimento'){
    const lucro = calc.totals.lucroLiquido;
    const horasComprometidas = calc.totals.horas;
    let capStatus = 'ok';
    if (horasComprometidas > horaC.horasProdutivasMes) capStatus = 'over';
    else if (horasComprometidas > 0.9*horaC.horasProdutivasMes) capStatus = 'alerta';
    return {
      meta, metaTotal, outrasRendas, custoVida, metaSonhos,
      custoFixoNegocio: horaC.custoFixoNegocio,
      horasProdutivasMes: horaC.horasProdutivasMes,
      custoHora: horaC.custoHora,
      horasComprometidas,
      capacidadeUsada: safeDiv(horasComprometidas, horaC.horasProdutivasMes),
      capStatus,
      receita: calc.totals.receita,
      liquido: lucro,
      bateMeta: lucro >= meta,
      diff: Math.abs(lucro - meta),
      horaC, calc,
    };
  }
}
/* ---------------------------------------------------------------------- */
/* Estado da aplicação + roteamento (login / cadastro / menu / wizard)     */
/* ---------------------------------------------------------------------- */

const APP = {
  view: 'loading', // loading | login | signup | menu | wizard
  model: null,
  step: 'sonhos',
  state: null,
  authMsg: '',
  menuResumo: null, // resumos/{uid} cache pra tela de menu
};
let CURRENT_USER = null; // {uid, email, nome}

/* ---------- Firestore: load/save do modelo ativo ---------- */

async function loadState(modelKey){
  try{
    const ref = FS.doc(dbfs, 'users', CURRENT_USER.uid, 'modelos', modelKey);
    const snap = await FS.getDoc(ref);
    return mergeWithDefaults(modelKey, snap.exists() ? snap.data() : null);
  }catch(e){
    console.warn('load failed', e);
    return defaultState(modelKey);
  }
}

let SAVE_TIMER = null;
async function saveState(modelKey, state){
  if (!CURRENT_USER) return;
  markSaving();
  try{
    const clean = JSON.parse(JSON.stringify(state));
    const ref = FS.doc(dbfs, 'users', CURRENT_USER.uid, 'modelos', modelKey);
    await FS.setDoc(ref, clean);
    await saveResumo(modelKey, clean);
    markSaved();
  }catch(e){
    console.warn('save failed', e);
    markSaveError();
  }
}
function scheduleSave(modelKey, state){
  clearTimeout(SAVE_TIMER);
  SAVE_TIMER = setTimeout(() => { saveState(modelKey, state); }, 700);
}
async function saveResumo(modelKey, state){
  const r = computeResumo(modelKey, state);
  const ref = FS.doc(dbfs, 'resumos', CURRENT_USER.uid);
  await FS.setDoc(ref, {
    nome: CURRENT_USER.nome || '',
    email: CURRENT_USER.email || '',
    [modelKey]: {
      meta: r.meta, receita: r.receita, liquido: r.liquido, bateMeta: r.bateMeta,
      atualizadoEm: FS.serverTimestamp(),
    },
  }, { merge: true });
}
function persist(){ scheduleSave(APP.model, APP.state); }

/* ---------- Sessão ---------- */

function initAuthListener(){
  onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser){
      CURRENT_USER = null;
      APP.view = 'login';
      APP.model = null; APP.state = null;
      render();
      return;
    }
    // Evita uma corrida: logo após o cadastro, o próprio formulário de
    // cadastro já monta o CURRENT_USER e chama render() antes que este
    // listener dispare de novo pra mesma conta. Sem essa guarda, este trecho
    // releria o perfil no Firestore — que às vezes ainda não terminou de ser
    // gravado — e sobrescreveria um CURRENT_USER que já estava correto.
    if (CURRENT_USER && CURRENT_USER.uid === fbUser.uid) return;
    try{
      const ref = FS.doc(dbfs, 'users', fbUser.uid);
      const snap = await FS.getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      CURRENT_USER = {
        uid: fbUser.uid,
        email: fbUser.email || data.email || '',
        nome: data.nome || fbUser.displayName || (fbUser.email||'').split('@')[0],
      };
    }catch(e){
      console.warn('perfil load failed', e);
      CURRENT_USER = { uid: fbUser.uid, email: fbUser.email||'', nome: fbUser.displayName||'' };
    }
    APP.view = 'menu';
    APP.menuResumo = null;
    render();
    loadMenuResumo();
  });
}

async function loadMenuResumo(){
  try{
    const ref = FS.doc(dbfs, 'resumos', CURRENT_USER.uid);
    const snap = await FS.getDoc(ref);
    APP.menuResumo = snap.exists() ? snap.data() : {};
  }catch(e){
    console.warn('resumo load failed', e);
    APP.menuResumo = {};
  }
  if (APP.view === 'menu') render();
}

async function doLogout(){
  try{ await signOut(auth); }catch(e){ console.warn(e); }
}

/* ---------- Navegação dentro do app ---------- */

function selectModel(modelKey){
  APP.model = modelKey;
  APP.state = null;
  APP.step = 'sonhos';
  APP.view = 'wizard';
  render(); // mostra loading
  loadState(modelKey).then(st => {
    APP.state = st;
    render();
  });
}
function goHome(){
  APP.view = 'menu';
  APP.model = null;
  APP.state = null;
  render();
  loadMenuResumo();
}
function goStep(stepKey){
  APP.step = stepKey;
  render();
  window.scrollTo(0,0);
}
function resetModelData(){
  if (!confirm('Isso vai apagar todos os dados preenchidos neste modelo (na sua conta) e voltar aos exemplos. Quer continuar?')) return;
  const fresh = defaultState(APP.model);
  APP.state = fresh;
  saveState(APP.model, fresh);
  render();
}

/* ---------------------------------------------------------------------- */
/* Render raiz                                                             */
/* ---------------------------------------------------------------------- */

function render(){
  const root = document.getElementById('app');
  root.innerHTML = '';
  if (APP.view === 'loading'){ root.appendChild(renderLoading()); return; }
  if (APP.view === 'login'){ root.appendChild(renderAuth('login')); return; }
  if (APP.view === 'signup'){ root.appendChild(renderAuth('signup')); return; }
  if (APP.view === 'menu'){ root.appendChild(renderTopbar()); root.appendChild(renderMenu()); return; }
  if (APP.view === 'wizard'){
    root.appendChild(renderTopbar());
    if (!APP.state){ root.appendChild(renderLoading()); return; }
    const layout = el('div', {class:'layout'});
    layout.appendChild(renderStepper());
    const main = el('div', {class:'main'});
    main.appendChild(renderStepContent());
    layout.appendChild(main);
    root.appendChild(layout);
  }
}

function renderLoading(){
  return el('div', {class:'auth-loading'}, [el('span', {class:'spinner'}), 'carregando…']);
}

/* ---------------------------------------------------------------------- */
/* Login / Cadastro                                                        */
/* ---------------------------------------------------------------------- */

function renderAuth(mode){
  const wrap = el('div', {class:'auth-shell'});
  const card = el('div', {class:'auth-card'});
  card.appendChild(el('div', {class:'auth-brand'}, ['Precifica', el('span',{class:'sub'},['método 4C'])]));

  if (mode === 'login'){
    card.appendChild(el('h2', {class:'disp'}, ['Entrar na sua conta']));
    card.appendChild(el('p', {class:'sub'}, ['Acesse pra continuar de onde parou — seus dados ficam salvos durante toda a mentoria.']));
    if (APP.authMsg) card.appendChild(el('div', {class:'auth-error'}, [APP.authMsg]));

    const emailInp = el('input', {type:'email', autocomplete:'email', placeholder:'voce@email.com'});
    const senhaInp = el('input', {type:'password', autocomplete:'current-password', placeholder:'••••••••'});
    card.appendChild(el('div', {class:'auth-field'}, [el('label',{},['E-mail']), emailInp]));
    card.appendChild(el('div', {class:'auth-field'}, [el('label',{},['Senha']), senhaInp]));
    card.appendChild(el('div', {class:'auth-forgot'}, [
      el('button', {onclick: async () => {
        const email = emailInp.value.trim();
        if (!email){ APP.authMsg = 'Digite seu e-mail acima e clique de novo pra receber o link de redefinição.'; render(); return; }
        try{ await sendPasswordResetEmail(auth, email); APP.authMsg = ''; alert('Enviamos um e-mail com o link pra redefinir sua senha.'); }
        catch(e){ APP.authMsg = authErrorPt(e); render(); }
      }}, ['Esqueci minha senha']),
    ]));
    const submit = el('button', {class:'btn btn-primary auth-submit', onclick: async () => {
      submit.disabled = true;
      try{
        await signInWithEmailAndPassword(auth, emailInp.value.trim(), senhaInp.value);
        APP.authMsg = '';
      }catch(e){
        APP.authMsg = authErrorPt(e);
        submit.disabled = false;
        render();
      }
    }}, ['Entrar']);
    card.appendChild(submit);
    card.appendChild(el('div', {class:'auth-switch'}, [
      'Ainda não tem conta? ',
      el('button', {onclick: () => { APP.view='signup'; APP.authMsg=''; render(); }}, ['Cadastre-se']),
    ]));
    [emailInp, senhaInp].forEach(i => i.addEventListener('keydown', (e) => { if (e.key==='Enter') submit.click(); }));
  }

  if (mode === 'signup'){
    card.appendChild(el('h2', {class:'disp'}, ['Criar sua conta']));
    card.appendChild(el('p', {class:'sub'}, ['Leva menos de um minuto. Seus dados ficam salvos e acessíveis durante todo o período da mentoria.']));
    if (APP.authMsg) card.appendChild(el('div', {class:'auth-error'}, [APP.authMsg]));

    const nomeInp = el('input', {type:'text', autocomplete:'name', placeholder:'Seu nome'});
    const emailInp = el('input', {type:'email', autocomplete:'email', placeholder:'voce@email.com'});
    const senhaInp = el('input', {type:'password', autocomplete:'new-password', placeholder:'mínimo 6 caracteres'});
    const senha2Inp = el('input', {type:'password', autocomplete:'new-password', placeholder:'digite de novo'});
    card.appendChild(el('div', {class:'auth-field'}, [el('label',{},['Nome']), nomeInp]));
    card.appendChild(el('div', {class:'auth-field'}, [el('label',{},['E-mail']), emailInp]));
    card.appendChild(el('div', {class:'auth-field'}, [el('label',{},['Senha']), senhaInp]));
    card.appendChild(el('div', {class:'auth-field'}, [el('label',{},['Confirmar senha']), senha2Inp]));
    const submit = el('button', {class:'btn btn-primary auth-submit', onclick: async () => {
      if (!nomeInp.value.trim()){ APP.authMsg='Digite seu nome.'; render(); return; }
      if (senhaInp.value !== senha2Inp.value){ APP.authMsg='As senhas não são iguais.'; render(); return; }
      submit.disabled = true;
      try{
        const cred = await createUserWithEmailAndPassword(auth, emailInp.value.trim(), senhaInp.value);
        await updateProfile(cred.user, {displayName: nomeInp.value.trim()});
        await FS.setDoc(FS.doc(dbfs, 'users', cred.user.uid), {
          nome: nomeInp.value.trim(), email: emailInp.value.trim(), criadoEm: FS.serverTimestamp(),
        });
        await FS.setDoc(FS.doc(dbfs, 'resumos', cred.user.uid), {
          nome: nomeInp.value.trim(), email: emailInp.value.trim(),
        }, {merge:true});
        APP.authMsg = '';
        // Monta o usuário atual diretamente com os dados que acabamos de gravar,
        // em vez de esperar o listener de autenticação reler o Firestore — essa
        // releitura pode disparar antes da gravação acima terminar (ver nota em
        // initAuthListener).
        CURRENT_USER = { uid: cred.user.uid, email: emailInp.value.trim(), nome: nomeInp.value.trim() };
        APP.view = 'menu';
        APP.menuResumo = null;
        render();
        loadMenuResumo();
      }catch(e){
        APP.authMsg = authErrorPt(e);
        submit.disabled = false;
        render();
      }
    }}, ['Criar conta']);
    card.appendChild(submit);
    card.appendChild(el('div', {class:'auth-switch'}, [
      'Já tem conta? ',
      el('button', {onclick: () => { APP.view='login'; APP.authMsg=''; render(); }}, ['Entrar']),
    ]));
  }

  wrap.appendChild(card);
  return wrap;
}

/* ---------------------------------------------------------------------- */
/* Topbar                                                                  */
/* ---------------------------------------------------------------------- */

function renderTopbar(){
  const bar = el('div', {class:'topbar'});
  bar.appendChild(el('div', {class:'brand'}, ['Precifica', el('span',{class:'sub'},['método 4C'])]));
  if (APP.view === 'wizard'){
    const m = MODELS[APP.model];
    bar.appendChild(el('div', {class:'model-pill'}, ['Modelo: ', el('b',{},[m.label])]));
  }
  bar.appendChild(el('div', {class:'topbar-spacer'}));
  if (APP.view === 'wizard'){
    const ind = el('span', {class:'save-indicator', id:'save-indicator'}, [el('span',{class:'dot'}), el('span',{class:'txt'},['salvo na sua conta'])]);
    bar.appendChild(ind);
    bar.appendChild(el('button', {class:'btn-ghost', onclick: goHome}, ['☰ Menu principal']));
    bar.appendChild(el('button', {class:'btn-ghost', onclick: resetModelData}, ['Limpar dados']));
  }
  if (APP.view === 'menu'){
    if (CURRENT_USER) bar.appendChild(el('span', {style:'font-size:13px;color:var(--ink-soft);'}, ['Olá, ', el('b',{style:'color:var(--ink);'},[CURRENT_USER.nome])]));
  }
  if (CURRENT_USER) bar.appendChild(el('button', {class:'btn-ghost', onclick: doLogout}, ['Sair']));
  return bar;
}

/* ---------------------------------------------------------------------- */
/* Menu principal                                                         */
/* ---------------------------------------------------------------------- */

function fmtWhen(ts){
  try{
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric'});
  }catch(e){ return ''; }
}

function renderMenu(){
  const wrap = el('div', {class:'home'});
  wrap.appendChild(el('div', {class:'home-hero'}, [
    el('div', {class:'eyebrow'}, ['PRECIFICA · Método 4C']),
    el('h1', {class:'disp'}, ['Descubra o preço certo do seu trabalho.']),
    el('p', {}, ['Escolha um modelo pra continuar (ou começar). Seus dados ficam salvos na sua conta — você pode entrar de qualquer aparelho durante toda a mentoria.']),
  ]));

  const userbar = el('div', {class:'menu-userbar'});
  userbar.appendChild(el('span', {class:'who'}, ['Conta: ', el('b',{},[CURRENT_USER.email])]));
  wrap.appendChild(userbar);

  const grid = el('div', {class:'model-grid'});
  const resumo = APP.menuResumo;
  Object.values(MODELS).forEach(m => {
    const card = el('div', {class:'model-card', onclick:()=>selectModel(m.key)}, [
      el('span', {class:'tag'}, [m.tag]),
      el('h3', {class:'disp'}, [m.label]),
      el('p', {}, [m.desc]),
      el('div', {class:'ex'}, [m.examples]),
    ]);
    const r = resumo && resumo[m.key];
    if (resumo === null){
      card.appendChild(el('div', {class:'progress-line'}, ['carregando…']));
    } else if (r){
      card.appendChild(el('div', {class:'progress-line'}, [
        el('span', {}, ['meta ', el('b',{},[fmtBRL(r.meta)])]),
        el('span', {}, [r.bateMeta ? '✅ bate a meta' : '❌ ainda não bate']),
      ]));
    } else {
      card.appendChild(el('div', {class:'progress-line'}, [el('span',{},['ainda não preenchido'])]));
    }
    grid.appendChild(card);
  });
  wrap.appendChild(grid);

  wrap.appendChild(el('ul', {class:'note-list', style:'margin-top:34px;max-width:560px;'}, [
    el('li', {}, ['Seus dados ficam salvos na sua conta — dá pra continuar de qualquer computador ou celular.']),
    el('li', {}, ['Pode preencher mais de um modelo — cada um guarda os dados separadamente.']),
    el('li', {}, ['Só você tem acesso ao que preenche.']),
  ]));
  return wrap;
}

/* ---------------------------------------------------------------------- */
/* Stepper lateral (wizard)                                                */
/* ---------------------------------------------------------------------- */

function stepTitle(stepKey){
  const m = MODELS[APP.model];
  if (stepKey === 'insumos') return m.insumosLabel;
  if (stepKey === 'calcular') return m.calcTitle;
  return STEP_LABEL[stepKey];
}

function renderStepper(){
  const nav = el('div', {class:'stepper'});
  const steps = stepsFor(APP.model);
  const curIdx = steps.indexOf(APP.step);
  steps.forEach((s, i) => {
    const item = el('div', {
      class:'step-item' + (s===APP.step?' active':'') + (i<curIdx?' done':''),
      onclick: () => goStep(s),
    }, [
      el('span', {class:'n'}, [i<curIdx?'✓':String(i+1)]),
      el('span', {}, [stepTitle(s)]),
    ]);
    nav.appendChild(item);
  });
  return nav;
}

/* ---------------------------------------------------------------------- */
/* Conteúdo da etapa (dispatch)                                            */
/* ---------------------------------------------------------------------- */

function renderStepContent(){
  const panel = el('div', {class:'panel'});
  const fn = {
    sonhos: renderStepSonhos, meta: renderStepMeta, vida: renderStepVida, negocio: renderStepNegocio,
    insumos: renderStepInsumos, hora: renderStepHora, calcular: renderStepCalcular,
    resumo: renderStepResumo, crescer: renderStepCrescer,
  }[APP.step];
  fn(panel);
  return panel;
}

function panelHead(panel, eyebrow, title, desc, extra){
  const head = el('div', {class:'panel-head'}, [
    el('div', {class:'eyebrow'}, [eyebrow]),
    el('h2', {class:'disp'}, [title]),
    el('p', {}, [desc]),
  ]);
  if (extra) head.appendChild(extra);
  panel.appendChild(head);
}

function legendRow(){
  return el('div', {class:'legend'}, [
    el('span', {class:'li'}, [el('span',{class:'dot y'}), 'você preenche']),
    el('span', {class:'li'}, [el('span',{class:'dot g'}), 'cálculo automático']),
    el('span', {class:'li'}, [el('span',{class:'dot v'}), 'resultado-chave']),
  ]);
}

function footNav(panel, {backStep, nextStep, nextLabel}){
  const steps = stepsFor(APP.model);
  const idx = steps.indexOf(APP.step);
  const back = idx>0 ? steps[idx-1] : null;
  const next = idx<steps.length-1 ? steps[idx+1] : null;
  const nav = el('div', {class:'foot-nav'});
  nav.appendChild(back ? el('button',{class:'btn btn-secondary', onclick:()=>goStep(back)}, ['← Voltar: ' + stepTitle(back)]) : el('span'));
  nav.appendChild(next ? el('button',{class:'btn btn-primary', onclick:()=>goStep(next)}, [(nextLabel||('Avançar: ' + stepTitle(next))) + ' →']) : el('span'));
  panel.appendChild(nav);
}

/* ---------------------------------------------------------------------- */
/* Campo numérico genérico (BRL / percent / plain)                         */
/* ---------------------------------------------------------------------- */

function numberInput(opts){
  const wrap = el('div', {class:'inp-wrap'});
  const input = document.createElement('input');
  input.className = 'inp' + (opts.locked?' locked':'') + (opts.result?' result':'');
  input.type = 'text';
  input.inputMode = 'decimal';
  const display = (v) => {
    if (opts.kind === 'pct') return fmtNum(v*100, 2);
    return fmtNum(v, opts.dec==null?2:opts.dec);
  };
  input.value = display(opts.value||0);
  if (opts.locked) input.readOnly = true;
  input.addEventListener('focus', () => input.select());
  const parseNow = () => {
    let n = parseBR(input.value);
    if (opts.kind === 'pct') n = n/100;
    if (opts.min!=null && n<opts.min) n = opts.min;
    return n;
  };
  if (!opts.locked){
    input.addEventListener('input', () => { opts.onInput && opts.onInput(parseNow()); });
    input.addEventListener('blur', () => { input.value = display(parseNow()); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  }
  wrap.appendChild(input);
  if (opts.kind === 'pct') wrap.appendChild(el('span',{class:'inp-suffix'},['%']));
  if (opts.kind === 'brl') { input.style.paddingLeft='24px'; wrap.appendChild(el('span',{class:'inp-suffix', style:'left:10px;right:auto;'}, ['R$'])); }
  return wrap;
}

function outSpan(id, text){
  return el('span', {id:id, class:'mono'}, [text]);
}
/* ---------------------------------------------------------------------- */
/* Etapa: categorias genéricas (Vida pessoal / Meu Negócio)                 */
/* ---------------------------------------------------------------------- */

function renderCategoryStep(panel, opts){
  // opts: {eyebrow, title, desc, cats, stateKey, totalLabel}
  panelHead(panel, opts.eyebrow, opts.title, opts.desc);
  panel.querySelector('.panel-head').appendChild(legendRow());
  const body = el('div', {class:'panel-body'});
  const arr = APP.state[opts.stateKey];
  const totalId = 'total-' + opts.stateKey;

  function updateTotal(){
    const inp = document.getElementById(totalId);
    if (inp) inp.value = fmtNum(sumArr(arr), 2);
  }

  let idx = 0;
  opts.cats.forEach(cat => {
    const group = el('div', {class:'cat-group'});
    group.appendChild(el('div', {class:'cat-title'}, [cat.name]));
    if (opts.onCatStart) opts.onCatStart(cat, group);
    cat.items.forEach(label => {
      const i = idx++;
      const row = el('div', {class:'field-row'});
      row.appendChild(el('label', {}, [label]));
      row.appendChild(numberInput({
        value: arr[i]||0, kind:'brl',
        onInput: (n) => { arr[i] = n; persist(); updateTotal(); if (opts.onChange) opts.onChange(); },
      }));
      group.appendChild(row);
    });
    if (opts.onCatEnd) opts.onCatEnd(cat, group);
    body.appendChild(group);
  });

  const totalRow = el('div', {class:'field-total'});
  totalRow.appendChild(el('label', {}, [opts.totalLabel]));
  const totalField = numberInput({value: sumArr(arr), kind:'brl', locked:true});
  totalField.querySelector('input').id = totalId;
  totalRow.appendChild(totalField);
  body.appendChild(totalRow);

  panel.appendChild(body);
  footNav(panel, {});
}

function renderStepVida(panel){
  renderCategoryStep(panel, {
    eyebrow:'1º passo — Conhecer', title:'Minha Vida Pessoal',
    desc:'Cada centavo que sai do seu bolso no mês — inclusive o que você guarda (reserva de emergência, poupança, investimentos). Esse total é a base do seu pró-labore na Minha Meta. Não esqueça nada — lista incompleta destrói o cálculo lá na frente.',
    cats: VIDA_CATS, stateKey:'vida', totalLabel:'Total vida pessoal (mensal)',
    onCatStart: (cat, group) => {
      if (cat.name !== 'FAMÍLIA') return;
      const st = APP.state;
      const row = el('div', {class:'field-row'});
      row.appendChild(el('label', {style:'font-weight:700;'}, ['Número de filhos', el('div',{class:'help'},['Pra calcular quanto cada filho custa por mês. Coloque 0 se não tiver.'])]));
      row.appendChild(numberInput({value: st.filhos||0, kind:'num', dec:0, min:0, onInput:(n)=>{ st.filhos = Math.round(n)||0; persist(); updateFilhos(); }}));
      group.appendChild(row);
    },
    onCatEnd: (cat, group) => {
      if (cat.name !== 'FAMÍLIA') return;
      group.appendChild(el('div', {class:'field-total', id:'filhos-resumo'}, [
        el('label', {id:'filhos-resumo-lbl'}, ['']),
        el('span', {id:'filhos-resumo-val', class:'mono', style:'font-weight:700;'}, ['']),
      ]));
    },
    onChange: () => updateFilhos(),
  });
  requestAnimationFrame(updateFilhos);
}
function gastoFilhos(state){
  return VIDA_FLAT.reduce((s,it,i) => s + (VIDA_ITENS_FILHOS.includes(it.label) ? (parseBR((state.vida||[])[i])||0) : 0), 0);
}
function updateFilhos(){
  const st = APP.state; if (!st) return;
  const box = document.getElementById('filhos-resumo'); if (!box) return;
  const n = parseBR(st.filhos)||0, total = gastoFilhos(st);
  box.style.display = (n > 0 || total > 0) ? '' : 'none';
  document.getElementById('filhos-resumo-lbl').textContent = n > 0
    ? 'Gasto com filhos: ' + fmtBRL(total) + ' por mês — média por filho (' + n + (n===1?' filho':' filhos') + ')'
    : 'Gasto com filhos por mês (informe o número de filhos pra ver a média)';
  document.getElementById('filhos-resumo-val').textContent = fmtBRL(n > 0 ? total / n : total);
}

function renderStepNegocio(panel){
  const m = MODELS[APP.model];
  renderCategoryStep(panel, {
    eyebrow:'3º passo — Conhecer', title:m.negocioTitle,
    desc: m.negocioDesc,
    cats: NEGOCIO_CATS[APP.model], stateKey:'negocio', totalLabel: m.negocioTotalLabel,
  });
}

/* ---------------------------------------------------------------------- */
/* Etapa: Meus Sonhos                                                      */
/* ---------------------------------------------------------------------- */

function renderStepSonhos(panel){
  panelHead(panel, 'Introdução', 'Meus Sonhos',
    'Antes de qualquer cálculo: por que você trabalha tanto? Pelo que você luta? O valor que sobrar aqui embaixo é o que precisa SOBRAR todo mês, além de pagar tudo — pra você realizar isso.');
  const body = el('div', {class:'panel-body'});
  const st = APP.state;
  const taxas = st.sonhosTaxas;

  // Correção pela inflação — só para sonhos pagos à vista (Viagem, Outro sem financiamento)
  const rows = st.sonhos;
  const precisaCorrecao = () => rows.some(r => r.tipo ? !isFinanciado(r) : parseBR(r.custo) > 0);
  const taxaBox = el('div', {class:'cat-group', id:'sonho-taxa-box'});
  taxaBox.appendChild(el('div', {class:'cat-title'}, ['Correção pela inflação (sonhos pagos à vista)']));
  const ipcaRow = el('div', {class:'field-row'});
  ipcaRow.appendChild(el('label', {}, ['IPCA acumulado 12 meses', el('div',{class:'help'},['Inflação oficial (IBGE). Vale pra Viagem e Outro sem financiamento: você junta o dinheiro e paga à vista, então não há juros — só a inflação. Em set/2026: 4,58%.'])]));
  ipcaRow.appendChild(numberInput({value:taxas.ipca, kind:'pct', onInput:(n)=>{ taxas.ipca=n; persist(); updateAll(); }}));
  taxaBox.appendChild(ipcaRow);
  taxaBox.style.display = precisaCorrecao() ? '' : 'none';
  body.appendChild(taxaBox);

  const wrap = el('div', {class:'table-wrap'});
  const table = el('table', {class:'grid'});
  table.appendChild(el('thead', {}, [el('tr', {}, [
    el('th',{},['#']), el('th',{},['Meu sonho']), el('th',{},['Custo hoje (R$)']),
    el('th',{},['Prazo (meses)']), el('th',{},['Custo corrigido (R$)']), el('th',{},['Valor mensal necessário']),
  ])]));
  const tbody = el('tbody');

  function updateRow(i){
    const r = rows[i];
    const c = document.querySelector('[data-sonho-corr="'+i+'"]');
    if (c) c.textContent = fmtBRL(sonhoCustoCorrigido(st, r));
    const o = document.querySelector('[data-sonho-out="'+i+'"]');
    if (o) o.textContent = fmtBRL(sonhoMensal(st, r));
  }
  function updateTotals(){
    const set = (id, v) => { const x = document.getElementById(id); if (x) x.textContent = v; };
    set('sonho-total-custo', fmtBRL(rows.reduce((s,r)=>s+parseBR(r.custo),0)));
    set('sonho-total-corr', fmtBRL(rows.reduce((s,r)=>s+sonhoCustoCorrigido(st,r),0)));
    set('sonho-total-mensal', fmtBRL(sumSonhosMensal(st)));
    const tb = document.getElementById('sonho-taxa-box'); if (tb) tb.style.display = precisaCorrecao() ? '' : 'none';
  }
  function updateAll(){ rows.forEach((_,i)=>updateRow(i)); updateTotals(); }

  rows.forEach((r, i) => {
    const tr = el('tr');
    tr.appendChild(el('td', {}, [String(i+1)]));
    const descTd = el('td', {class:'col-name'});
    const sel = el('select', {class:'inp'});
    SONHO_TIPOS.forEach(t => sel.appendChild(el('option', {value:t.key, selected: t.key===(r.tipo||'') ? 'selected' : null}, [t.label])));
    const descInput = el('input', {class:'inp text-left', value:r.desc||'', placeholder:'escreva seu sonho…', style:'margin-top:6px;'});
    descInput.style.display = r.tipo === 'outro' ? '' : 'none';
    const moradiaBox = el('div', {style:'display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap;'});
    const moradiaBtn = el('button', {class:'btn btn-secondary btn-sm', type:'button'}, [finCfg(r).btn]);
    const moradiaResumo = el('span', {class:'help', style:'margin:0;'}, [moradiaResumoTexto(r)]);
    moradiaBtn.addEventListener('click', (ev) => {
      openMoradiaPopover(moradiaBtn, r, () => {
        persist(); updateRow(i); updateTotals();
        moradiaResumo.textContent = moradiaResumoTexto(r);
      });
      ev.stopPropagation();
    });
    moradiaBox.appendChild(moradiaBtn);
    moradiaBox.appendChild(moradiaResumo);
    moradiaBox.style.display = isFinanciado(r) ? '' : 'none';
    const finChk = el('input', {type:'checkbox'});
    finChk.checked = !!r.financiar;
    const finLbl = el('label', {class:'help', style:'display:flex;align-items:center;gap:6px;margin:6px 0 0;cursor:pointer;'}, [finChk, 'Vou financiar / parcelar']);
    finLbl.style.display = r.tipo === 'outro' ? 'flex' : 'none';
    finChk.addEventListener('change', () => {
      r.financiar = finChk.checked;
      if (r.financiar && !r._finOutroInit){ r.entrada = 0; r._finOutroInit = true; }
      finAjustaPreset(r);
      moradiaBox.style.display = isFinanciado(r) ? '' : 'none';
      if (isFinanciado(r)){ moradiaBtn.textContent = finCfg(r).btn; moradiaResumo.textContent = moradiaResumoTexto(r); }
      persist(); updateRow(i); updateTotals();
    });
    sel.addEventListener('change', () => {
      r.tipo = sel.value;
      descInput.style.display = r.tipo === 'outro' ? '' : 'none';
      if (r.tipo === 'outro'){ descInput.focus(); }
      else { r.desc = ''; descInput.value = ''; }
      finLbl.style.display = r.tipo === 'outro' ? 'flex' : 'none';
      if (r.tipo === 'outro' && r.financiar && !r._finOutroInit){ r.entrada = 0; r._finOutroInit = true; }
      finAjustaPreset(r);
      moradiaBox.style.display = isFinanciado(r) ? '' : 'none';
      if (isFinanciado(r)){ moradiaBtn.textContent = finCfg(r).btn; moradiaResumo.textContent = moradiaResumoTexto(r); }
      persist();
      updateRow(i); updateTotals();
    });
    descInput.addEventListener('input', () => { r.desc = descInput.value; persist(); });
    descTd.appendChild(sel);
    descTd.appendChild(descInput);
    descTd.appendChild(finLbl);
    descTd.appendChild(moradiaBox);
    tr.appendChild(descTd);
    tr.appendChild(el('td', {}, [numberInput({value:r.custo, kind:'brl', onInput:(n)=>{ r.custo=n; persist(); updateRow(i); updateTotals(); }})]));
    tr.appendChild(el('td', {}, [numberInput({value:r.prazo, kind:'num', dec:0, onInput:(n)=>{ r.prazo=n; persist(); updateRow(i); updateTotals(); }})]));
    tr.appendChild(el('td', {}, [el('span', {class:'mono', style:'font-weight:600;', 'data-sonho-corr':String(i)}, [fmtBRL(sonhoCustoCorrigido(st, r))])]));
    tr.appendChild(el('td', {}, [el('span', {class:'mono', style:'font-weight:700;color:var(--green-strong);', 'data-sonho-out':String(i)}, [fmtBRL(sonhoMensal(st, r))])]));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  const tfoot = el('tfoot', {}, [el('tr', {}, [
    el('td',{colspan:'2', style:'text-align:right;font-weight:800;'},['TOTAL']),
    el('td',{}, [el('span',{id:'sonho-total-custo', class:'mono', style:'font-weight:700;'},[fmtBRL(rows.reduce((s,r)=>s+parseBR(r.custo),0))])]),
    el('td'),
    el('td',{}, [el('span',{id:'sonho-total-corr', class:'mono', style:'font-weight:700;'},[fmtBRL(rows.reduce((s,r)=>s+sonhoCustoCorrigido(st,r),0))])]),
    el('td',{}, [el('span',{id:'sonho-total-mensal', class:'mono', style:'font-weight:800;color:var(--green-strong);'},[fmtBRL(sumSonhosMensal(st))])]),
  ])]);
  table.appendChild(tfoot);
  wrap.appendChild(table);
  body.appendChild(wrap);

  body.appendChild(el('p', {class:'help'}, ['Viagem e Outro sem financiamento: você junta o dinheiro e paga à vista, então o "custo corrigido" aplica só a inflação (IPCA) sobre o custo de hoje, proporcional ao prazo: custo × (1 + IPCA)^(meses ÷ 12). O valor mensal é o custo corrigido dividido pelo prazo.']));
  body.appendChild(el('p', {class:'help'}, [
    el('b',{},['Moradia, Automóvel e Outro financiado são diferentes: ']), 'quando há financiamento, "Custo hoje" é o valor do bem, "Prazo" é o prazo do financiamento, "Custo corrigido" é tudo que sai do bolso (entrada + todas as parcelas) e "Valor mensal necessário" é a parcela mensal de verdade — calculada pela Tabela Price, no botão "Financiamento" da linha.',
  ]));
  body.appendChild(el('p', {class:'help'}, ['Taxas de financiamento de referência pesquisadas no mercado em out/2026 (imóvel: Caixa / Minha Casa Minha Vida e SBPE; veículo: Banco Central, média de ago/2026 e médias por banco de set/2026; crédito pessoal e consignado: Banco Central, ago e out/2026) — a taxa real aprovada depende da sua renda, região, relacionamento bancário e análise de crédito; confirme sempre com o banco antes de decidir.']));
  body.appendChild(el('div', {class:'callout'}, [
    el('b',{},['Esse valor mensal dos sonhos']), ' entra na sugestão do seu pró-labore, na etapa Minha Meta: é o que precisa sobrar, além das suas contas, pra viver a vida que você sonha.',
  ]));
  panel.appendChild(body);
  footNav(panel, {});
}

/* ---------------------------------------------------------------------- */
/* Etapa: Minha Meta                                                       */
/* ---------------------------------------------------------------------- */

function renderStepMeta(panel){
  const st = APP.state;
  panelHead(panel, '2º passo — Conhecer', 'Minha Meta',
    'Quanto o seu negócio precisa te entregar todo mês, depois de pagar os custos dele, os impostos e os repasses — pra pagar sua vida, realizar seus sonhos e crescer.');
  panel.querySelector('.panel-head').appendChild(legendRow());
  const body = el('div', {class:'panel-body'});

  const vida = sumVida(st);
  const sonhos = sumSonhosMensal(st);
  const sugerido = prolaboreSugerido(st);

  // Referências (automáticas)
  const ref = el('div', {class:'cat-group'});
  ref.appendChild(el('div', {class:'cat-title'}, ['De onde vem o seu pró-labore']));
  const refRow = (label, help, val) => {
    const r = el('div', {class:'field-row'});
    r.appendChild(el('label', {}, [label, el('div',{class:'help'},[help])]));
    r.appendChild(numberInput({value: val, kind:'brl', locked:true}));
    ref.appendChild(r);
  };
  refRow('Custo da vida pessoal', 'Total da tela Minha Vida — suas contas, reservas e investimentos.', vida);
  refRow('Seus sonhos (por mês)', 'Total mensal da tela Meus Sonhos, já corrigido.', sonhos);
  const sugRow = el('div', {class:'field-total'});
  sugRow.appendChild(el('label', {}, ['Pró-labore sugerido (vida + sonhos)']));
  sugRow.appendChild(el('span', {class:'mono', style:'font-weight:700;'}, [fmtBRL(sugerido)]));
  ref.appendChild(sugRow);
  body.appendChild(ref);

  if (!vida){
    body.appendChild(el('div', {class:'callout'}, [
      el('b',{},['Sua vida pessoal ainda está zerada. ']), 'Preencha a Minha Vida Pessoal pra ter uma referência real de pró-labore. ',
      el('button', {class:'btn btn-secondary btn-sm', onclick:()=>goStep('vida')}, ['Ir para Minha Vida']),
    ]));
  }

  // O que a pessoa decide
  const dec = el('div', {class:'cat-group'});
  dec.appendChild(el('div', {class:'cat-title'}, ['O que você decide']));
  const proRow = el('div', {class:'field-row'});
  proRow.appendChild(el('label', {}, ['Pró-labore (seu salário)', el('div',{class:'help'},['Quanto você precisa ter por mês pra viver — somando tudo que entra. Comece pela sugestão e ajuste.'])]));
  const proField = numberInput({value: prolaboreAtual(st), kind:'brl', onInput:(n)=>{ st.meta.prolabore = n; refresh(); persist(); }});
  proField.querySelector('input').id = 'meta-prolabore';
  proRow.appendChild(proField);
  dec.appendChild(proRow);
  const aviso = el('div', {id:'meta-aviso', class:'callout', style:'display:none;'});
  dec.appendChild(aviso);
  dec.appendChild(el('button', {class:'btn btn-secondary btn-sm', style:'margin:4px 0 12px;', onclick:()=>{
    st.meta.prolabore = null; persist();
    document.getElementById('meta-prolabore').value = fmtNum(prolaboreSugerido(st), 2);
    refresh();
  }}, ['Usar o valor sugerido']));

  const cresRow = el('div', {class:'field-row'});
  cresRow.appendChild(el('label', {}, ['Crescimento profissional', el('div',{class:'help'},['Cursos, congressos, mentorias — o que financia sua evolução no trabalho. Viagens e lazer já entram na Minha Vida.'])]));
  cresRow.appendChild(numberInput({value: st.meta.crescimento, kind:'brl', onInput:(n)=>{ st.meta.crescimento = n; refresh(); persist(); }}));
  dec.appendChild(cresRow);
  body.appendChild(dec);

  // ---- Outras fontes de renda ----
  const rendas = st.rendas;
  const rendBox = el('div', {class:'cat-group'});
  rendBox.appendChild(el('div', {class:'cat-title'}, ['Outras fontes de renda']));
  const chk = el('input', {type:'checkbox', id:'rendas-ativo'});
  chk.checked = !!rendas.ativo;
  rendBox.appendChild(el('label', {for:'rendas-ativo', class:'rendas-toggle'}, [chk,
    el('span', {}, [el('b',{},['Tenho outras rendas além deste negócio']), el('div',{class:'help'},['CLT, outro negócio, investimentos, aluguel… Elas cobrem parte da sua meta, e este negócio só precisa entregar o que falta.'])]),
  ]));
  const rendLista = el('div', {class:'rendas-lista'});
  rendBox.appendChild(rendLista);
  body.appendChild(rendBox);

  function drawRendas(){
    rendLista.innerHTML = '';
    rendLista.style.display = rendas.ativo ? '' : 'none';
    if (!rendas.ativo) return;
    rendas.itens.forEach((it, i) => {
      const row = el('div', {class:'renda-row'});
      const sel = el('select', {class:'inp'});
      RENDA_TIPOS.forEach(t => sel.appendChild(el('option', {value:t.key, selected: t.key===it.tipo?'selected':null}, [t.label])));
      const nome = el('input', {class:'inp text-left', value: it.desc||'', placeholder: it.tipo==='outra' ? 'qual renda?' : 'nome (opcional)'});
      const help = el('div', {class:'help', style:'grid-column:1 / -1;margin:0;'}, [rendaTipo(it.tipo).help]);
      sel.addEventListener('change', () => {
        it.tipo = sel.value; help.textContent = rendaTipo(it.tipo).help;
        nome.placeholder = it.tipo==='outra' ? 'qual renda?' : 'nome (opcional)';
        persist();
      });
      nome.addEventListener('input', () => { it.desc = nome.value; persist(); });
      const val = numberInput({value: it.valor||0, kind:'brl', onInput:(n)=>{ it.valor = n; persist(); refresh(); }});
      const del = el('button', {class:'btn btn-secondary btn-sm', type:'button', title:'Remover', onclick:()=>{ rendas.itens.splice(i,1); persist(); drawRendas(); refresh(); }}, ['✕']);
      row.appendChild(sel); row.appendChild(nome); row.appendChild(val); row.appendChild(del); row.appendChild(help);
      rendLista.appendChild(row);
    });
    rendLista.appendChild(el('button', {class:'btn btn-secondary btn-sm', type:'button', style:'margin-top:6px;', onclick:()=>{
      rendas.itens.push({tipo: rendas.itens.length ? 'outra' : 'clt', desc:'', valor:0}); persist(); drawRendas(); refresh();
    }}, ['+ Adicionar renda']));
    const tot = el('div', {class:'field-total'});
    tot.appendChild(el('label', {}, ['Total das outras rendas (por mês)']));
    tot.appendChild(el('span', {id:'rendas-total', class:'mono', style:'font-weight:700;'}, [fmtBRL(sumOutrasRendas(st))]));
    rendLista.appendChild(tot);
  }
  chk.addEventListener('change', () => {
    rendas.ativo = chk.checked;
    if (rendas.ativo && !rendas.itens.length) rendas.itens.push({tipo:'clt', desc:'', valor:0});
    persist(); drawRendas(); refresh();
  });
  drawRendas();

  // ---- Totais ----
  const totBox = el('div', {class:'cat-group'});
  const linhaTotal = el('div', {class:'field-row', id:'meta-linha-total'}, [
    el('label', {}, ['Meta total (pró-labore + crescimento)']),
    el('span', {id:'meta-total', class:'mono', style:'font-weight:700;text-align:right;'}, ['']),
  ]);
  const linhaOutras = el('div', {class:'field-row', id:'meta-linha-outras'}, [
    el('label', {}, ['− Outras rendas']),
    el('span', {id:'meta-outras', class:'mono', style:'font-weight:700;text-align:right;'}, ['']),
  ]);
  totBox.appendChild(linhaTotal); totBox.appendChild(linhaOutras);
  const totalRow = el('div', {class:'field-total'});
  totalRow.appendChild(el('label', {id:'meta-principal-label', style:'font-weight:800;font-size:15px;'}, ['💰 Meta de lucro mensal']));
  const metaField = numberInput({value: computeMetaNegocio(st), kind:'brl', locked:true, result:true});
  metaField.querySelector('input').id = 'meta-principal';
  metaField.querySelector('input').style.fontSize = '16px';
  totalRow.appendChild(metaField);
  totBox.appendChild(totalRow);
  totBox.appendChild(el('p', {class:'help', id:'meta-principal-help'}, ['']));
  totBox.appendChild(el('div', {id:'rendas-aviso', class:'callout', style:'display:none;'}));
  body.appendChild(totBox);

  function refresh(){
    st.meta.valor = computeMeta(st);
    const outras = sumOutrasRendas(st);
    const metaNeg = computeMetaNegocio(st);
    const $ = (id) => document.getElementById(id);
    const x = $('meta-principal'); if (x) x.value = fmtNum(metaNeg, 2);
    const temOutras = outras > 0;
    if ($('meta-linha-total')){
      $('meta-linha-total').style.display = temOutras ? '' : 'none';
      $('meta-linha-outras').style.display = temOutras ? '' : 'none';
      $('meta-total').textContent = fmtBRL(st.meta.valor);
      $('meta-outras').textContent = '− ' + fmtBRL(outras);
      $('meta-principal-label').textContent = temOutras ? '💰 Este negócio precisa entregar' : '💰 Meta de lucro mensal';
      $('meta-principal-help').textContent = temOutras
        ? 'Meta total menos suas outras rendas. É esse valor que o Precifica usa pra calcular seus preços e conferir se você bate a meta.'
        : 'Calculada automaticamente: pró-labore + crescimento profissional.';
      const rt = $('rendas-total'); if (rt) rt.textContent = fmtBRL(outras);
      const av = $('rendas-aviso');
      if (temOutras && outras >= st.meta.valor){
        av.style.display = '';
        av.innerHTML = '<b>Suas outras rendas já cobrem toda a sua meta.</b> Tudo que este negócio lucrar é extra — dá pra acelerar os sonhos ou investir no crescimento.';
      } else av.style.display = 'none';
    }
    const p = prolaboreAtual(st);
    const a = document.getElementById('meta-aviso');
    if (!a) return;
    if (vida && p < vida){
      a.style.display = '';
      a.innerHTML = '<b>Atenção:</b> esse pró-labore não paga nem a sua vida pessoal (' + fmtBRL(vida) + '). Faltam ' + fmtBRL(vida - p) + ' por mês.';
    } else if (sonhos && p < sugerido){
      a.style.display = '';
      a.innerHTML = '<b>Suas contas estão cobertas</b>, mas sobram ' + fmtBRL(p - vida) + ' pros sonhos — eles pedem ' + fmtBRL(sonhos) + ' por mês. Ou aumenta o pró-labore, ou alonga o prazo dos sonhos.';
    } else {
      a.style.display = 'none';
    }
  }
  panel.appendChild(body);
  footNav(panel, {});
  // os elementos precisam estar na página antes do primeiro cálculo
  requestAnimationFrame(refresh);
}

/* ---------------------------------------------------------------------- */
/* Etapa: Insumos / Matéria-Prima                                          */
/* ---------------------------------------------------------------------- */

// Materiais odontológicos comuns, pra marcar em vez de digitar. Só nome e quantidade
// típica da embalagem — o PREÇO o aluno preenche com o que ele paga.
const MATERIAIS_ODONTO = [
  ['Luvas de procedimento (caixa)', 100], ['Máscara descartável (caixa)', 50], ['Gorro / touca (pacote)', 100],
  ['Avental descartável (pacote)', 10], ['Babador / guardanapo descartável (pacote)', 100], ['Sugador descartável (pacote)', 40],
  ['Copo descartável (pacote)', 100], ['Rolete de algodão (pacote)', 100], ['Anestésico (caixa de tubetes)', 50],
  ['Agulha gengival (caixa)', 100], ['Resina composta (seringa)', 1], ['Ácido fosfórico (seringa)', 1],
  ['Sistema adesivo (frasco)', 1], ['Pasta profilática (pote)', 1], ['Flúor gel (frasco)', 1],
  ['Envelope para esterilização (caixa)', 200], ['Filme PVC / barreira (rolo)', 1], ['Fio de sutura (caixa)', 24],
  ['Broca (unidade)', 1], ['Escova de Robinson (unidade)', 1],
];

function renderStepInsumosPrestador(panel){
  const m = MODELS[APP.model];
  const st = APP.state;
  panelHead(panel, '5º passo — Conhecer', 'Insumos',
    'Os materiais que você usa nos atendimentos. Preencha só três coisas: o nome, quanto pagou e quantas unidades vêm. O custo de cada unidade sai sozinho.');
  const body = el('div', {class:'panel-body'});
  const list = el('div', {class:'ins-list'});
  body.appendChild(list);
  const usoCount = (id) => (st.calcular||[]).filter(r => r.matModo === 'lista' && (r.materiais||[]).some(x => x.id === id)).length;

  function rebuild(){
    list.innerHTML = '';
    list.appendChild(el('div', {class:'ins-row ins-head'}, [
      el('span', {}, ['Material']), el('span', {}, ['Preço pago (R$)']), el('span', {}, ['Unidades que vêm']), el('span', {}, ['Custo por unidade']), el('span'),
    ]));
    (st.insumos||[]).forEach((r, i) => {
      if (!r.id) r.id = uid();
      const row = el('div', {class:'ins-row'});
      const nome = el('input', {class:'inp text-left', value:r.nome||'', placeholder:'ex.: luvas (caixa)'});
      nome.addEventListener('input', () => { r.nome = nome.value; persist(); });
      const out = el('b', {class:'mono'}, [fmtBRL(insumoCustoUn(r))]);
      const upd = () => { out.textContent = fmtBRL(insumoCustoUn(r)); };
      const valor = numberInput({value:r.valor, kind:'brl', onInput:(n)=>{ r.valor=n; persist(); upd(); }});
      if (!parseBR(r.valor)) valor.querySelector('input').classList.add('ins-falta');
      const usos = usoCount(r.id);
      row.appendChild(el('div', {}, [nome, usos ? el('div', {class:'help', style:'margin:2px 0 0;'}, ['usado em ' + usos + (usos===1?' serviço':' serviços')]) : null]));
      row.appendChild(valor);
      row.appendChild(numberInput({value:r.qtd, kind:'num', dec:0, onInput:(n)=>{ r.qtd=n; persist(); upd(); }}));
      row.appendChild(out);
      row.appendChild(el('button', {class:'row-del', title:'remover', onclick:()=>{
        if (usos && !confirm('Esse material está em ' + usos + (usos===1?' serviço':' serviços') + '. Remover mesmo assim?')) return;
        st.insumos.splice(i,1); persist(); rebuild();
      }}, ['✕']));
      list.appendChild(row);
    });
  }
  rebuild();

  const btns = el('div', {style:'display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;'});
  btns.appendChild(el('button', {class:'btn btn-secondary btn-sm', type:'button', onclick:()=>{
    st.insumos.push({id:uid(), codigo:'', nome:'', unidade:'', qtd:1, valor:0}); persist(); rebuild();
  }}, ['+ Adicionar material']));
  const prontoBtn = el('button', {class:'btn btn-secondary btn-sm', type:'button'}, ['+ Escolher da lista pronta']);
  btns.appendChild(prontoBtn);
  body.appendChild(btns);

  const picker = el('div', {class:'svc-picker', style:'display:none;'});
  prontoBtn.addEventListener('click', () => { drawPicker(); picker.style.display = picker.style.display === 'none' ? '' : 'none'; });
  function drawPicker(){
    picker.innerHTML = '';
    const ja = new Set((st.insumos||[]).map(x => (x.nome||'').trim().toLowerCase()));
    const faltam = MATERIAIS_ODONTO.filter(([n]) => !ja.has(n.toLowerCase()));
    if (!faltam.length){ picker.appendChild(el('p', {class:'help'}, ['Você já adicionou todos os itens da lista pronta.'])); return; }
    picker.appendChild(el('p', {class:'help', style:'margin-top:0;'}, ['Marque o que você usa. Depois é só preencher o preço que você paga.']));
    const marcados = new Set();
    const chips = el('div', {class:'svc-chips'});
    faltam.forEach(([n]) => {
      const c = el('button', {type:'button', class:'svc-chip'}, [n]);
      c.addEventListener('click', () => { if (marcados.has(n)){ marcados.delete(n); c.classList.remove('on'); } else { marcados.add(n); c.classList.add('on'); } });
      chips.appendChild(c);
    });
    picker.appendChild(chips);
    picker.appendChild(el('button', {class:'btn btn-primary btn-sm', type:'button', style:'margin-top:10px;', onclick:()=>{
      faltam.filter(([n]) => marcados.has(n)).forEach(([n, q]) => st.insumos.push({id:uid(), codigo:'', nome:n, unidade:'', qtd:q, valor:0}));
      picker.style.display = 'none'; persist(); rebuild();
    }}, ['Adicionar os marcados']));
  }
  body.appendChild(picker);

  body.appendChild(el('div', {class:'callout'}, [
    'Na etapa ', el('b',{},['Meus Serviços']), ', em cada serviço, escolha ', el('b',{},['"Escolher da lista"']),
    ' e diga quanto de cada material usa (ex.: 2 luvas, 1 máscara). O custo do material entra sozinho — e se o preço mudar aqui, todos os serviços se atualizam.',
  ]));
  body.appendChild(el('p', {class:'help'}, ['Os campos em destaque estão sem preço: preencha com o valor que você paga, senão o material conta como R$ 0.']));
  panel.appendChild(body);
  footNav(panel, {});
}

function renderStepInsumos(panel){
  if (APP.model === 'prestador') return renderStepInsumosPrestador(panel);
  const m = MODELS[APP.model];
  panelHead(panel, '5º passo — Conhecer', m.insumosLabel, m.insumosDesc);
  const body = el('div', {class:'panel-body'});
  const wrap = el('div', {class:'table-wrap'});
  const table = el('table', {class:'grid'});
  table.appendChild(el('thead', {}, [el('tr', {}, [
    el('th',{},['Código']), el('th',{},[m.insumosItemLabel]), el('th',{},[m.insumosUnitLabel]),
    el('th',{},[m.insumosQtyLabel]), el('th',{},['Valor pago (R$)']), el('th',{},['Custo/unidade']), el('th',{}),
  ])]));
  const tbody = el('tbody');

  function rowCusto(r){ return safeDiv(parseBR(r.valor), parseBR(r.qtd)); }
  function updateRow(i){
    const r = APP.state.insumos[i];
    const o = document.querySelector('[data-ins-out="'+i+'"]');
    if (o) o.textContent = fmtBRL(rowCusto(r));
  }
  function renumber(){
    APP.state.insumos.forEach((r,i)=>{ r.codigo = m.insumosCodePrefix + String(i+1).padStart(3,'0'); });
  }
  function rebuild(){
    tbody.innerHTML = '';
    APP.state.insumos.forEach((r, i) => tbody.appendChild(buildRow(r, i)));
  }
  function buildRow(r, i){
    const tr = el('tr');
    tr.appendChild(el('td', {}, [el('span',{class:'mono', style:'color:var(--ink-faint);font-size:12px;'},[r.codigo])]));
    const nomeTd = el('td', {class:'col-name'});
    const nomeInp = el('input', {class:'inp text-left', value:r.nome||'', placeholder:'nome do item'});
    nomeInp.addEventListener('input', () => { r.nome = nomeInp.value; persist(); });
    nomeTd.appendChild(nomeInp);
    tr.appendChild(nomeTd);
    const unidTd = el('td');
    const unidInp = el('input', {class:'inp text-left', value:r.unidade||'', placeholder:'ex.: caixa 100 un'});
    unidInp.addEventListener('input', () => { r.unidade = unidInp.value; persist(); });
    unidTd.appendChild(unidInp);
    tr.appendChild(unidTd);
    tr.appendChild(el('td', {}, [numberInput({value:r.qtd, kind:'num', onInput:(n)=>{ r.qtd=n; persist(); updateRow(i); }})]));
    tr.appendChild(el('td', {}, [numberInput({value:r.valor, kind:'brl', onInput:(n)=>{ r.valor=n; persist(); updateRow(i); }})]));
    tr.appendChild(el('td', {}, [el('span', {class:'mono', 'data-ins-out':String(i), style:'font-weight:700;'}, [fmtBRL(rowCusto(r))])]));
    const delTd = el('td');
    delTd.appendChild(el('button', {class:'row-del', title:'remover', onclick:()=>{
      APP.state.insumos.splice(i,1); renumber(); persist(); rebuild();
    }}, ['✕']));
    tr.appendChild(delTd);
    return tr;
  }
  rebuild();
  table.appendChild(tbody);
  wrap.appendChild(table);
  body.appendChild(wrap);

  body.appendChild(el('button', {class:'btn btn-secondary btn-sm', style:'margin-top:14px;', onclick: () => {
    APP.state.insumos.push({codigo:'', nome:'', unidade:'unidade', qtd:1, valor:0});
    renumber(); persist(); rebuild();
  }}, ['+ adicionar item']));

  body.appendChild(el('div', {class:'callout'}, [
    'Essa tabela é só de referência: use os valores de ', el('b',{},['custo/unidade']),
    ' pra preencher, na próxima etapa, o custo de cada ' + (APP.model==='produto'?'produto':'atendimento') + '. Na etapa Calcular tem um atalho pra somar os insumos direto.',
  ]));

  panel.appendChild(body);
  footNav(panel, {});
}
/* ---------------------------------------------------------------------- */
/* Etapa: Minha Hora (3 variantes)                                         */
/* ---------------------------------------------------------------------- */

function statTile(id, label, value, cls){
  return el('div', {class:'stat' + (cls?(' '+cls):'')}, [
    el('span', {class:'lbl'}, [label]),
    el('span', {class:'val mono', id:id}, [value]),
  ]);
}

function renderStepHora(panel){
  const model = APP.model;
  const h = APP.state.hora;

  function refresh(){
    const c = computeHora(model, APP.state);
    if (model === 'prestador'){
      setTxt('h-disponiveis', fmtNum(c.horasDisponiveis,1) + ' h');
      setTxt('h-efetivas', fmtNum(c.horasEfetivas,1) + ' h');
      setTxt('h-custofixo', fmtBRL(c.custoFixoNegocio));
      setTxt('h-custohora', fmtBRL(c.custoHora));
    } else if (model === 'produto'){
      setTxt('h-custofixoemp', fmtBRL(c.custoFixoEmpresa));
      setTxt('h-custohoraemp', fmtBRL(c.custoHoraEmpresa));
      setTxt('h-maoobramp', fmtBRL(c.custoTotalMaoObraMes));
      setTxt('h-custohoraprod', fmtBRL(c.custoHoraProducao));
    } else if (model === 'conhecimento'){
      setTxt('h-horasprod', fmtNum(c.horasProdutivasMes,1) + ' h');
      setTxt('h-custofixo', fmtBRL(c.custoFixoNegocio));
      setTxt('h-custohora', fmtBRL(c.custoHora));
    }
  }
  function setTxt(id, txt){ const e = document.getElementById(id); if (e) e.textContent = txt; }
  function field(label, help, inputEl){
    const row = el('div', {class:'field-row'});
    row.appendChild(el('label', {}, [label, help?el('div',{class:'help'},[help]):null]));
    row.appendChild(inputEl);
    return row;
  }
  function readonlyStat(id, initial){
    const wrap = el('div', {class:'inp-wrap'});
    wrap.appendChild(el('span', {id:id, class:'inp locked mono', style:'display:flex;align-items:center;justify-content:flex-end;'}, [initial]));
    return wrap;
  }
  function resultStat(id, initial){
    const wrap = el('div', {class:'inp-wrap'});
    wrap.appendChild(el('span', {id:id, class:'inp result mono', style:'display:flex;align-items:center;justify-content:flex-end;'}, [initial]));
    return wrap;
  }

  const body = el('div', {class:'panel-body'});

  if (model === 'prestador'){
    panelHead(panel, '4º passo — Conhecer', 'Minha Hora',
      'Sua agenda não está 100% cheia. A conta honesta usa a taxa REAL de ocupação — não a agenda dos sonhos.');
    panel.querySelector('.panel-head').appendChild(legendRow());
    body.appendChild(el('div', {class:'cat-title'}, ['Capacidade da sua agenda']));
    body.appendChild(field('Dias úteis que você atende por semana', 'Ex.: 5 (seg a sex), 4 (quarta de folga), etc.',
      numberInput({value:h.diasUteis, kind:'num', dec:1, onInput:(n)=>{h.diasUteis=n; persist(); refresh();}})));
    body.appendChild(field('Horas de agenda aberta por dia', 'Horas TOTAIS de janela de atendimento (com ou sem paciente).',
      numberInput({value:h.horasDia, kind:'num', dec:1, onInput:(n)=>{h.horasDia=n; persist(); refresh();}})));
    body.appendChild(field('Semanas efetivas no ano', '52 − férias − feriados. Ajuste se tira mais.',
      numberInput({value:h.semanasEfetivas, kind:'num', dec:0, onInput:(n)=>{h.semanasEfetivas=n; persist(); refresh();}})));
    body.appendChild(field('Horas de agenda DISPONÍVEIS por mês', 'Dias × horas × semanas ÷ 12', readonlyStat('h-disponiveis', fmtNum(computeHora(model,APP.state).horasDisponiveis,1)+' h')));
    body.appendChild(field('Taxa REAL de ocupação da agenda', 'Seja honesto. Se sua agenda está 70% cheia, coloque 70%. Ótimo é 80–90%.',
      numberInput({value:h.taxaOcupacao, kind:'pct', onInput:(n)=>{h.taxaOcupacao=n; persist(); refresh();}})));
    body.appendChild(field('Horas EFETIVAMENTE atendidas/mês', 'Horas disponíveis × taxa de ocupação', readonlyStat('h-efetivas', fmtNum(computeHora(model,APP.state).horasEfetivas,1)+' h')));

    body.appendChild(el('div', {class:'cat-title', style:'margin-top:22px;'}, ['Custo por hora de atendimento']));
    body.appendChild(field('Custo fixo do consultório/empresa', 'Vem da etapa Meu Negócio', readonlyStat('h-custofixo', fmtBRL(computeHora(model,APP.state).custoFixoNegocio))));
    body.appendChild(field('💰 Custo por hora atendida (ocupação real)', 'Custo fixo ÷ horas EFETIVAS. Esse é o piso da sua hora.', resultStat('h-custohora', fmtBRL(computeHora(model,APP.state).custoHora))));
    body.appendChild(el('div', {class:'callout'}, ['⚠ Se você subir sua ocupação, o custo/hora cai automaticamente. Se deixar agenda aberta, você está rateando o mesmo custo em menos horas — e cobrando caro sem perceber.']));
  }

  if (model === 'produto'){
    panelHead(panel, '4º passo — Conhecer', 'Minha Hora',
      'Quanto vale 1 hora da sua empresa, e 1 hora de quem FAZ o produto (mão de obra direta).');
    panel.querySelector('.panel-head').appendChild(legendRow());
    body.appendChild(el('div', {class:'cat-title'}, ['Custo/hora da empresa (estrutura + administrativo)']));
    body.appendChild(field('Total custo fixo da empresa', 'Vem da etapa Meu Negócio', readonlyStat('h-custofixoemp', fmtBRL(computeHora(model,APP.state).custoFixoEmpresa))));
    body.appendChild(field('Horas operacionais da empresa por mês', 'Padrão: 8h × 22 dias úteis = 176h. Ajuste pro seu caso.',
      numberInput({value:h.horasOperacionaisMes, kind:'num', dec:0, onInput:(n)=>{h.horasOperacionaisMes=n; persist(); refresh();}})));
    body.appendChild(field('💰 Custo por hora da empresa', 'Custo fixo ÷ horas. Usa pra ratear a estrutura em cada produto.', resultStat('h-custohoraemp', fmtBRL(computeHora(model,APP.state).custoHoraEmpresa))));

    body.appendChild(el('div', {class:'cat-title', style:'margin-top:22px;'}, ['Custo/hora da produção (mão de obra direta)']));
    body.appendChild(field('Salário médio de quem produz (líquido)', 'Costureira, marceneiro, confeiteiro, operador, etc.',
      numberInput({value:h.salarioMedioProdutor, kind:'brl', onInput:(n)=>{h.salarioMedioProdutor=n; persist(); refresh();}})));
    body.appendChild(field('Encargos e benefícios (% sobre salário)', 'FGTS, INSS, férias, 13º, VT, VR. CLT gira em 70–80%.',
      numberInput({value:h.encargosPct, kind:'pct', onInput:(n)=>{h.encargosPct=n; persist(); refresh();}})));
    body.appendChild(field('Custo total da mão de obra por mês', 'Salário + encargos', readonlyStat('h-maoobramp', fmtBRL(computeHora(model,APP.state).custoTotalMaoObraMes))));
    body.appendChild(field('Horas produtivas por mês (dessa pessoa)', 'Horas efetivamente trabalhadas no mês',
      numberInput({value:h.horasProdutivasMes, kind:'num', dec:0, onInput:(n)=>{h.horasProdutivasMes=n; persist(); refresh();}})));
    body.appendChild(field('💰 Custo por hora de produção', 'Usa pra calcular o custo de fabricação de cada produto.', resultStat('h-custohoraprod', fmtBRL(computeHora(model,APP.state).custoHoraProducao))));
  }

  if (model === 'conhecimento'){
    panelHead(panel, '4º passo — Conhecer', 'Minha Hora',
      'Sua hora é finita. Sua escalabilidade depende do formato que você escolher: 1:1, grupo ou gravado.');
    panel.querySelector('.panel-head').appendChild(legendRow());
    body.appendChild(el('div', {class:'cat-title'}, ['Quantas horas você realmente tem']));
    body.appendChild(field('Dias úteis trabalhados por semana', 'Segunda a sexta. Inclui entregas + conteúdo + vendas.',
      numberInput({value:h.diasUteis, kind:'num', dec:1, onInput:(n)=>{h.diasUteis=n; persist(); refresh();}})));
    body.appendChild(field('Semanas efetivas no ano', '52 − férias − feriados',
      numberInput({value:h.semanasEfetivas, kind:'num', dec:0, onInput:(n)=>{h.semanasEfetivas=n; persist(); refresh();}})));
    body.appendChild(field('Horas produtivas por dia', 'Horas de TRABALHO FOCADO. Não conta e-mail e reunião boba.',
      numberInput({value:h.horasProdutivasDia, kind:'num', dec:1, onInput:(n)=>{h.horasProdutivasDia=n; persist(); refresh();}})));
    body.appendChild(field('Horas produtivas por MÊS', 'Dias × semanas × horas ÷ 12', readonlyStat('h-horasprod', fmtNum(computeHora(model,APP.state).horasProdutivasMes,1)+' h')));

    body.appendChild(el('div', {class:'cat-title', style:'margin-top:22px;'}, ['Quanto vale 1 hora sua']));
    body.appendChild(field('Custo fixo do negócio', 'Vem da etapa Meu Negócio', readonlyStat('h-custofixo', fmtBRL(computeHora(model,APP.state).custoFixoNegocio))));
    body.appendChild(field('💰 Custo por hora (custo fixo ÷ horas do mês)', 'É o MÍNIMO que 1 hora sua custa. Cobrar abaixo é prejuízo.', resultStat('h-custohora', fmtBRL(computeHora(model,APP.state).custoHora))));

    body.appendChild(el('div', {class:'callout'}, [
      el('b',{},['A matemática da escala: ']), 'mentoria 1:1 de 1h = 1 hora sua pra 1 aluno. Mentoria em grupo com 10 alunos de 1h = 1 hora sua pra 10 alunos. Curso gravado com 100 vendas/mês = 0 horas marginais, 100 alunos. A mesma hora vale preços diferentes dependendo de como você embala.',
    ]));
  }

  panel.appendChild(body);
  footNav(panel, {});
}
/* ---------------------------------------------------------------------- */
/* Popover: somar insumos / matéria-prima direto na linha                  */
/* ---------------------------------------------------------------------- */

function closeInsumoPopover(){
  const p = document.getElementById('insumo-popover');
  if (p){ if (p._outsideClick) document.removeEventListener('click', p._outsideClick); p.remove(); }
}

function openInsumoPopover(anchorEl, onApply){
  closeInsumoPopover();
  const list = APP.state.insumos || [];
  if (!list.length){
    alert('Cadastre itens na etapa "' + MODELS[APP.model].insumosLabel + '" primeiro — aí você poderá somar direto aqui.');
    return;
  }
  const pop = el('div', {class:'popover', id:'insumo-popover'});
  pop.appendChild(el('h4', {}, ['Somar a partir de "' + MODELS[APP.model].insumosLabel + '"']));
  const qtys = list.map(()=>0);
  list.forEach((ins, i) => {
    const custoUn = safeDiv(parseBR(ins.valor), parseBR(ins.qtd));
    const row = el('div', {class:'prow'});
    row.appendChild(el('label', {}, [
      el('div', {}, [ins.nome || '(sem nome)']),
      el('div', {class:'help', style:'margin:0;'}, [fmtBRL(custoUn) + ' / ' + (ins.unidade||'un')]),
    ]));
    const qtyInput = el('input', {class:'inp', value:'0'});
    qtyInput.addEventListener('input', () => { qtys[i] = parseBR(qtyInput.value); updateTotal(); });
    row.appendChild(qtyInput);
    pop.appendChild(row);
  });
  const totalRow = el('div', {class:'ptotal'}, [el('span',{},['Total']), el('span',{id:'pop-total'},[fmtBRL(0)])]);
  pop.appendChild(totalRow);
  function updateTotal(){
    const total = list.reduce((s,ins,i) => s + qtys[i]*safeDiv(parseBR(ins.valor),parseBR(ins.qtd)), 0);
    document.getElementById('pop-total').textContent = fmtBRL(total);
    return total;
  }
  const btnRow = el('div', {style:'display:flex;gap:8px;margin-top:12px;'});
  btnRow.appendChild(el('button', {class:'btn btn-secondary btn-sm', onclick: closeInsumoPopover}, ['Cancelar']));
  btnRow.appendChild(el('button', {class:'btn btn-primary btn-sm', onclick: () => { const t = updateTotal(); onApply(t); closeInsumoPopover(); }}, ['Usar esse valor']));
  pop.appendChild(btnRow);
  document.body.appendChild(pop);
  const r = anchorEl.getBoundingClientRect();
  const popW = 300;
  pop.style.top = Math.min(window.innerHeight-40, r.bottom+6) + 'px';
  pop.style.left = Math.max(8, Math.min(window.innerWidth-popW-8, r.left-140)) + 'px';
  setTimeout(() => {
    const fn = (e) => { if (!pop.contains(e.target) && e.target!==anchorEl) closeInsumoPopover(); };
    pop._outsideClick = fn;
    document.addEventListener('click', fn);
  }, 0);
}

/* ---------------------------------------------------------------------- */
/* Popover: financiamento da Moradia (entrada, taxa, subsídio)             */
/* ---------------------------------------------------------------------- */

function closeMoradiaPopover(){
  const p = document.getElementById('moradia-popover');
  if (p){ if (p._outsideClick) document.removeEventListener('click', p._outsideClick); p.remove(); }
}

function openMoradiaPopover(anchorEl, r, onApply){
  closeMoradiaPopover();
  const pop = el('div', {class:'popover', id:'moradia-popover', style:'width:300px;'});
  const cfg = finCfg(r);
  finAjustaPreset(r);
  pop.appendChild(el('h4', {}, [cfg.titulo]));

  const entradaRow = el('div', {class:'prow'});
  entradaRow.appendChild(el('label', {}, [el('div',{},['Entrada']), el('div',{class:'help',style:'margin:0;'},['% do valor do ' + cfg.bem])]));
  entradaRow.appendChild(numberInput({value:r.entrada, kind:'pct', onInput:(n)=>{ r.entrada=n; updatePreview(); }}));
  pop.appendChild(entradaRow);

  const taxaSel = el('select', {class:'inp', style:'margin-top:8px;width:100%;'});
  cfg.taxas.forEach(t => taxaSel.appendChild(el('option', {value:t.key, selected: t.key===r.taxaPreset?'selected':null}, [t.label + (t.taxa!=null ? ' — '+fmtNum(t.taxa*100,2)+'% a.a.' : '')])));
  pop.appendChild(taxaSel);

  const customRow = el('div', {class:'prow'});
  customRow.appendChild(el('label', {}, [el('div',{},['Taxa personalizada']), el('div',{class:'help',style:'margin:0;'},['ao ano'])]));
  const customInput = numberInput({value:r.taxaCustom, kind:'pct', onInput:(n)=>{ r.taxaCustom=n; updatePreview(); }});
  customRow.appendChild(customInput);
  customRow.style.display = r.taxaPreset === 'personalizado' ? '' : 'none';
  pop.appendChild(customRow);

  taxaSel.addEventListener('change', () => {
    r.taxaPreset = taxaSel.value;
    customRow.style.display = r.taxaPreset === 'personalizado' ? '' : 'none';
    updatePreview();
  });

  const subsRow = el('div', {class:'prow'});
  subsRow.appendChild(el('label', {}, [el('div',{},['Subsídio (R$)']), el('div',{class:'help',style:'margin:0;'},['se já souber o valor aprovado'])]));
  subsRow.appendChild(numberInput({value:r.subsidio, kind:'brl', onInput:(n)=>{ r.subsidio=n; updatePreview(); }}));
  if (cfg.subsidio) pop.appendChild(subsRow);

  const previewRow = el('div', {class:'ptotal'}, [el('span',{},['Parcela estimada']), el('span',{id:'moradia-pop-parcela'},[fmtBRL(moradiaParcela(r))])]);
  pop.appendChild(previewRow);
  const previewRow2 = el('div', {class:'ptotal'}, [el('span',{},['Total pago (entrada + parcelas)']), el('span',{id:'moradia-pop-total'},[fmtBRL(moradiaTotalPago(r))])]);
  pop.appendChild(previewRow2);
  function updatePreview(){
    const p1 = document.getElementById('moradia-pop-parcela'); if (p1) p1.textContent = fmtBRL(moradiaParcela(r));
    const p2 = document.getElementById('moradia-pop-total'); if (p2) p2.textContent = fmtBRL(moradiaTotalPago(r));
  }

  const btnRow = el('div', {style:'display:flex;gap:8px;margin-top:12px;'});
  btnRow.appendChild(el('button', {class:'btn btn-secondary btn-sm', onclick: closeMoradiaPopover}, ['Cancelar']));
  btnRow.appendChild(el('button', {class:'btn btn-primary btn-sm', onclick: () => { onApply(); closeMoradiaPopover(); }}, ['Usar esses valores']));
  pop.appendChild(btnRow);

  document.body.appendChild(pop);
  const rect = anchorEl.getBoundingClientRect();
  const popW = 300;
  pop.style.top = Math.min(window.innerHeight-40, rect.bottom+6) + 'px';
  pop.style.left = Math.max(8, Math.min(window.innerWidth-popW-8, rect.left-140)) + 'px';
  setTimeout(() => {
    const fn = (e) => { if (!pop.contains(e.target) && e.target!==anchorEl) closeMoradiaPopover(); };
    pop._outsideClick = fn;
    document.addEventListener('click', fn);
  }, 0);
}

/* ---------------------------------------------------------------------- */
/* Helpers de tabela editável                                              */
/* ---------------------------------------------------------------------- */

function statusPillNode(status){
  const map = {otimo:['status-otimo','🟢 Ótimo'], ok:['status-ok','🟡 OK'], baixo:['status-baixo','🔴 Baixo'], invalido:['status-baixo','⚠️ % acima de 100'], gravado:['status-grav','📼 Gravado'], '':[null,'']};
  const [cls, txt] = map[status] || map[''];
  if (!cls) return el('span');
  return el('span', {class:'status-pill '+cls}, [txt]);
}
function lockedOut(id, initialTxt){
  return el('span', {id:id, class:'mono', style:'font-weight:600;color:var(--ink-soft);'}, [initialTxt]);
}
function resultOut(id, initialTxt){
  return el('span', {id:id, class:'mono', style:'font-weight:700;color:var(--green-strong);'}, [initialTxt]);
}
function addRowBtn(label, onClick){
  return el('button', {class:'btn btn-secondary btn-sm', style:'margin-top:14px;', onclick:onClick}, ['+ ' + label]);
}
function exampleBadge(){
  return el('span', {style:'font-size:10.5px;font-weight:700;color:var(--amber-strong);background:var(--amber-fill);padding:2px 7px;border-radius:100px;margin-left:6px;'}, ['exemplo']);
}

/* ---------------------------------------------------------------------- */
/* Etapa Calcular — dispatcher                                             */
/* ---------------------------------------------------------------------- */

function renderStepCalcular(panel){
  const m = MODELS[APP.model];
  panelHead(panel, '6º passo — Calcular', m.calcTitle,
    APP.model === 'prestador'
      ? 'Um cartão por serviço: responda 4 perguntas e veja o preço justo na hora. Os marcados "exemplo" são só ilustração — edite ou apague.'
      : 'Cada ' + m.calcRowNoun + ' com seus custos, impostos e margem — a planilha calcula o preço certo, um por um. Os itens marcados "exemplo" são apenas ilustração: edite os valores ou apague a linha.');
  panel.querySelector('.panel-head').appendChild(legendRow());
  const body = el('div', {class:'panel-body'});
  const wrap = el('div', {class:'table-wrap'});
  body.appendChild(wrap);
  panel.appendChild(body);

  if (APP.model === 'prestador') buildCalcPrestador(wrap, body);
  if (APP.model === 'produto') buildCalcProduto(wrap, body);
  if (APP.model === 'conhecimento') buildCalcConhecimento(wrap, body);

  footNav(panel, {});
}

/* ======================= PRESTADOR (cartões) ======================= */
// Serviços prontos pra escolher. Durações são SUGESTÕES — o aluno ajusta à realidade dele.
const SERVICOS_PRONTOS = [
  {grupo:'Odontologia', itens:[
    ['Avaliação / consulta inicial', 45], ['Profilaxia (limpeza)', 60], ['Restauração em resina', 60],
    ['Tratamento de canal (por sessão)', 90], ['Extração simples', 45], ['Clareamento em consultório (sessão)', 90],
    ['Raspagem periodontal (por sessão)', 60], ['Aplicação de flúor / selante', 30], ['Atendimento de urgência', 45],
    ['Retorno / manutenção', 30],
  ]},
  {grupo:'Outros atendimentos', itens:[
    ['Consulta', 60], ['Retorno', 30], ['Sessão', 60], ['Teleconsulta (online)', 45],
  ]},
];

function statusFrase(status){
  if (status === 'invalido') return '⚠️ Não dá pra calcular: as porcentagens passam de 100% (veja abaixo).';
  if (status === 'otimo') return '🟢 Ótimo: sobra bem mais que o custo da sua hora.';
  if (status === 'ok') return '🟡 OK: paga o seu tempo, mas sobra pouco.';
  if (status === 'baixo') return '🔴 Prejuízo: com esse preço, este atendimento não paga nem o seu tempo.';
  return 'Preencha quantos atendimentos por mês pra ver o resultado.';
}

function buildCalcPrestador(wrap, body){
  const st = APP.state;
  const g = st.calcGlobal || (st.calcGlobal = deriveCalcGlobal(st.calcular));
  wrap.className = 'svc-wrap';
  const $ = (id) => document.getElementById(id);
  const setTxt = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  function calc(){ return computeCalcAll('prestador', st.calcular, computeHora('prestador', st), st); }

  // ---------- configurações gerais ----------
  const gbox = el('div', {class:'svc-global'});
  gbox.appendChild(el('div', {class:'cat-title'}, ['Valem para todos os serviços']));
  const gRow = (label, help, key) => {
    const r = el('div', {class:'field-row'});
    r.appendChild(el('label', {}, [label, help ? el('div',{class:'help'},[help]) : null]));
    r.appendChild(numberInput({value:g[key], kind:'pct', onInput:(n)=>{ g[key] = n; persist(); refreshAll(); }}));
    gbox.appendChild(r);
  };
  gRow('Imposto', 'Simples Nacional, ISS, carnê-leão… em % do que você recebe.', 'impostos');
  gRow('Taxa da maquininha / cartão', 'Média do que a maquininha desconta.', 'cartao');
  gRow('Comissão', 'Se você paga comissão a alguém por atendimento. Senão, deixe 0.', 'comissao');
  gRow('Margem de lucro desejada', 'Quanto DO PREÇO vira lucro (não é "% a mais sobre o custo"). Ex.: margem de 30% num serviço de R$ 100 = R$ 30 de lucro. 20% a 40% é comum.', 'margem');
  gbox.appendChild(el('div', {id:'svc-global-aviso', class:'svc-diff', style:'display:none;'}));
  gbox.appendChild(el('div', {id:'svc-global-max', class:'help'}, ['']));
  const convChk = el('input', {type:'checkbox', id:'svc-convenio'});
  convChk.checked = !!g.convenio;
  convChk.addEventListener('change', () => { g.convenio = convChk.checked; persist(); rebuild(); });
  gbox.appendChild(el('label', {for:'svc-convenio', class:'rendas-toggle', style:'margin-top:8px;'}, [convChk,
    el('span', {}, [el('b',{},['Atendo convênio']), el('div',{class:'help'},['Marque pra informar, em cada serviço, quanto o convênio retém (repasse).'])])]));
  wrap.appendChild(gbox);

  // ---------- cartões ----------
  const list = el('div', {class:'svc-list'});
  wrap.appendChild(list);

  function rebuild(){
    list.innerHTML = '';
    st.calcular.forEach((r, i) => list.appendChild(card(r, i)));
    refreshAll();
  }

  function card(r, i){
    if (!Array.isArray(r.materiais)) r.materiais = [];
    if (!r.matModo) r.matModo = 'valor';
    const root = el('div', {class:'svc-card'});

    // cabeçalho
    const head = el('div', {class:'svc-head'});
    const nome = el('input', {class:'inp text-left svc-nome', value:r.nome||'', placeholder:'nome do serviço'});
    nome.addEventListener('input', () => { r.nome = nome.value; delete r._example; persist(); });
    head.appendChild(nome);
    if (r._example) head.appendChild(exampleBadge());
    head.appendChild(el('button', {class:'row-del', title:'remover serviço', onclick:()=>{ st.calcular.splice(i,1); persist(); rebuild(); }}, ['✕']));
    root.appendChild(head);

    const cols = el('div', {class:'svc-cols'});
    // perguntas
    const qs = el('div', {class:'svc-qs'});
    const q = (label, help, input) => {
      qs.appendChild(el('div', {class:'svc-q'}, [el('label', {}, [label, help ? el('div',{class:'help'},[help]) : null]), input]));
    };
    q('Quantos por mês?', null, numberInput({value:r.atend, kind:'num', dec:0, onInput:(n)=>{ r.atend=n; persist(); refreshAll(); }}));
    q('Quanto tempo leva? (minutos)', 'Contando preparo e prontuário.', numberInput({value:Math.round(parseBR(r.dur)*60), kind:'num', dec:0, onInput:(n)=>{ r.dur = n/60; persist(); refreshAll(); }}));
    q('Quanto você cobra hoje? (R$)', 'Particular. Deixe 0 se ainda não cobra.', numberInput({value:r.cobraHoje||0, kind:'brl', onInput:(n)=>{ r.cobraHoje=n; persist(); refreshAll(); }}));

    // material
    const mat = el('div', {class:'svc-q'});
    mat.appendChild(el('label', {}, ['Quanto gasta de material?']));
    const modes = el('div', {class:'svc-seg'});
    const bValor = el('button', {type:'button', class: r.matModo==='valor' ? 'on' : ''}, ['Valor aproximado']);
    const bLista = el('button', {type:'button', class: r.matModo==='lista' ? 'on' : ''}, ['Escolher da lista']);
    bValor.addEventListener('click', () => { r.matModo = 'valor'; persist(); rebuild(); });
    bLista.addEventListener('click', () => { r.matModo = 'lista'; persist(); rebuild(); });
    modes.appendChild(bValor); modes.appendChild(bLista);
    mat.appendChild(modes);
    if (r.matModo === 'valor'){
      mat.appendChild(numberInput({value:r.insumos||0, kind:'brl', onInput:(n)=>{ r.insumos=n; persist(); refreshAll(); }}));
    } else {
      const insumos = st.insumos || [];
      if (!insumos.length){
        mat.appendChild(el('div', {class:'help'}, ['Você ainda não cadastrou materiais. ',
          el('button', {class:'btn btn-secondary btn-sm', type:'button', onclick:()=>goStep('insumos')}, ['Ir para Insumos'])]));
      } else {
        const byId = {}; insumos.forEach(x => byId[x.id] = x);
        r.materiais = r.materiais.filter(m => byId[m.id]);
        const chips = el('div', {class:'svc-mats'});
        r.materiais.forEach((m, mi) => {
          const ins = byId[m.id];
          const qtyInp = numberInput({value:m.qtd, kind:'num', dec:2, onInput:(n)=>{ m.qtd=n; persist(); refreshAll(); updChip(); }});
          qtyInp.style.width = '70px';
          const custo = el('span', {class:'mono help', style:'margin:0;'}, ['']);
          const updChip = () => { custo.textContent = '= ' + fmtBRL(parseBR(m.qtd) * insumoCustoUn(ins)); };
          updChip();
          chips.appendChild(el('div', {class:'svc-mat'}, [
            el('span', {class:'svc-mat-nome'}, [ins.nome || '(sem nome)']), el('span',{class:'help',style:'margin:0;'},['×']), qtyInp, custo,
            el('button', {class:'row-del', type:'button', title:'tirar', onclick:()=>{ r.materiais.splice(mi,1); persist(); rebuild(); }}, ['✕']),
          ]));
        });
        mat.appendChild(chips);
        const disponiveis = insumos.filter(x => !r.materiais.some(m => m.id === x.id));
        if (disponiveis.length){
          const sel = el('select', {class:'inp', style:'margin-top:6px;'});
          sel.appendChild(el('option', {value:''}, ['+ adicionar material…']));
          disponiveis.forEach(x => sel.appendChild(el('option', {value:x.id}, [(x.nome||'(sem nome)') + ' — ' + fmtBRL(insumoCustoUn(x)) + '/un'])));
          sel.addEventListener('change', () => { if (!sel.value) return; r.materiais.push({id:sel.value, qtd:1}); persist(); rebuild(); });
          mat.appendChild(sel);
        }
        mat.appendChild(el('div', {class:'help'}, ['Total de material: ', el('b', {id:'svc-mat-'+i, class:'mono'}, [''])]));
      }
    }
    qs.appendChild(mat);
    cols.appendChild(qs);

    // resultado
    const res = el('div', {class:'svc-res'});
    res.appendChild(el('div', {class:'svc-res-lbl'}, ['Preço justo (particular)']));
    res.appendChild(el('div', {class:'svc-res-val', id:'svc-preco-'+i}, ['']));
    if (g.convenio) res.appendChild(el('div', {class:'help', id:'svc-convline-'+i}, ['']));
    res.appendChild(el('div', {class:'svc-res-line'}, ['Sobra pra você por atendimento: ', el('b', {id:'svc-liq-'+i, class:'mono'}, [''])]));
    res.appendChild(el('div', {class:'svc-status', id:'svc-status-'+i}, ['']));
    res.appendChild(el('div', {class:'svc-diff', id:'svc-diff-'+i, style:'display:none;'}));
    cols.appendChild(res);
    root.appendChild(cols);

    // detalhes
    const det = el('details', {class:'svc-det'});
    det.appendChild(el('summary', {}, ['Mais detalhes']));
    const dRow = (label, help, input) => det.appendChild(el('div', {class:'field-row'}, [el('label', {}, [label, help ? el('div',{class:'help'},[help]) : null]), input]));
    dRow('Outros custos por atendimento (R$)', 'Laboratório, prótese, material especial…', numberInput({value:r.outros||0, kind:'brl', onInput:(n)=>{ r.outros=n; persist(); refreshAll(); }}));
    if (g.convenio) dRow('Repasse do convênio', 'Quanto o convênio retém, em %. Deixe 0 se este serviço for só particular.', numberInput({value:r.repasse||0, kind:'pct', onInput:(n)=>{ r.repasse=n; persist(); refreshAll(); }}));
    const padChk = el('input', {type:'checkbox'});
    padChk.checked = r.usaPadrao !== false;
    padChk.addEventListener('change', () => {
      r.usaPadrao = padChk.checked;
      if (!r.usaPadrao){ ['impostos','cartao','comissao','margem'].forEach(k => { r[k] = g[k]; }); }
      persist(); rebuild();
    });
    det.appendChild(el('label', {class:'rendas-toggle', style:'margin-top:8px;'}, [padChk, el('span', {}, ['Usar as configurações gerais (imposto, cartão, comissão e margem)'])]));
    if (r.usaPadrao === false){
      [['Imposto','impostos'],['Taxa de cartão','cartao'],['Comissão','comissao'],['Margem de lucro','margem']].forEach(([lbl,k]) =>
        dRow(lbl + ' (só deste serviço)', null, numberInput({value:r[k]||0, kind:'pct', onInput:(n)=>{ r[k]=n; persist(); refreshAll(); }})));
    }
    const info = el('div', {class:'svc-info'});
    [['Custo do seu tempo','svc-tempo-'],['Custo total por atendimento','svc-direto-'],['Horas no mês','svc-horas-'],['Receita no mês','svc-receita-']].forEach(([lbl,id]) =>
      info.appendChild(el('div', {}, [el('span', {class:'help', style:'margin:0;'}, [lbl]), el('b', {class:'mono', id:id+i}, [''])])));
    det.appendChild(info);
    root.appendChild(det);
    return root;
  }

  // ---------- totais ----------
  const tot = el('div', {class:'svc-total'});
  tot.appendChild(el('div', {}, [el('span',{class:'help',style:'margin:0;'},['Atendimentos no mês']), el('b',{id:'svc-tot-atend',class:'mono'},[''])]));
  tot.appendChild(el('div', {}, [el('span',{class:'help',style:'margin:0;'},['Horas de agenda']), el('b',{id:'svc-tot-horas',class:'mono'},[''])]));
  tot.appendChild(el('div', {}, [el('span',{class:'help',style:'margin:0;'},['Receita no mês']), el('b',{id:'svc-tot-receita',class:'mono'},[''])]));
  tot.appendChild(el('div', {}, [el('span',{class:'help',style:'margin:0;'},['Sobra pra você no mês']), el('b',{id:'svc-tot-liq',class:'mono',style:'color:var(--green-strong);'},[''])]));
  tot.appendChild(el('div', {id:'svc-tot-perda-box', style:'display:none;'}, [el('span',{class:'help',style:'margin:0;'},['Deixando na mesa por mês']), el('b',{id:'svc-tot-perda',class:'mono',style:'color:var(--red);'},[''])]));

  // ---------- adicionar serviço (lista pronta) ----------
  const addBox = el('div', {class:'svc-add'});
  const addBtn = el('button', {class:'btn btn-primary btn-sm', type:'button'}, ['+ Adicionar serviço']);
  const picker = el('div', {class:'svc-picker', style:'display:none;'});
  addBtn.addEventListener('click', () => { picker.style.display = picker.style.display === 'none' ? '' : 'none'; });
  const novo = (nome, min) => {
    st.calcular.push({nome, atend:0, dur:min/60, insumos:0, outros:0, impostos:g.impostos, repasse:0, comissao:g.comissao, cartao:g.cartao, margem:g.margem,
      usaPadrao:true, matModo:'valor', materiais:[], cobraHoje:0});
    picker.style.display = 'none'; persist(); rebuild();
  };
  SERVICOS_PRONTOS.forEach(grp => {
    picker.appendChild(el('div', {class:'cat-title', style:'margin-top:8px;'}, [grp.grupo]));
    const chips = el('div', {class:'svc-chips'});
    grp.itens.forEach(([nome, min]) => chips.appendChild(el('button', {type:'button', class:'svc-chip', onclick:()=>novo(nome, min)}, [nome, el('span', {class:'help', style:'margin:0 0 0 6px;display:inline;'}, ['~' + min + ' min'])])));
    picker.appendChild(chips);
  });
  picker.appendChild(el('button', {type:'button', class:'svc-chip', style:'margin-top:8px;', onclick:()=>novo('', 60)}, ['✏️ Outro serviço (em branco)']));
  picker.appendChild(el('p', {class:'help'}, ['As durações são só sugestões — ajuste ao seu ritmo de atendimento.']));
  addBox.appendChild(addBtn); addBox.appendChild(picker);

  function refreshAll(){
    const {rows, totals} = calc();
    const horaC = computeHora('prestador', st);
    let perda = 0;
    rows.forEach((c, i) => {
      const inval = c._status === 'invalido';
      setTxt('svc-preco-'+i, inval ? '—' : fmtBRL(c._precoParticular));
      if (inval){
        const d0 = $('svc-diff-'+i);
        if (d0){
          d0.style.display = ''; d0.className = 'svc-diff falta';
          const ef = c;
          d0.innerHTML = '<b>Imposto ' + fmtNum(parseBR(ef.impostos)*100,1) + '% + cartão ' + fmtNum(parseBR(ef.cartao)*100,1) + '% + comissão ' + fmtNum(parseBR(ef.comissao)*100,1) + '%'
            + (parseBR(ef.repasse) > 0 ? ' + repasse ' + fmtNum(parseBR(ef.repasse)*100,1) + '%' : '')
            + ' + margem ' + fmtNum(parseBR(ef.margem)*100,1) + '% = ' + fmtNum(c._somaPct*100,1) + '%.</b> Tudo isso sai de dentro do preço, então precisa somar menos de 100%. Diminua a margem.';
        }
      }
      const cl = $('svc-convline-'+i);
      if (cl) cl.textContent = parseBR(c.repasse) > 0 ? 'Preço pra convênio: ' + fmtBRL(c._precoConvenio) : 'Serviço particular (sem repasse de convênio).';
      setTxt('svc-liq-'+i, inval ? '—' : fmtBRL(c._liquido));
      setTxt('svc-status-'+i, statusFrase(c._status));
      const se = $('svc-status-'+i); if (se) se.className = 'svc-status st-' + (c._status||'none');
      setTxt('svc-mat-'+i, fmtBRL(parseBR(c.insumos)));
      setTxt('svc-tempo-'+i, fmtBRL(c._custoTempo));
      setTxt('svc-direto-'+i, fmtBRL(c._custoDireto));
      setTxt('svc-horas-'+i, fmtNum(c._horasTotais, 1) + ' h');
      setTxt('svc-receita-'+i, fmtBRL(c._receita));
      const d = $('svc-diff-'+i);
      const hoje = parseBR(c.cobraHoje);
      if (d && !inval){
        if (hoje > 0 && c._precoParticular > 0){
          const dif = c._precoParticular - hoje;
          d.style.display = '';
          if (dif > 0.5){
            const mes = dif * parseBR(c.atend); perda += mes;
            d.className = 'svc-diff falta';
            d.innerHTML = 'Você cobra <b>' + fmtBRL(dif) + ' a menos</b> que o preço justo' + (mes > 0 ? ' — <b>' + fmtBRL(mes) + ' por mês</b> que ficam na mesa.' : '.');
          } else {
            d.className = 'svc-diff ok';
            d.innerHTML = '👍 Seu preço atual (' + fmtBRL(hoje) + ') já cobre o preço justo.';
          }
        } else d.style.display = 'none';
      }
    });
    const somaG = parseBR(g.impostos) + parseBR(g.cartao) + parseBR(g.comissao);
    const maxMargem = Math.max(0, 1 - somaG);
    setTxt('svc-global-max', 'Com esse imposto, cartão e comissão, a margem máxima possível é ' + fmtNum(maxMargem*100, 0) + '% — e o ideal é ficar bem abaixo disso.');
    const ga = $('svc-global-aviso');
    if (ga){
      if (somaG + parseBR(g.margem) >= 1){
        ga.style.display = ''; ga.className = 'svc-diff falta';
        ga.innerHTML = '<b>Imposto + cartão + comissão + margem = ' + fmtNum((somaG + parseBR(g.margem))*100, 1) + '%.</b> Precisa ficar abaixo de 100%, senão não existe preço possível. Diminua a margem para menos de ' + fmtNum(maxMargem*100, 0) + '%.';
      } else ga.style.display = 'none';
    }
    setTxt('svc-tot-atend', fmtNum(totals.atendimentos, 0));
    setTxt('svc-tot-horas', fmtNum(totals.horas, 1) + ' h de ' + fmtNum(horaC.horasDisponiveis || 0, 0) + ' h disponíveis');
    setTxt('svc-tot-receita', fmtBRL(totals.receita));
    setTxt('svc-tot-liq', fmtBRL(totals.liquido));
    const pb = $('svc-tot-perda-box'); if (pb) pb.style.display = perda > 0 ? '' : 'none';
    setTxt('svc-tot-perda', fmtBRL(perda));
  }

  wrap.appendChild(addBox);
  wrap.appendChild(tot);
  body.appendChild(el('ul', {class:'note-list', style:'margin-top:16px;'}, [
    el('li', {}, ['O preço justo cobre o seu tempo (pelo custo da sua hora), o material, os outros custos, os impostos, as taxas e ainda deixa a margem de lucro que você escolheu.']),
    el('li', {}, ['🔴 significa que o atendimento não paga nem o seu tempo; 🟢 significa que sobra pelo menos o dobro do custo da sua hora.']),
  ]));
  rebuild();
  requestAnimationFrame(refreshAll);
}

/* ======================= PRODUTO FÍSICO ======================= */

function buildCalcProduto(wrap, body){
  const table = el('table', {class:'grid'});
  const heads = ['Produto','Unidades/mês','Matéria-prima (R$)','Tempo produção (h)','Mão de obra','Embalagem (R$)','Frete (R$)','Outros custos (R$)',
    'Custo unitário','Rateio fixo/un.','Custo total unit.','Impostos %','Comissão %','Taxa plataforma %','Margem %','Preço de venda','Markup','Status',''];
  table.appendChild(el('thead',{},[el('tr',{}, heads.map(h=>el('th',{},[h])))]));
  const tbody = el('tbody');
  table.appendChild(tbody);

  function calc(){ return computeCalcAll('produto', APP.state.calcular, computeHora('produto', APP.state)); }

  function refresh(){
    const {rows, totals} = calc();
    rows.forEach((r,i) => {
      setTxt('c-maoobra-'+i, fmtBRL(r._maoObra));
      setTxt('c-custou-'+i, fmtBRL(r._custoUnitario));
      setTxt('c-rateio-'+i, fmtBRL(r._rateio));
      setTxt('c-custotot-'+i, fmtBRL(r._custoTotalUnitario));
      setTxt('c-preco-'+i, fmtBRL(r._preco));
      setTxt('c-markup-'+i, fmtNum(r._markup,2)+'×');
      setPill('c-status-'+i, r._status);
    });
    setTxt('c-tot-unid', fmtNum(totals.unidades,0));
    setTxt('c-tot-receita', fmtBRL(totals.receita));
  }
  function setTxt(id,t){ const e=document.getElementById(id); if(e) e.textContent=t; }
  function setPill(id,status){ const e=document.getElementById(id); if(e){ e.innerHTML=''; e.appendChild(statusPillNode(status)); } }

  function rebuild(){
    tbody.innerHTML = '';
    const {rows} = calc();
    APP.state.calcular.forEach((r,i) => tbody.appendChild(buildRow(r,i,rows[i])));
  }
  function td(node){ const t = el('td'); t.appendChild(node); return t; }

  function buildRow(r, i, computed){
    const tr = el('tr');
    const nameTd = el('td', {class:'col-name'});
    const nameInp = el('input', {class:'inp text-left', value:r.nome||''});
    nameInp.addEventListener('input', () => { r.nome = nameInp.value; persist(); });
    nameTd.appendChild(nameInp);
    if (r._example) nameTd.appendChild(exampleBadge());
    tr.appendChild(nameTd);

    tr.appendChild(td(numberInput({value:r.unidades, kind:'num', dec:0, onInput:(n)=>{r.unidades=n;persist();refresh();}})));

    const mpTd = el('td');
    const mpWrap = el('div', {style:'display:flex;gap:4px;align-items:center;'});
    mpWrap.appendChild(numberInput({value:r.materiaPrima, kind:'brl', onInput:(n)=>{r.materiaPrima=n;persist();refresh();}}));
    const btn = el('button', {class:'btn-ghost btn-sm', title:'somar a partir da matéria-prima', style:'padding:6px 8px;'}, ['🧮']);
    btn.addEventListener('click', (e) => {
      openInsumoPopover(e.currentTarget, (total) => {
        r.materiaPrima = total; persist();
        mpWrap.querySelector('input').value = fmtNum(total,2);
        refresh();
      });
    });
    mpWrap.appendChild(btn);
    mpTd.appendChild(mpWrap);
    tr.appendChild(mpTd);

    tr.appendChild(td(numberInput({value:r.tempo, kind:'num', dec:2, onInput:(n)=>{r.tempo=n;persist();refresh();}})));
    tr.appendChild(td(lockedOut('c-maoobra-'+i, fmtBRL(computed._maoObra))));
    tr.appendChild(td(numberInput({value:r.embalagem, kind:'brl', onInput:(n)=>{r.embalagem=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.frete, kind:'brl', onInput:(n)=>{r.frete=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.outros, kind:'brl', onInput:(n)=>{r.outros=n;persist();refresh();}})));
    tr.appendChild(td(lockedOut('c-custou-'+i, fmtBRL(computed._custoUnitario))));
    tr.appendChild(td(lockedOut('c-rateio-'+i, fmtBRL(computed._rateio))));
    tr.appendChild(td(lockedOut('c-custotot-'+i, fmtBRL(computed._custoTotalUnitario))));
    tr.appendChild(td(numberInput({value:r.impostos, kind:'pct', onInput:(n)=>{r.impostos=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.comissao, kind:'pct', onInput:(n)=>{r.comissao=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.plataforma, kind:'pct', onInput:(n)=>{r.plataforma=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.margem, kind:'pct', onInput:(n)=>{r.margem=n;persist();refresh();}})));
    tr.appendChild(td(resultOut('c-preco-'+i, fmtBRL(computed._preco))));
    tr.appendChild(td(lockedOut('c-markup-'+i, fmtNum(computed._markup,2)+'×')));
    const statusTd = el('td', {id:'c-status-'+i}); statusTd.appendChild(statusPillNode(computed._status)); tr.appendChild(statusTd);
    const delTd = el('td');
    delTd.appendChild(el('button', {class:'row-del', onclick:()=>{ APP.state.calcular.splice(i,1); persist(); rebuild(); refresh(); }}, ['✕']));
    tr.appendChild(delTd);
    return tr;
  }

  rebuild();
  wrap.appendChild(table);
  const initTotals = calc().totals;
  const tfoot = el('tfoot', {}, [el('tr', {}, [
    el('td', {style:'font-weight:800;'}, ['TOTAL MÊS']),
    el('td', {}, [lockedOut('c-tot-unid',fmtNum(initTotals.unidades,0))]),
    el('td'), el('td'), el('td'), el('td'), el('td'), el('td'), el('td'), el('td'), el('td'), el('td'), el('td'), el('td'),
    el('td', {}, [resultOut('c-tot-receita',fmtBRL(initTotals.receita))]), el('td'), el('td'), el('td'),
  ])]);
  table.appendChild(tfoot);

  body.appendChild(addRowBtn('adicionar produto', () => {
    APP.state.calcular.push({nome:'', unidades:0, materiaPrima:0, tempo:0, embalagem:0, frete:0, outros:0, impostos:.06, comissao:.1, plataforma:.05, margem:.4});
    persist(); rebuild(); refresh();
  }));
  body.appendChild(el('ul', {class:'note-list', style:'margin-top:16px;'}, [
    el('li', {}, ['Custo matéria-prima = soma dos insumos que entram em 1 unidade (veja a etapa Matéria-Prima).']),
    el('li', {}, ['Tempo produção = horas que uma pessoa gasta fazendo 1 unidade (cortar, montar, costurar, acabamento).']),
    el('li', {}, ['Rateio fixo por unidade divide o custo fixo da empresa entre TODOS os produtos, proporcional ao volume de cada mês.']),
    el('li', {}, ['Se vende em marketplace (Shopee, Mercado Livre), coloque a taxa deles em "Taxa plataforma".']),
  ]));
}

/* ======================= PROFISSIONAL DO CONHECIMENTO ======================= */

const MODALIDADES = ['1:1','GRUPO','GRAVADO','MISTO'];

function buildCalcConhecimento(wrap, body){
  const table = el('table', {class:'grid'});
  const heads = ['Produto / programa','Modalidade','Alunos/mês','Duração (meses)','Horas ao vivo/aluno','Horas ao vivo em grupo','Horas preparação',
    'Horas suporte','Horas totais/mês','Horas/aluno','Custo/aluno (mat.)','Custo fixo programa','Custo tempo/mês','Custo total/mês','Custo/aluno',
    'Taxa plataforma %','Afiliados %','Impostos %','Margem %','Preço/aluno','Receita mês','Status',''];
  table.appendChild(el('thead',{},[el('tr',{}, heads.map(h=>el('th',{},[h])))]));
  const tbody = el('tbody');
  table.appendChild(tbody);

  function calc(){ return computeCalcAll('conhecimento', APP.state.calcular, computeHora('conhecimento', APP.state)); }

  function refresh(){
    const {rows, totals} = calc();
    rows.forEach((r,i) => {
      setTxt('c-htot-'+i, fmtNum(r._horasTotaisMes,2));
      setTxt('c-haluno-'+i, fmtNum(r._horasPorAluno,2));
      setTxt('c-ctempo-'+i, fmtBRL(r._custoTempo));
      setTxt('c-ctotmes-'+i, fmtBRL(r._custoTotalMes));
      setTxt('c-caluno-'+i, fmtBRL(r._custoPorAluno));
      setTxt('c-preco-'+i, fmtBRL(r._preco));
      setTxt('c-receita-'+i, fmtBRL(r._receita));
      setPill('c-status-'+i, r._status);
    });
    setTxt('c-tot-alunos', fmtNum(totals.alunos,0));
    setTxt('c-tot-horas', fmtNum(totals.horas,2));
    setTxt('c-tot-receita', fmtBRL(totals.receita));
  }
  function setTxt(id,t){ const e=document.getElementById(id); if(e) e.textContent=t; }
  function setPill(id,status){ const e=document.getElementById(id); if(e){ e.innerHTML=''; e.appendChild(statusPillNode(status)); } }

  function rebuild(){
    tbody.innerHTML = '';
    const {rows} = calc();
    APP.state.calcular.forEach((r,i) => tbody.appendChild(buildRow(r,i,rows[i])));
  }
  function td(node){ const t = el('td'); t.appendChild(node); return t; }

  function buildRow(r, i, computed){
    const tr = el('tr');
    const nameTd = el('td', {class:'col-name'});
    const nameInp = el('input', {class:'inp text-left', value:r.nome||''});
    nameInp.addEventListener('input', () => { r.nome = nameInp.value; persist(); });
    nameTd.appendChild(nameInp);
    if (r._example) nameTd.appendChild(exampleBadge());
    tr.appendChild(nameTd);

    const modTd = el('td');
    const sel = el('select', {class:'inp'});
    MODALIDADES.forEach(mo => sel.appendChild(el('option', {value:mo, selected: mo===r.modalidade ? 'selected' : null}, [mo])));
    sel.addEventListener('change', () => { r.modalidade = sel.value; persist(); });
    modTd.appendChild(sel);
    tr.appendChild(modTd);

    tr.appendChild(td(numberInput({value:r.alunos, kind:'num', dec:0, onInput:(n)=>{r.alunos=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.duracao, kind:'num', dec:0, onInput:(n)=>{r.duracao=n;persist();}})));
    tr.appendChild(td(numberInput({value:r.horasVivoAluno, kind:'num', dec:2, onInput:(n)=>{r.horasVivoAluno=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.horasVivoGrupo, kind:'num', dec:2, onInput:(n)=>{r.horasVivoGrupo=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.horasPrep, kind:'num', dec:2, onInput:(n)=>{r.horasPrep=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.horasSuporte, kind:'num', dec:2, onInput:(n)=>{r.horasSuporte=n;persist();refresh();}})));
    tr.appendChild(td(lockedOut('c-htot-'+i, fmtNum(computed._horasTotaisMes,2))));
    tr.appendChild(td(lockedOut('c-haluno-'+i, fmtNum(computed._horasPorAluno,2))));
    tr.appendChild(td(numberInput({value:r.custoMaterial, kind:'brl', onInput:(n)=>{r.custoMaterial=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.custoFixoPrograma, kind:'brl', onInput:(n)=>{r.custoFixoPrograma=n;persist();refresh();}})));
    tr.appendChild(td(lockedOut('c-ctempo-'+i, fmtBRL(computed._custoTempo))));
    tr.appendChild(td(lockedOut('c-ctotmes-'+i, fmtBRL(computed._custoTotalMes))));
    tr.appendChild(td(lockedOut('c-caluno-'+i, fmtBRL(computed._custoPorAluno))));
    tr.appendChild(td(numberInput({value:r.plataforma, kind:'pct', onInput:(n)=>{r.plataforma=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.afiliados, kind:'pct', onInput:(n)=>{r.afiliados=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.impostos, kind:'pct', onInput:(n)=>{r.impostos=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.margem, kind:'pct', onInput:(n)=>{r.margem=n;persist();refresh();}})));
    tr.appendChild(td(resultOut('c-preco-'+i, fmtBRL(computed._preco))));
    tr.appendChild(td(resultOut('c-receita-'+i, fmtBRL(computed._receita))));
    const statusTd = el('td', {id:'c-status-'+i}); statusTd.appendChild(statusPillNode(computed._status)); tr.appendChild(statusTd);
    const delTd = el('td');
    delTd.appendChild(el('button', {class:'row-del', onclick:()=>{ APP.state.calcular.splice(i,1); persist(); rebuild(); refresh(); }}, ['✕']));
    tr.appendChild(delTd);
    return tr;
  }

  rebuild();
  wrap.appendChild(table);
  const initTotals = calc().totals;
  const tfoot = el('tfoot', {}, [el('tr', {}, [
    el('td', {style:'font-weight:800;'}, ['TOTAL MÊS']), el('td'),
    el('td', {}, [lockedOut('c-tot-alunos',fmtNum(initTotals.alunos,0))]), el('td'), el('td'), el('td'), el('td'), el('td'),
    el('td', {}, [lockedOut('c-tot-horas',fmtNum(initTotals.horas,2))]),
    el('td'), el('td'), el('td'), el('td'), el('td'), el('td'), el('td'), el('td'), el('td'), el('td'),
    el('td', {}, [resultOut('c-tot-receita',fmtBRL(initTotals.receita))]), el('td'), el('td'),
  ])]);
  table.appendChild(tfoot);

  body.appendChild(addRowBtn('adicionar oferta', () => {
    APP.state.calcular.push({nome:'', modalidade:'1:1', alunos:0, duracao:1, horasVivoAluno:0, horasVivoGrupo:0, horasPrep:0, horasSuporte:0,
      custoMaterial:0, custoFixoPrograma:0, plataforma:0, afiliados:0, impostos:.06, margem:.4});
    persist(); rebuild(); refresh();
  }));
  body.appendChild(el('ul', {class:'note-list', style:'margin-top:16px;'}, [
    el('li', {}, ['1:1 → horas ao vivo por aluno. Ex.: mentoria individual 1h/semana = 4h/mês.']),
    el('li', {}, ['GRUPO → horas ao vivo em grupo (não multiplica por aluno). Ex.: 4 encontros de 1h = 4h/mês.']),
    el('li', {}, ['GRAVADO → deixe as horas ao vivo em 0. Só preparação e suporte contam. Alunos = quantos compram por mês.']),
    el('li', {}, ['Taxa plataforma: Hotmart/Kiwify ≈ 10%. Venda direta (Pix) = 0%.']),
    el('li', {}, ['O preço garante sua margem. Se o mercado não paga, o ajuste é posicionamento, público ou formato — não rebaixar preço.']),
  ]));
}
/* ---------------------------------------------------------------------- */
/* Etapa: Resumo                                                          */
/* ---------------------------------------------------------------------- */

function verdictBanner(bate, valorFalta, liquidoLabel){
  const cls = bate ? 'ok' : 'bad';
  const vt = bate ? '✅ Bate a meta' : '❌ Não bate a meta ainda';
  const vv = bate ? ('Sobra ' + fmtBRL(valorFalta) + ' além da meta') : ('Faltam ' + fmtBRL(valorFalta) + ' pra chegar na meta');
  return el('div', {class:'verdict '+cls}, [
    el('div', {}, [el('div',{class:'vt'},[vt]), el('div',{class:'vv'},[vv])]),
    el('div', {style:'font-size:12.5px;color:var(--ink-soft);max-width:260px;'}, [liquidoLabel]),
  ]);
}

function metaTiles(grid, r){
  if (r.outrasRendas > 0){
    grid.appendChild(statTile(null,'🎯 Meta total (tudo que você precisa)', fmtBRL(r.metaTotal)));
    grid.appendChild(statTile(null,'💼 Outras rendas (CLT, investimentos…)', fmtBRL(r.outrasRendas)));
    grid.appendChild(statTile(null,'🎯 Meta deste negócio', fmtBRL(r.meta)));
  } else {
    grid.appendChild(statTile(null,'🎯 Meta de lucro mensal', fmtBRL(r.meta)));
  }
}

function renderStepResumo(panel){
  const model = APP.model;
  const r = computeResumo(model, APP.state);
  panelHead(panel, '📊 A foto do seu negócio', 'Resumo — Seus Números',
    'Olhe aqui antes de aceitar um novo cliente, mudar de preço ou decidir qualquer coisa importante.');
  const body = el('div', {class:'panel-body'});
  const grid = el('div', {class:'stat-grid'});

  if (model === 'prestador'){
    metaTiles(grid, r);
    grid.appendChild(statTile(null,'🏠 Custo da vida pessoal', fmtBRL(r.custoVida)));
    grid.appendChild(statTile(null,'🏢 Custo fixo do consultório', fmtBRL(r.custoFixoNegocio)));
    grid.appendChild(statTile(null,'⏱ Horas disponíveis na agenda', fmtNum(r.horasDisponiveis,1)+' h'));
    grid.appendChild(statTile(null,'📋 Horas efetivamente atendidas', fmtNum(r.horasAtendidas,1)+' h'));
    grid.appendChild(statTile(null,'📊 Ocupação real', fmtPct(r.ocupacaoReal)));
    grid.appendChild(statTile(null,'💰 Custo por hora', fmtBRL(r.custoHora)));
    grid.appendChild(statTile(null,'📥 Receita bruta projetada', fmtBRL(r.receita)));
    grid.appendChild(statTile(null,'🏆 Líquido que sobra pra você', fmtBRL(r.liquido), 'hi'));
    if (r.perdaMensal > 0) grid.appendChild(statTile(null,'💸 Deixando na mesa por mês (preço atual abaixo do justo)', fmtBRL(r.perdaMensal), 'warn'));
    body.appendChild(grid);
    body.appendChild(verdictBanner(r.bateMeta, r.diff, 'Líquido após impostos, repasses e custos, comparado com ' + (r.outrasRendas > 0 ? 'o que este negócio precisa entregar (meta total menos suas outras rendas).' : 'sua meta de lucro.')));
    body.appendChild(el('div', {class:'callout'}, ['Cada horário vago na sua agenda é dinheiro que você já gastou e não vai receber de volta. Preço justo protege sua saúde financeira — e é o primeiro passo pra cuidar bem dos seus pacientes.']));
  }

  if (model === 'produto'){
    metaTiles(grid, r);
    grid.appendChild(statTile(null,'🏠 Custo da vida pessoal', fmtBRL(r.custoVida)));
    grid.appendChild(statTile(null,'🏢 Custo fixo mensal da empresa', fmtBRL(r.custoFixoEmpresa)));
    grid.appendChild(statTile(null,'⏱ Custo/hora da empresa', fmtBRL(r.custoHoraEmpresa)));
    grid.appendChild(statTile(null,'🔧 Custo/hora da produção', fmtBRL(r.custoHoraProducao)));
    grid.appendChild(statTile(null,'📦 Unidades a vender no mês', fmtNum(r.unidades,0)));
    grid.appendChild(statTile(null,'📥 Receita projetada', fmtBRL(r.receita)));
    grid.appendChild(statTile(null,'🏆 Lucro líquido projetado', fmtBRL(r.liquido), 'hi'));
    body.appendChild(grid);
    body.appendChild(verdictBanner(r.bateMeta, r.diff, 'Lucro líquido (soma das margens de cada produto), comparado com ' + (r.outrasRendas > 0 ? 'o que este negócio precisa entregar (meta total menos suas outras rendas).' : 'sua meta de lucro.')));
    body.appendChild(el('div', {class:'callout'}, ['O cliente não te paga pelo que você faz. Ele te paga pelo valor que entrega a ele. Sua planilha garante só uma coisa: que esse pagamento também PAGA a sua vida e o seu negócio.']));
  }

  if (model === 'conhecimento'){
    metaTiles(grid, r);
    grid.appendChild(statTile(null,'🏠 Custo da vida pessoal', fmtBRL(r.custoVida)));
    grid.appendChild(statTile(null,'🏢 Custo fixo do negócio', fmtBRL(r.custoFixoNegocio)));
    grid.appendChild(statTile(null,'⏱ Horas produtivas no mês', fmtNum(r.horasProdutivasMes,1)+' h'));
    grid.appendChild(statTile(null,'💰 Custo por hora (mínimo)', fmtBRL(r.custoHora)));
    grid.appendChild(statTile(null,'📋 Horas comprometidas nas ofertas', fmtNum(r.horasComprometidas,1)+' h'));
    grid.appendChild(statTile(null,'📊 Capacidade usada', fmtPct(r.capacidadeUsada), r.capStatus==='over'?'warn':''));
    grid.appendChild(statTile(null,'📥 Receita projetada', fmtBRL(r.receita)));
    grid.appendChild(statTile(null,'🏆 Lucro líquido projetado', fmtBRL(r.liquido), 'hi'));
    body.appendChild(grid);
    body.appendChild(verdictBanner(r.bateMeta, r.diff, 'Lucro líquido (soma das margens de cada oferta), comparado com ' + (r.outrasRendas > 0 ? 'o que este negócio precisa entregar (meta total menos suas outras rendas).' : 'sua meta de lucro.')));
    const capMsgs = {
      over: '🔴 Atenção: as horas comprometidas ULTRAPASSAM sua capacidade mensal. Revise a agenda ou contrate ajuda.',
      alerta: '🟡 Alerta: você está usando mais de 90% da sua capacidade. Pouco espaço pra crescer sem contratar.',
      ok: '🟢 OK: sua agenda ainda tem espaço pra crescer.',
    };
    body.appendChild(el('div', {class:'callout'}, [capMsgs[r.capStatus]]));
    body.appendChild(el('div', {class:'callout'}, ['O infoproduto não é o futuro do seu negócio — é o que te devolve o TEMPO. Quanto mais você escala sem vender hora, mais liberdade você compra.']));
  }

  body.appendChild(el('div', {class:'field-row', style:'margin-top:18px;grid-template-columns:1fr auto;'}, [
    el('label', {style:'color:var(--ink-faint);'}, ['🎯 Meta mensal sugerida pelos seus sonhos (etapa 1)']),
    el('span', {class:'mono', style:'font-weight:700;'}, [fmtBRL(r.metaSonhos)]),
  ]));

  panel.appendChild(body);
  footNav(panel, {});
}

/* ---------------------------------------------------------------------- */
/* Etapa: Crescer — Rotina das 4 Camadas                                   */
/* ---------------------------------------------------------------------- */

const CRESCER_ROWS = [
  {cam:'SEMANAL', per:'10 a 15 min', desc:'Atualizar entradas e saídas da semana. Manter os números vivos.'},
  {cam:'MENSAL', per:'45 min a 1 h', desc:'Fechamento do mês. Comparar com a meta dos sonhos. Identificar desvios. Celebrar acertos.'},
  {cam:'TRIMESTRAL', per:'2 horas', desc:'Revisão estratégica. O preço continua certo? Algum cliente está dando prejuízo? Vale subir preço?'},
  {cam:'ANUAL', per:'Meio dia', desc:'Replanejamento completo. Reajuste de preço. Revisão dos sonhos. Balanço do ano. Nova meta.'},
];

function renderStepCrescer(panel){
  panelHead(panel, '4º C — Crescer', 'Rotina das 4 Camadas',
    'O método só funciona se virar rotina. Quatro periodicidades que mantêm seus números vivos.');
  const body = el('div', {class:'panel-body'});
  const wrap = el('div', {class:'table-wrap'});
  const table = el('table', {class:'grid'});
  table.appendChild(el('thead',{},[el('tr',{},[el('th',{},['Camada']), el('th',{},['Periodicidade']), el('th',{},['O que fazer'])])]));
  const tbody = el('tbody');
  CRESCER_ROWS.forEach(row => {
    tbody.appendChild(el('tr', {}, [
      el('td', {style:'font-weight:800;'}, [row.cam]),
      el('td', {}, [row.per]),
      el('td', {style:'white-space:normal;min-width:320px;'}, [row.desc]),
    ]));
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  body.appendChild(wrap);

  body.appendChild(el('div', {class:'callout'}, ['Marque essas datas no celular como compromisso inegociável. É o que separa quem APRENDEU o método de quem realmente VIVE o método.']));

  body.appendChild(el('div', {class:'cat-title', style:'margin-top:24px;'}, ['E o 3º C — Cobrar?']));
  body.appendChild(el('p', {class:'help', style:'font-size:13px;'}, ['Depois de calcular o preço certo, falta o script de venda e o banco de objeções — a parte de "cobrar sem culpa". Essa etapa não entra nesta calculadora; ela mora no material do curso PRECIFICA.']));

  const restartRow = el('div', {style:'display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;'});
  restartRow.appendChild(el('button', {class:'btn btn-secondary', onclick:()=>goStep('resumo')}, ['← Ver o Resumo de novo']));
  restartRow.appendChild(el('button', {class:'btn btn-primary', onclick:goHome}, ['Trocar de modelo']));
  body.appendChild(restartRow);

  panel.appendChild(body);
  footNav(panel, {});
}

/* ---------------------------------------------------------------------- */
/* Boot                                                                    */
/* ---------------------------------------------------------------------- */

initAuthListener();
