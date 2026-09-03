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
import { firebaseConfig, MENTOR_EMAILS } from "./firebase-config.js";

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
const VIDA_CATS = [{"name": "MORADIA", "items": ["Aluguel ou financiamento", "Condomínio", "IPTU (anual ÷ 12)", "Luz / energia", "Água", "Gás (botijão ou encanado)", "Internet", "TV a cabo / streaming (Netflix, Spotify etc)", "Empregada / diarista", "Jardineiro / piscineiro / manutenção", "Móveis, decoração, reformas (reserva mensal)"]}, {"name": "ALIMENTAÇÃO", "items": ["Supermercado", "Feira / hortifruti", "Açougue / peixaria", "Padaria / laticínios", "Restaurantes", "Delivery / fast food", "Cafés e lanches fora"]}, {"name": "TRANSPORTE", "items": ["Combustível", "Parcela do carro / financiamento", "Seguro do carro (anual ÷ 12)", "IPVA + licenciamento (anual ÷ 12)", "Manutenção do carro (revisão, pneus)", "Uber / 99 / táxi", "Transporte público", "Estacionamento"]}, {"name": "SAÚDE", "items": ["Plano de saúde", "Plano odontológico", "Academia / personal / crossfit", "Terapia / psicólogo", "Nutricionista", "Medicamentos de uso contínuo", "Exames e consultas", "Suplementos / vitaminas"]}, {"name": "FAMÍLIA", "items": ["Escola / faculdade dos filhos", "Atividades dos filhos (aulas extras)", "Pensão alimentícia", "Pets (ração, vet, banho)", "Presentes (aniversários, Natal)", "Apoio a familiares"]}, {"name": "PESSOAL", "items": ["Cabeleireiro / barbeiro", "Unha / estética", "Cosméticos e higiene", "Roupas e calçados", "Acessórios"]}, {"name": "LAZER", "items": ["Viagens (reserva mensal)", "Cinema, teatro, shows", "Hobbies (curso, material)", "Eventos e festas", "Assinaturas de lazer (clubes, revistas)"]}, {"name": "INVESTIMENTOS E RESERVAS", "items": ["Reserva de emergência", "Poupança", "Previdência privada", "Investimentos em renda variável", "Outros aportes"]}, {"name": "DÍVIDAS E FINANCIAMENTOS", "items": ["Cartão de crédito (rotativo)", "Empréstimo pessoal", "Financiamento imóvel (se não for moradia atual)", "Outras parcelas"]}, {"name": "OUTROS", "items": ["Doações / dízimo", "Assinaturas diversas (apps, jornais)", "Imprevistos / reserva 10%"]}];
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
    metaComponents:[
      {label:'Pró-labore (seu salário)', help:'O que você tira pra viver o mês', def:10000},
      {label:'Reserva de emergência', help:'Caixa pra imprevistos pessoais', def:3000},
      {label:'Investimentos', help:'Previdência, renda variável, poupança', def:4000},
      {label:'Crescimento (cursos, congressos, viagens)', help:'O que financia sua evolução profissional', def:3000},
    ],
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
    metaComponents:[
      {label:'Pró-labore (seu salário)', help:'O que você tira pra viver o mês', def:8000},
      {label:'Reserva de emergência', help:'Caixa pra imprevistos pessoais', def:2000},
      {label:'Investimentos', help:'Previdência, renda variável, poupança', def:3000},
      {label:'Crescimento (cursos, viagens, lazer)', help:'O que financia sua evolução', def:2000},
    ],
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
    metaComponents:[
      {label:'Pró-labore (seu salário)', help:'O que você tira pra viver o mês', def:12000},
      {label:'Reserva de emergência', help:'Caixa pra imprevistos pessoais', def:3000},
      {label:'Investimentos', help:'Previdência, renda variável, poupança', def:5000},
      {label:'Crescimento (cursos, congressos, viagens)', help:'O que financia sua evolução', def:5000},
    ],
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

const STEP_ORDER = ['sonhos','meta','vida','negocio','insumos','hora','calcular','resumo','crescer'];

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

function defaultSonhos(){
  return [0,1,2,3,4,5].map(() => ({desc:'', custo:0, prazo:0}));
}
function defaultMeta(modelKey){
  const m = MODELS[modelKey];
  return {
    valor: m.metaDefault,
    comp: m.metaComponents.map(c => c.def),
  };
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
    codigo: m.insumosCodePrefix + String(i+1).padStart(3,'0'),
    nome: d[0], unidade: d[1], qtd: d[2], valor: d[3],
  }));
}
function defaultCalc(modelKey){
  const ex = CALC_EXAMPLES[modelKey];
  return ex.map(row => Object.assign({_id:uid(), _example:true}, row));
}

function defaultState(modelKey){
  return {
    sonhos: defaultSonhos(),
    meta: defaultMeta(modelKey),
    vida: VIDA_FLAT.map(() => 0),
    negocio: negocioFlat(modelKey).map(() => 0),
    insumos: defaultInsumos(modelKey),
    hora: defaultHora(modelKey),
    calcular: defaultCalc(modelKey),
  };
}

function mergeWithDefaults(modelKey, parsed){
  const def = defaultState(modelKey);
  if (!parsed) return def;
  const merged = Object.assign({}, def, parsed);
  if (!merged.vida || merged.vida.length !== def.vida.length) merged.vida = def.vida;
  if (!merged.negocio || merged.negocio.length !== def.negocio.length) merged.negocio = def.negocio;
  if (!merged.sonhos) merged.sonhos = def.sonhos;
  if (!merged.calcular || !merged.calcular.length) merged.calcular = def.calcular;
  if (!merged.insumos) merged.insumos = def.insumos;
  merged.hora = Object.assign({}, def.hora, merged.hora);
  merged.meta = Object.assign({}, def.meta, merged.meta);
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
function sumSonhosMensal(state){
  return (state.sonhos||[]).reduce((s,r) => s + safeDiv(parseBR(r.custo), parseBR(r.prazo)), 0);
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

function computeCalcAll(modelKey, rows, horaC){
  if (modelKey === 'prestador') return computeCalcPrestador(rows, horaC);
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
    const denomM = 1 - H - J - K - L;
    const M = B === 0 ? 0 : (denomM <= 0 ? 0 : G / denomM);
    const denomN = 1 - H - I - J - K - L;
    const N = B === 0 ? 0 : (I === 0 ? 0 : (denomN <= 0 ? 0 : G / denomN));
    const O = B === 0 ? 0 : (I > 0 ? N*(1-H-I-J-K) - G : M*(1-H-J-K) - G);
    const P = B * C;
    const Q = B === 0 ? 0 : (I > 0 ? N*B : M*B);
    const liqHora = safeDiv(O, C);
    let status = '';
    if (B !== 0) status = liqHora >= custoHora*2 ? 'otimo' : (liqHora >= custoHora ? 'ok' : 'baixo');
    return Object.assign({}, row, {_custoTempo:F, _custoDireto:G, _precoParticular:M, _precoConvenio:N, _liquido:O, _horasTotais:P, _receita:Q, _status:status});
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
  const calc = computeCalcAll(modelKey, state.calcular, horaC);
  const meta = parseBR(state.meta.valor);
  const custoVida = sumVida(state);
  const metaSonhos = sumSonhosMensal(state);

  if (modelKey === 'prestador'){
    const liquido = calc.totals.liquido;
    return {
      meta, custoVida, metaSonhos,
      custoFixoNegocio: horaC.custoFixoNegocio,
      horasDisponiveis: horaC.horasDisponiveis,
      horasAtendidas: calc.totals.horas,
      ocupacaoReal: safeDiv(calc.totals.horas, horaC.horasDisponiveis),
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
      meta, custoVida, metaSonhos,
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
      meta, custoVida, metaSonhos,
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
/* Estado da aplicação + roteamento (login / cadastro / menu / wizard /    */
/* painel do mentor)                                                       */
/* ---------------------------------------------------------------------- */

const APP = {
  view: 'loading', // loading | login | signup | menu | wizard | mentor
  model: null,
  step: 'sonhos',
  state: null,
  authMsg: '',
  menuResumo: null, // resumos/{uid} cache pra tela de menu
  mentorRows: null,
};
let CURRENT_USER = null; // {uid, email, nome, role}

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
    // cadastro já monta o CURRENT_USER (com o "role" certinho) e chama
    // render() antes que este listener dispare de novo pra mesma conta.
    // Sem essa guarda, este trecho releria o perfil no Firestore — que
    // às vezes ainda não terminou de ser gravado — e um mentor recém-
    // cadastrado podia aparecer como "aluno" até deslogar e entrar de novo.
    if (CURRENT_USER && CURRENT_USER.uid === fbUser.uid) return;
    try{
      const ref = FS.doc(dbfs, 'users', fbUser.uid);
      const snap = await FS.getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      CURRENT_USER = {
        uid: fbUser.uid,
        email: fbUser.email || data.email || '',
        nome: data.nome || fbUser.displayName || (fbUser.email||'').split('@')[0],
        role: data.role || 'aluno',
      };
    }catch(e){
      console.warn('perfil load failed', e);
      CURRENT_USER = { uid: fbUser.uid, email: fbUser.email||'', nome: fbUser.displayName||'', role:'aluno' };
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
function goMentor(){
  APP.view = 'mentor';
  APP.mentorRows = null;
  render();
  loadMentorRows();
}
async function loadMentorRows(){
  try{
    const col = FS.collection(dbfs, 'resumos');
    const snap = await FS.getDocs(FS.query(col, FS.orderBy('nome')));
    APP.mentorRows = snap.docs.map(d => Object.assign({_id:d.id}, d.data()));
  }catch(e){
    console.warn('mentor load failed', e);
    APP.mentorRows = [];
  }
  if (APP.view === 'mentor') render();
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
  if (APP.view === 'mentor'){ root.appendChild(renderTopbar()); root.appendChild(renderMentorPanel()); return; }
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
        const role = MENTOR_EMAILS.includes(emailInp.value.trim().toLowerCase()) ? 'mentor' : 'aluno';
        await FS.setDoc(FS.doc(dbfs, 'users', cred.user.uid), {
          nome: nomeInp.value.trim(), email: emailInp.value.trim(), role, criadoEm: FS.serverTimestamp(),
        });
        await FS.setDoc(FS.doc(dbfs, 'resumos', cred.user.uid), {
          nome: nomeInp.value.trim(), email: emailInp.value.trim(),
        }, {merge:true});
        APP.authMsg = '';
        // Monta o usuário atual diretamente com os dados que acabamos de gravar,
        // em vez de esperar o listener de autenticação reler o Firestore — essa
        // releitura pode disparar antes da gravação acima terminar (ver nota em
        // initAuthListener) e faria um mentor recém-cadastrado cair como aluno.
        CURRENT_USER = { uid: cred.user.uid, email: emailInp.value.trim(), nome: nomeInp.value.trim(), role };
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
  if (APP.view === 'menu' || APP.view === 'mentor'){
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
  if (CURRENT_USER.role === 'mentor'){
    userbar.appendChild(el('span', {class:'role-badge'}, ['mentor']));
    userbar.appendChild(el('button', {class:'btn btn-secondary btn-sm', onclick: goMentor}, ['📊 Painel do mentor (ver turma)']));
  }
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
    el('li', {}, ['Só você (e, pros números-resumo, seu mentor) tem acesso ao que você preenche.']),
  ]));
  return wrap;
}

/* ---------------------------------------------------------------------- */
/* Painel do mentor                                                       */
/* ---------------------------------------------------------------------- */

function bateBadge(v){
  if (v === true) return el('span', {class:'bate-pill bate-yes'}, ['✅ bate']);
  if (v === false) return el('span', {class:'bate-pill bate-no'}, ['❌ não bate']);
  return el('span', {class:'bate-pill bate-none'}, ['—']);
}

function renderMentorPanel(){
  const wrap = el('div', {class:'home'});
  wrap.appendChild(el('div', {class:'home-hero'}, [
    el('div', {class:'eyebrow'}, ['Painel do mentor']),
    el('h1', {class:'disp'}, ['Acompanhamento da turma']),
    el('p', {}, ['Sonhos, meta e se cada aluno já bate a própria meta de lucro — pra você acompanhar o progresso da mentoria e documentar casos de sucesso.']),
  ]));
  wrap.appendChild(el('button', {class:'btn btn-secondary btn-sm', style:'margin-bottom:20px;', onclick: goHome}, ['← Voltar ao menu']));

  if (APP.mentorRows === null){
    wrap.appendChild(renderLoading());
    return wrap;
  }
  if (!APP.mentorRows.length){
    wrap.appendChild(el('div', {class:'callout'}, ['Ainda nenhum aluno preencheu dados.']));
    return wrap;
  }

  const tableWrap = el('div', {class:'mentor-table-wrap'});
  const table = el('table', {class:'mentor-grid'});
  const heads = ['Aluno', 'E-mail'];
  Object.values(MODELS).forEach(m => heads.push(m.label + ' — meta', m.label + ' — líquido', m.label + ' — bate?'));
  table.appendChild(el('thead', {}, [el('tr', {}, heads.map(h=>el('th',{},[h])))]));
  const tbody = el('tbody');
  APP.mentorRows.forEach(row => {
    const tr = el('tr');
    tr.appendChild(el('td', {style:'font-weight:700;'}, [row.nome || '(sem nome)']));
    tr.appendChild(el('td', {style:'color:var(--ink-soft);'}, [row.email || '']));
    Object.keys(MODELS).forEach(mk => {
      const r = row[mk];
      tr.appendChild(el('td', {class:'mono'}, [r ? fmtBRL(r.meta) : '—']));
      tr.appendChild(el('td', {class:'mono'}, [r ? fmtBRL(r.liquido) : '—']));
      tr.appendChild(el('td', {}, [bateBadge(r ? r.bateMeta : null)]));
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);
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
    cat.items.forEach(label => {
      const i = idx++;
      const row = el('div', {class:'field-row'});
      row.appendChild(el('label', {}, [label]));
      row.appendChild(numberInput({
        value: arr[i]||0, kind:'brl',
        onInput: (n) => { arr[i] = n; persist(); updateTotal(); },
      }));
      group.appendChild(row);
    });
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
    eyebrow:'2º passo — Conhecer', title:'Minha Vida Pessoal',
    desc:'Cada centavo que sai do seu bolso no mês. Não esqueça nada — lista incompleta destrói o cálculo lá na frente.',
    cats: VIDA_CATS, stateKey:'vida', totalLabel:'Total vida pessoal (mensal)',
  });
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

  const wrap = el('div', {class:'table-wrap'});
  const table = el('table', {class:'grid'});
  table.appendChild(el('thead', {}, [el('tr', {}, [
    el('th',{},['#']), el('th',{},['Meu sonho (escreva com suas palavras)']), el('th',{},['Custo total (R$)']),
    el('th',{},['Prazo (meses)']), el('th',{},['Valor mensal necessário']),
  ])]));
  const tbody = el('tbody');
  const rows = APP.state.sonhos;

  function updateRow(i){
    const r = rows[i];
    const outEl = document.querySelector('[data-sonho-out="'+i+'"]');
    if (outEl) outEl.textContent = fmtBRL(safeDiv(parseBR(r.custo), parseBR(r.prazo)));
    updateTotals();
  }
  function updateTotals(){
    const totCusto = rows.reduce((s,r)=>s+parseBR(r.custo),0);
    const totMensal = sumSonhosMensal(APP.state);
    const a = document.getElementById('sonho-total-custo'); if (a) a.textContent = fmtBRL(totCusto);
    const b = document.getElementById('sonho-total-mensal'); if (b) b.textContent = fmtBRL(totMensal);
  }

  rows.forEach((r, i) => {
    const tr = el('tr');
    tr.appendChild(el('td', {}, [String(i+1)]));
    const descTd = el('td', {class:'col-name'});
    const descInput = el('input', {class:'inp text-left', value:r.desc, placeholder:'ex.: viagem em família, trocar de carro…'});
    descInput.addEventListener('input', () => { r.desc = descInput.value; persist(); });
    descTd.appendChild(descInput);
    tr.appendChild(descTd);
    tr.appendChild(el('td', {}, [numberInput({value:r.custo, kind:'brl', onInput:(n)=>{ r.custo=n; persist(); updateRow(i); }})]));
    tr.appendChild(el('td', {}, [numberInput({value:r.prazo, kind:'num', dec:0, onInput:(n)=>{ r.prazo=n; persist(); updateRow(i); }})]));
    const outTd = el('td');
    outTd.appendChild(el('span', {class:'mono', style:'font-weight:700;color:var(--green-strong);', 'data-sonho-out':String(i)}, [fmtBRL(safeDiv(parseBR(r.custo),parseBR(r.prazo)))]));
    tr.appendChild(outTd);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  const tfoot = el('tfoot', {}, [el('tr', {}, [
    el('td',{colspan:'2', style:'text-align:right;font-weight:800;'},['TOTAL']),
    el('td',{}, [el('span',{id:'sonho-total-custo', class:'mono', style:'font-weight:700;'},[fmtBRL(rows.reduce((s,r)=>s+parseBR(r.custo),0))])]),
    el('td'),
    el('td',{}, [el('span',{id:'sonho-total-mensal', class:'mono', style:'font-weight:800;color:var(--green-strong);'},[fmtBRL(sumSonhosMensal(APP.state))])]),
  ])]);
  table.appendChild(tfoot);
  wrap.appendChild(table);
  body.appendChild(wrap);

  body.appendChild(el('div', {class:'callout'}, [
    el('b',{},['Essa meta mensal dos sonhos']), ' não substitui a meta de lucro da próxima etapa — ela é uma referência: o que você quer que sobre, de verdade, pra viver a vida que você sonha.',
  ]));
  panel.appendChild(body);
  footNav(panel, {});
}

/* ---------------------------------------------------------------------- */
/* Etapa: Minha Meta                                                       */
/* ---------------------------------------------------------------------- */

function renderStepMeta(panel){
  const m = MODELS[APP.model];
  panelHead(panel, '1º passo — Conhecer', 'Minha Meta',
    'Quanto precisa sobrar pra VOCÊ todo mês, depois de pagar tudo — sua vida pessoal, o negócio, os impostos e os repasses.');
  panel.querySelector('.panel-head').appendChild(legendRow());
  const body = el('div', {class:'panel-body'});

  const mainRow = el('div', {class:'field-row', style:'grid-template-columns:1fr 220px;margin-bottom:8px;'});
  mainRow.appendChild(el('label', {style:'font-weight:800;font-size:15px;'}, ['💰 Meta de lucro mensal']));
  const mainInput = numberInput({
    value: APP.state.meta.valor, kind:'brl',
    onInput:(n)=>{ APP.state.meta.valor = n; persist(); },
  });
  mainInput.querySelector('input').style.fontSize = '16px';
  mainInput.querySelector('input').id = 'meta-principal';
  mainRow.appendChild(mainInput);
  body.appendChild(mainRow);
  body.appendChild(el('p', {class:'help'}, ['É o que precisa sobrar TODO MÊS depois de pagar sua vida pessoal, o negócio, os impostos e os repasses.']));

  body.appendChild(el('div', {class:'cat-title'}, ['Se quiser, detalhe sua meta']));
  const comp = APP.state.meta.comp;
  function updateSoma(){
    const soma = comp.reduce((s,v)=>s+parseBR(v),0);
    const elx = document.getElementById('meta-soma'); if (elx) elx.textContent = fmtBRL(soma);
  }
  m.metaComponents.forEach((c, i) => {
    const row = el('div', {class:'field-row'});
    row.appendChild(el('label', {}, [c.label, el('div',{class:'help'},[c.help])]));
    row.appendChild(numberInput({value: comp[i]||0, kind:'brl', onInput:(n)=>{ comp[i]=n; persist(); updateSoma(); }}));
    body.appendChild(row);
  });
  const somaRow = el('div', {class:'field-total'});
  somaRow.appendChild(el('label', {}, ['Soma dos componentes']));
  somaRow.appendChild(el('span', {id:'meta-soma', class:'mono', style:'font-weight:700;'}, [fmtBRL(comp.reduce((s,v)=>s+parseBR(v),0))]));
  body.appendChild(somaRow);

  const useBtn = el('button', {class:'btn btn-secondary btn-sm', style:'margin-top:12px;', onclick: () => {
    const soma = comp.reduce((s,v)=>s+parseBR(v),0);
    APP.state.meta.valor = soma; persist();
    document.getElementById('meta-principal').value = fmtNum(soma,2);
  }}, ['Usar essa soma como minha meta ↑']);
  body.appendChild(useBtn);

  panel.appendChild(body);
  footNav(panel, {});
}

/* ---------------------------------------------------------------------- */
/* Etapa: Insumos / Matéria-Prima                                          */
/* ---------------------------------------------------------------------- */

function renderStepInsumos(panel){
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
/* Helpers de tabela editável                                              */
/* ---------------------------------------------------------------------- */

function statusPillNode(status){
  const map = {otimo:['status-otimo','🟢 Ótimo'], ok:['status-ok','🟡 OK'], baixo:['status-baixo','🔴 Baixo'], gravado:['status-grav','📼 Gravado'], '':[null,'']};
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
    'Cada ' + m.calcRowNoun + ' com seus custos, impostos e margem — a planilha calcula o preço certo, um por um. Os itens marcados "exemplo" são apenas ilustração: edite os valores ou apague a linha.');
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

/* ======================= PRESTADOR ======================= */

function buildCalcPrestador(wrap, body){
  const table = el('table', {class:'grid'});
  const heads = ['Serviço / procedimento','Atend./mês','Duração (h)','Insumos (R$)','Outros custos (R$)','Custo tempo','Custo direto',
    'Impostos %','Repasse convênio %','Comissão %','Taxa cartão %','Margem %','Preço particular','Preço convênio','Líquido/atend.','Horas totais/mês','Receita mês','Status',''];
  table.appendChild(el('thead',{},[el('tr',{}, heads.map(h=>el('th',{},[h])))]));
  const tbody = el('tbody');
  table.appendChild(tbody);

  function calc(){ return computeCalcAll('prestador', APP.state.calcular, computeHora('prestador', APP.state)); }

  function refresh(){
    const {rows, totals} = calc();
    rows.forEach((r,i) => {
      setTxt('c-tempo-'+i, fmtBRL(r._custoTempo));
      setTxt('c-direto-'+i, fmtBRL(r._custoDireto));
      setTxt('c-partic-'+i, fmtBRL(r._precoParticular));
      setTxt('c-conv-'+i, fmtBRL(r._precoConvenio));
      setTxt('c-liq-'+i, fmtBRL(r._liquido));
      setTxt('c-horas-'+i, fmtNum(r._horasTotais,2));
      setTxt('c-receita-'+i, fmtBRL(r._receita));
      setPill('c-status-'+i, r._status);
    });
    setTxt('c-tot-atend', fmtNum(totals.atendimentos,0));
    setTxt('c-tot-liq', fmtBRL(totals.liquido));
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

  function buildRow(r, i, computed){
    const tr = el('tr');
    const nameTd = el('td', {class:'col-name'});
    const nameInp = el('input', {class:'inp text-left', value:r.nome||''});
    nameInp.addEventListener('input', () => { r.nome = nameInp.value; persist(); });
    nameTd.appendChild(nameInp);
    if (r._example) nameTd.appendChild(exampleBadge());
    tr.appendChild(nameTd);

    tr.appendChild(td(numberInput({value:r.atend, kind:'num', dec:0, onInput:(n)=>{r.atend=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.dur, kind:'num', dec:2, onInput:(n)=>{r.dur=n;persist();refresh();}})));

    const insTd = el('td');
    const insWrap = el('div', {style:'display:flex;gap:4px;align-items:center;'});
    insWrap.appendChild(numberInput({value:r.insumos, kind:'brl', onInput:(n)=>{r.insumos=n;persist();refresh();}}));
    if (MODELS.prestador.hasInsumos){
      const btn = el('button', {class:'btn-ghost btn-sm', title:'somar a partir dos insumos', style:'padding:6px 8px;'}, ['🧮']);
      btn.addEventListener('click', (e) => {
        openInsumoPopover(e.currentTarget, (total) => {
          r.insumos = total; persist();
          insWrap.querySelector('input').value = fmtNum(total,2);
          refresh();
        });
      });
      insWrap.appendChild(btn);
    }
    insTd.appendChild(insWrap);
    tr.appendChild(insTd);

    tr.appendChild(td(numberInput({value:r.outros, kind:'brl', onInput:(n)=>{r.outros=n;persist();refresh();}})));
    tr.appendChild(td(lockedOut('c-tempo-'+i, fmtBRL(computed._custoTempo))));
    tr.appendChild(td(lockedOut('c-direto-'+i, fmtBRL(computed._custoDireto))));
    tr.appendChild(td(numberInput({value:r.impostos, kind:'pct', onInput:(n)=>{r.impostos=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.repasse, kind:'pct', onInput:(n)=>{r.repasse=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.comissao, kind:'pct', onInput:(n)=>{r.comissao=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.cartao, kind:'pct', onInput:(n)=>{r.cartao=n;persist();refresh();}})));
    tr.appendChild(td(numberInput({value:r.margem, kind:'pct', onInput:(n)=>{r.margem=n;persist();refresh();}})));
    tr.appendChild(td(resultOut('c-partic-'+i, fmtBRL(computed._precoParticular))));
    tr.appendChild(td(resultOut('c-conv-'+i, fmtBRL(computed._precoConvenio))));
    tr.appendChild(td(resultOut('c-liq-'+i, fmtBRL(computed._liquido))));
    tr.appendChild(td(lockedOut('c-horas-'+i, fmtNum(computed._horasTotais,2))));
    tr.appendChild(td(resultOut('c-receita-'+i, fmtBRL(computed._receita))));
    const statusTd = el('td', {id:'c-status-'+i});
    statusTd.appendChild(statusPillNode(computed._status));
    tr.appendChild(statusTd);
    const delTd = el('td');
    delTd.appendChild(el('button', {class:'row-del', onclick:()=>{ APP.state.calcular.splice(i,1); persist(); rebuild(); refresh(); }}, ['✕']));
    tr.appendChild(delTd);
    return tr;
  }
  function td(node){ const t = el('td'); t.appendChild(node); return t; }

  rebuild();
  wrap.appendChild(table);

  const initTotals = calc().totals;
  const tfoot = el('tfoot', {}, [el('tr', {}, [
    el('td', {style:'font-weight:800;'}, ['TOTAL MÊS']),
    el('td', {}, [lockedOut('c-tot-atend', fmtNum(initTotals.atendimentos,0))]),
    el('td'), el('td'), el('td'), el('td'), el('td'), el('td'), el('td'), el('td'), el('td'), el('td'),
    el('td'), el('td'), el('td', {}, [resultOut('c-tot-liq',fmtBRL(initTotals.liquido))]), el('td', {}, [lockedOut('c-tot-horas',fmtNum(initTotals.horas,2))]),
    el('td', {}, [resultOut('c-tot-receita',fmtBRL(initTotals.receita))]), el('td'), el('td'),
  ])]);
  table.appendChild(tfoot);

  body.appendChild(addRowBtn('adicionar serviço', () => {
    APP.state.calcular.push({nome:'', atend:0, dur:0, insumos:0, outros:0, impostos:.06, repasse:0, comissao:0, cartao:.03, margem:.4});
    persist(); rebuild(); refresh();
  }));
  body.appendChild(el('ul', {class:'note-list', style:'margin-top:16px;'}, [
    el('li', {}, ['Duração = tempo TOTAL do atendimento (preparo + consulta + prontuário).']),
    el('li', {}, ['Se o serviço é só particular, deixe "Repasse" em 0%. Se é só convênio, ignore o preço particular.']),
    el('li', {}, ['Status compara líquido/hora com seu custo/hora. 🔴 significa que você está perdendo dinheiro nesse atendimento.']),
  ]));
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

function renderStepResumo(panel){
  const model = APP.model;
  const r = computeResumo(model, APP.state);
  panelHead(panel, '📊 A foto do seu negócio', 'Resumo — Seus Números',
    'Olhe aqui antes de aceitar um novo cliente, mudar de preço ou decidir qualquer coisa importante.');
  const body = el('div', {class:'panel-body'});
  const grid = el('div', {class:'stat-grid'});

  if (model === 'prestador'){
    grid.appendChild(statTile(null,'🎯 Meta de lucro mensal', fmtBRL(r.meta)));
    grid.appendChild(statTile(null,'🏠 Custo da vida pessoal', fmtBRL(r.custoVida)));
    grid.appendChild(statTile(null,'🏢 Custo fixo do consultório', fmtBRL(r.custoFixoNegocio)));
    grid.appendChild(statTile(null,'⏱ Horas disponíveis na agenda', fmtNum(r.horasDisponiveis,1)+' h'));
    grid.appendChild(statTile(null,'📋 Horas efetivamente atendidas', fmtNum(r.horasAtendidas,1)+' h'));
    grid.appendChild(statTile(null,'📊 Ocupação real', fmtPct(r.ocupacaoReal)));
    grid.appendChild(statTile(null,'💰 Custo por hora', fmtBRL(r.custoHora)));
    grid.appendChild(statTile(null,'📥 Receita bruta projetada', fmtBRL(r.receita)));
    grid.appendChild(statTile(null,'🏆 Líquido que sobra pra você', fmtBRL(r.liquido), 'hi'));
    body.appendChild(grid);
    body.appendChild(verdictBanner(r.bateMeta, r.diff, 'Líquido após impostos, repasses e custos, comparado com sua meta de lucro.'));
    body.appendChild(el('div', {class:'callout'}, ['Cada horário vago na sua agenda é dinheiro que você já gastou e não vai receber de volta. Preço justo protege sua saúde financeira — e é o primeiro passo pra cuidar bem dos seus pacientes.']));
  }

  if (model === 'produto'){
    grid.appendChild(statTile(null,'🎯 Meta de lucro mensal', fmtBRL(r.meta)));
    grid.appendChild(statTile(null,'🏠 Custo da vida pessoal', fmtBRL(r.custoVida)));
    grid.appendChild(statTile(null,'🏢 Custo fixo mensal da empresa', fmtBRL(r.custoFixoEmpresa)));
    grid.appendChild(statTile(null,'⏱ Custo/hora da empresa', fmtBRL(r.custoHoraEmpresa)));
    grid.appendChild(statTile(null,'🔧 Custo/hora da produção', fmtBRL(r.custoHoraProducao)));
    grid.appendChild(statTile(null,'📦 Unidades a vender no mês', fmtNum(r.unidades,0)));
    grid.appendChild(statTile(null,'📥 Receita projetada', fmtBRL(r.receita)));
    grid.appendChild(statTile(null,'🏆 Lucro líquido projetado', fmtBRL(r.liquido), 'hi'));
    body.appendChild(grid);
    body.appendChild(verdictBanner(r.bateMeta, r.diff, 'Lucro líquido (soma das margens de cada produto), comparado com sua meta de lucro.'));
    body.appendChild(el('div', {class:'callout'}, ['O cliente não te paga pelo que você faz. Ele te paga pelo valor que entrega a ele. Sua planilha garante só uma coisa: que esse pagamento também PAGA a sua vida e o seu negócio.']));
  }

  if (model === 'conhecimento'){
    grid.appendChild(statTile(null,'🎯 Meta de lucro mensal', fmtBRL(r.meta)));
    grid.appendChild(statTile(null,'🏠 Custo da vida pessoal', fmtBRL(r.custoVida)));
    grid.appendChild(statTile(null,'🏢 Custo fixo do negócio', fmtBRL(r.custoFixoNegocio)));
    grid.appendChild(statTile(null,'⏱ Horas produtivas no mês', fmtNum(r.horasProdutivasMes,1)+' h'));
    grid.appendChild(statTile(null,'💰 Custo por hora (mínimo)', fmtBRL(r.custoHora)));
    grid.appendChild(statTile(null,'📋 Horas comprometidas nas ofertas', fmtNum(r.horasComprometidas,1)+' h'));
    grid.appendChild(statTile(null,'📊 Capacidade usada', fmtPct(r.capacidadeUsada), r.capStatus==='over'?'warn':''));
    grid.appendChild(statTile(null,'📥 Receita projetada', fmtBRL(r.receita)));
    grid.appendChild(statTile(null,'🏆 Lucro líquido projetado', fmtBRL(r.liquido), 'hi'));
    body.appendChild(grid);
    body.appendChild(verdictBanner(r.bateMeta, r.diff, 'Lucro líquido (soma das margens de cada oferta), comparado com sua meta de lucro.'));
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
