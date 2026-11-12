/* ============================================================================
   Firebase — login, dados na nuvem e credenciamento
   ============================================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const dbfs = getFirestore(fbApp);
// Segunda "instância" só pra criar contas de outras pessoas sem deslogar quem está credenciando.
const fbAppCred = initializeApp(firebaseConfig, 'credenciamento');
const authCred = getAuth(fbAppCred);

// Quem administra: recebe os dados de todo mundo e credencia pessoas.
// (Precisa ser igual à lista do arquivo firestore.rules.)
const ADMIN_EMAILS = ['mariaeduarda@archettiodonto.com.br', 'ubiratan@archettiodonto.com.br'];
function isAdminEmail(e){ return ADMIN_EMAILS.includes(String(e||'').trim().toLowerCase()); }

// Cópia local (rápida) dos dados da conta. Separada por pessoa, pra um computador
// compartilhado não misturar dados. O prefixo muda depois do login.
const LEGACY_PREFIX = 'precifica:';
let STORE_PREFIX = LEGACY_PREFIX;
function lsGet(key){ try{ const v = localStorage.getItem(STORE_PREFIX + key); return v ? JSON.parse(v) : null; }catch(e){ return null; } }
function lsSet(key, val){ try{ localStorage.setItem(STORE_PREFIX + key, JSON.stringify(val)); }catch(e){} }
function lsGetLegacy(key){ try{ const v = localStorage.getItem(LEGACY_PREFIX + key); return v ? JSON.parse(v) : null; }catch(e){ return null; } }

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
    calcTitle:'Meus Procedimentos',
    calcRowNoun:'procedimento',
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
    {nome:'Imersão presencial anual', modalidade:'EVENTO', frequencia:12, alunos:40, duracao:1, horasVivoAluno:0, horasVivoGrupo:16, horasPrep:40, horasSuporte:4, custoMaterial:250, custoFixoPrograma:12000, plataforma:.05, afiliados:0, impostos:.06, margem:.4},
    {nome:'Comunidade (assinatura mensal)', modalidade:'COMUNIDADE', frequencia:1, alunos:60, duracao:12, horasVivoAluno:0, horasVivoGrupo:6.5, horasPrep:7.3, horasSuporte:8.7, custoMaterial:0, custoFixoPrograma:300, plataforma:.1, afiliados:0, impostos:.06, margem:.5, comunidade:comunidadeDefault()},
    {nome:'Workshop trimestral (online)', modalidade:'EVENTO', frequencia:3, alunos:25, duracao:1, horasVivoAluno:0, horasVivoGrupo:4, horasPrep:8, horasSuporte:1, custoMaterial:0, custoFixoPrograma:300, plataforma:.1, afiliados:0, impostos:.06, margem:.5},
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
    st.materialMensal = 0;
    st.materialMeses = [0,0,0];
    calcular.forEach(r => { r.matModo = 'auto'; });
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
    if (merged.materialMensal == null) merged.materialMensal = 0;
    if (!Array.isArray(merged.materialMeses)) merged.materialMeses = [0,0,0];
    // Material passou a ser automático (pelo tempo). Mantém "valor próprio" só onde o aluno digitou um valor.
    (merged.calcular || []).forEach(r => {
      if (r.matModo === 'lista' || r._example) r.matModo = 'auto';
      else if (!r.matModo) r.matModo = parseBR(r.insumos) > 0 ? 'valor' : 'auto';
    });
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
  if (ind){ ind.classList.add('err'); ind.querySelector('.txt').textContent = 'sem internet — salvo só neste aparelho'; }
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
// Material (Prestador): em vez de contar item por item, usa o GASTO MENSAL da clínica
// com materiais, dividido pelas horas realmente atendidas no mês (Minha Hora).
// Cada serviço recebe material proporcional ao tempo que leva.
function taxaMaterialHora(state){
  if (!state) return 0;
  const horaC = computeHora('prestador', state);
  return safeDiv(parseBR(state.materialMensal), horaC.horasEfetivas);
}
// Valores que realmente entram no cálculo de um serviço.
function prestadorEfetivo(row, state){
  if (!state) return row;
  const g = calcGlobal(state);
  const r = Object.assign({}, row);
  if (r.usaPadrao !== false){ r.impostos = g.impostos; r.cartao = g.cartao; r.comissao = g.comissao; r.margem = g.margem; }
  if (!g.convenio) r.repasse = 0;
  if (r.matModo !== 'valor') r.insumos = taxaMaterialHora(state) * parseBR(r.dur);
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
    // Cada linha descreve UMA edição/turma. "frequencia" = acontece a cada N meses
    // (1 = todo mês, 3 = trimestral, 12 = anual). Os totais do mês dividem por ela.
    const FREQ = Math.max(1, parseBR(row.frequencia) || 1);
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
    // Lote promocional (ex.: desconto pros primeiros inscritos). T é o preço MÉDIO
    // que precisa entrar por aluno; o preço cheio sobe pra compensar o desconto:
    // preço cheio × (1 − % no lote × desconto) = preço médio.
    const D = Math.min(Math.max(parseBR(row.descontoPromo)||0, 0), 0.95);
    const X = Math.min(Math.max(parseBR(row.pctPromo)||0, 0), 1);
    const fator = 1 - X * D;
    const cheio = fator > 0 ? T / fator : T;
    const promo = cheio * (1 - D);
    let status = '';
    if (C !== 0){
      if (I === 0) status = 'gravado';
      else {
        const marginPerHour = safeDiv(U*S, I);
        status = marginPerHour >= custoHora*2 ? 'otimo' : (marginPerHour >= custoHora ? 'ok' : 'baixo');
      }
    }
    return Object.assign({}, row, {_horasTotaisMes:I, _horasPorAluno:J, _custoTempo:M, _custoTotalMes:N, _custoPorAluno:O, _preco:T, _receita:U, _status:status,
      _precoCheio:cheio, _precoPromo:promo, _temPromo: D > 0 && X > 0, _alunosPromo: Math.round(C * X),
      _freq:FREQ, _receitaMes: U / FREQ, _horasMes: I / FREQ, _alunosMes: C / FREQ});
  });
  const totals = {
    alunos: out.reduce((s,r)=>s+r._alunosMes,0),
    horas: out.reduce((s,r)=>s+r._horasMes,0),
    receita: out.reduce((s,r)=>s+r._receitaMes,0),
    lucroLiquido: out.reduce((s,r)=>s + r._receitaMes*parseBR(r.margem), 0),
  };
  return {rows:out, totals};
}

/* ---------------------------------------------------------------------- */
/* Resumo                                                                  */
/* ---------------------------------------------------------------------- */

function metaParte(state, modelKey){
  const d = state && state.divisaoMeta;
  if (!d || d[modelKey] == null) return 1;
  return Math.max(0, Math.min(1, parseBR(d[modelKey])));
}

function computeResumo(modelKey, state){
  const horaC = computeHora(modelKey, state);
  const calc = computeCalcAll(modelKey, state.calcular, horaC, state);
  const metaTotal = computeMeta(state);
  const outrasRendas = sumOutrasRendas(state);
  // Com mais de uma frente (clínica + cursos…), cada uma entrega uma parte da meta.
  const metaShare = metaParte(state, modelKey);
  const meta = computeMetaNegocio(state) * metaShare; // o que ESTA frente precisa entregar
  const custoVida = sumVida(state);
  const metaSonhos = sumSonhosMensal(state);

  if (modelKey === 'prestador'){
    const liquido = calc.totals.liquido;
    return {
      meta, metaTotal, outrasRendas, custoVida, metaSonhos, metaShare,
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
      meta, metaTotal, outrasRendas, custoVida, metaSonhos, metaShare,
      custoFixoEmpresa: horaC.custoFixoEmpresa,
      custoHoraEmpresa: horaC.custoHoraEmpresa,
      custoHoraProducao: horaC.custoHoraProducao,
      unidades: calc.totals.unidades,
      perdaMensal: calc.rows.reduce((s, r) => {
        const hoje = parseBR(r.cobraHoje);
        return s + (hoje > 0 ? Math.max(0, r._preco - hoje) * parseBR(r.unidades) : 0);
      }, 0),
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
      meta, metaTotal, outrasRendas, custoVida, metaSonhos, metaShare,
      custoFixoNegocio: horaC.custoFixoNegocio,
      horasProdutivasMes: horaC.horasProdutivasMes,
      custoHora: horaC.custoHora,
      horasComprometidas,
      capacidadeUsada: safeDiv(horasComprometidas, horaC.horasProdutivasMes),
      capStatus,
      perdaMensal: calc.rows.reduce((s, r) => {
        const hoje = parseBR(r.cobraHoje);
        return s + (hoje > 0 ? Math.max(0, r._preco - hoje) * r._alunosMes : 0);
      }, 0),
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

/* ---------- Dados: cópia local + nuvem (Firestore) ---------- */

// Dados da PESSOA (não do negócio): preenchidos uma vez e usados por todas as frentes.
const CAMPOS_PESSOAIS = ['sonhos','sonhosTaxas','vida','vidaLabels','filhos','meta','rendas','divisaoMeta','frentesIgnoradas'];
function pickPessoal(st){ const o = {}; CAMPOS_PESSOAIS.forEach(k => { if (st && st[k] !== undefined) o[k] = st[k]; }); return o; }
function migrarPessoal(){
  if (lsGet('pessoal')) return;
  for (const k of ['prestador','conhecimento','produto']){
    const v = lsGet('modelo:' + k);
    if (v){ lsSet('pessoal', pickPessoal(v)); return; }
  }
}
function lerModelo(modelKey){
  const salvo = lsGet('modelo:' + modelKey);
  const pessoal = lsGet('pessoal');
  if (!salvo && !pessoal) return null;
  return Object.assign({}, salvo || {}, pessoal || {});
}
async function loadState(modelKey){
  return mergeWithDefaults(modelKey, lerModelo(modelKey));
}
const refUser = (...p) => doc(dbfs, 'users', CURRENT_USER.uid, ...p);

// Grava os dados pessoais (local + nuvem). Usado pela Visão geral.
function setPessoal(obj){
  lsSet('pessoal', obj);
  if (CURRENT_USER) setDoc(refUser(), {pessoal: JSON.parse(JSON.stringify(obj))}, {merge:true}).catch(e => console.warn('pessoal', e));
}

let SAVE_TIMER = null;
async function saveState(modelKey, state){
  markSaving();
  const clean = JSON.parse(JSON.stringify(state));
  lsSet('modelo:' + modelKey, clean);
  lsSet('pessoal', pickPessoal(clean));
  const r = saveResumo(modelKey, clean);
  try{
    await setDoc(refUser('modelos', modelKey), clean);
    await setDoc(refUser(), {pessoal: pickPessoal(clean)}, {merge:true});
    await setDoc(doc(dbfs, 'resumos', CURRENT_USER.uid), {
      nome: CURRENT_USER.nome || '', email: CURRENT_USER.email || '',
      [modelKey]: Object.assign({}, r, {atualizadoEm: serverTimestamp()}),
    }, {merge:true});
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
function saveResumo(modelKey, state){
  const r = computeResumo(modelKey, state);
  const resumo = { meta: r.meta, receita: r.receita, liquido: r.liquido, bateMeta: r.bateMeta, perdaMensal: r.perdaMensal || 0 };
  const all = lsGet('resumos') || {};
  all[modelKey] = Object.assign({}, resumo, {atualizadoEm: new Date().toISOString()});
  lsSet('resumos', all);
  return resumo;
}
function persist(){ scheduleSave(APP.model, APP.state); }

// Ao entrar: traz tudo da nuvem pra cópia local. Se a nuvem estiver vazia mas este
// aparelho tiver dados da época sem login, sobe esses dados pra conta.
async function sincronizarDaNuvem(){
  const modelos = {};
  for (const k of Object.keys(MODELS)){
    const s = await getDoc(refUser('modelos', k));
    if (s.exists()) modelos[k] = s.data();
  }
  const ps = await getDoc(refUser());
  const pessoal = (ps.exists() && ps.data().pessoal) || null;
  const temNuvem = Object.keys(modelos).length || pessoal;
  Object.keys(MODELS).forEach(k => localStorage.removeItem(STORE_PREFIX + 'modelo:' + k));
  localStorage.removeItem(STORE_PREFIX + 'pessoal');
  if (temNuvem){
    Object.entries(modelos).forEach(([k, v]) => lsSet('modelo:' + k, v));
    if (pessoal) lsSet('pessoal', pessoal);
    migrarPessoal();
  } else {
    let achou = false;
    for (const k of Object.keys(MODELS)){
      const v = lsGetLegacy('modelo:' + k);
      if (v){ lsSet('modelo:' + k, v); achou = true; }
    }
    const p = lsGetLegacy('pessoal'); if (p) lsSet('pessoal', p);
    // os dados da época sem login vão pra PRIMEIRA conta que entrar neste aparelho, e só pra ela
    ['pessoal','resumos','rapido'].concat(Object.keys(MODELS).map(k => 'modelo:' + k)).forEach(k => localStorage.removeItem(LEGACY_PREFIX + k));
    migrarPessoal();
    if (achou){ // sobe os dados deste aparelho pra conta
      for (const k of Object.keys(MODELS)){
        const v = lsGet('modelo:' + k);
        if (v){ const st = mergeWithDefaults(k, lerModelo(k)); await saveState(k, st); }
      }
    }
  }
  const rs = {};
  Object.keys(MODELS).forEach(k => { if (lsGet('modelo:' + k)){ const st = mergeWithDefaults(k, lerModelo(k)); rs[k] = saveResumo(k, st); } });
  APP.menuResumo = rs;
}

/* ---------- Sessão ---------- */

function initApp(){
  APP.view = 'loading'; render();
  onAuthStateChanged(auth, async (u) => {
    if (!u){ CURRENT_USER = null; STORE_PREFIX = LEGACY_PREFIX; APP.view = 'login'; APP.model = null; APP.state = null; render(); return; }
    const email = (u.email || '').toLowerCase();
    CURRENT_USER = { uid: u.uid, email, nome: '', admin: isAdminEmail(email) };
    STORE_PREFIX = 'precifica:u:' + u.uid + ':';
    // Só quem administra precisa confirmar o e-mail (protege o acesso aos dados de todos).
    if (CURRENT_USER.admin && !u.emailVerified){ APP.view = 'verificar'; render(); return; }
    APP.view = 'loading'; render();
    try{
      if (APP.nomeCadastro){ CURRENT_USER.nome = APP.nomeCadastro; APP.nomeCadastro = ''; }
      const perfil = await getDoc(refUser());
      if (perfil.exists() && perfil.data().nome) CURRENT_USER.nome = perfil.data().nome;
      if (!CURRENT_USER.nome) CURRENT_USER.nome = email.split('@')[0];
      if (!perfil.exists()) await setDoc(refUser(), {nome: CURRENT_USER.nome, email, criadoEm: serverTimestamp()}, {merge:true});
      await sincronizarDaNuvem();
    }catch(e){
      console.warn('init', e);
      APP.view = 'semacesso'; APP.authMsg = 'Não consegui carregar seus dados (' + ((e && e.code) || 'erro') + '). Confira a internet e tente de novo. Se continuar, fale com a equipe.'; render(); return;
    }
    APP.view = 'menu'; render();
  });
}
async function doLogout(){ try{ await signOut(auth); }catch(e){ console.warn(e); } }
async function loadMenuResumo(){ if (APP.view === 'menu') render(); }

/* ---------- Primeiro acesso / senha ---------- */
function senhaAleatoria(){ const a = new Uint32Array(4); crypto.getRandomValues(a); return Array.from(a, n => n.toString(36)).join('') + 'A!9'; }
// Cria a conta (se ainda não existir) sem deslogar ninguém e manda o e-mail pra pessoa criar a senha.
async function criarContaEConvidar(email){
  try{ await createUserWithEmailAndPassword(authCred, email, senhaAleatoria()); }
  catch(e){ if (!e || e.code !== 'auth/email-already-in-use') throw e; }
  finally{ try{ await signOut(authCred); }catch(e){} }
  await sendPasswordResetEmail(auth, email);
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
  if (APP.view === 'login'){ root.appendChild(renderLogin()); return; }
  if (APP.view === 'cadastro'){ root.appendChild(renderCadastro()); return; }
  if (APP.view === 'verificar'){ root.appendChild(renderVerificar()); return; }
  if (APP.view === 'semacesso'){ root.appendChild(renderSemAcesso()); return; }
  if (APP.view === 'credenciamento' && CURRENT_USER && CURRENT_USER.admin){ root.appendChild(renderTopbar()); root.appendChild(renderCredenciamento()); return; }
  if (APP.view === 'alunos' && CURRENT_USER && CURRENT_USER.admin){ root.appendChild(renderTopbar()); root.appendChild(renderAlunos()); return; }
  if (APP.view === 'menu'){ root.appendChild(renderTopbar()); root.appendChild(renderMenu()); return; }
  if (APP.view === 'rapido'){ root.appendChild(renderTopbar()); root.appendChild(renderRapido()); window.scrollTo(0,0); return; }
  if (APP.view === 'geral'){ root.appendChild(renderTopbar()); root.appendChild(renderVisaoGeral()); window.scrollTo(0,0); return; }
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
/* Login, confirmação de e-mail e sem acesso                               */
/* ---------------------------------------------------------------------- */

function authErrorPt(err){
  const code = (err && err.code) || '';
  const map = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-disabled': 'Essa conta foi desativada.',
    'auth/user-not-found': 'Não achamos uma conta com esse e-mail.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/invalid-credential': 'E-mail ou senha incorretos. Se é o seu primeiro acesso, clique em "Primeiro acesso ou esqueci a senha".',
    'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com a internet no momento.',
    'auth/missing-email': 'Digite o seu e-mail.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/missing-password': 'Digite uma senha.',
  };
  return map[code] || ('Não deu certo (' + (code || 'erro desconhecido') + '). Tente de novo.');
}

function authShell(children){
  const wrap = el('div', {class:'auth-shell'});
  const card = el('div', {class:'auth-card'});
  card.appendChild(el('div', {class:'auth-brand'}, ['Precifica', el('span',{class:'sub'},['método 4C'])]));
  children.forEach(c => c && card.appendChild(c));
  wrap.appendChild(card);
  return wrap;
}

function renderLogin(){
  const email = el('input', {class:'auth-input', type:'email', placeholder:'voce@email.com', autocomplete:'username'});
  const senha = el('input', {class:'auth-input', type:'password', placeholder:'sua senha', autocomplete:'current-password'});
  const msg = el('div', {class: APP.authOk ? 'auth-ok' : 'auth-error', style: APP.authMsg ? '' : 'display:none;'}, [APP.authMsg || '']);
  const mostrar = (t, ok) => { APP.authMsg = t; APP.authOk = !!ok; msg.textContent = t; msg.className = ok ? 'auth-ok' : 'auth-error'; msg.style.display = t ? '' : 'none'; };
  const entrar = el('button', {class:'btn btn-primary auth-submit', type:'button'}, ['Entrar']);
  const go = async () => {
    entrar.disabled = true; mostrar('');
    try{ await signInWithEmailAndPassword(auth, email.value.trim(), senha.value); }
    catch(e){ mostrar(authErrorPt(e)); }
    finally{ entrar.disabled = false; }
  };
  entrar.addEventListener('click', go);
  senha.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  const primeiro = el('button', {type:'button', class:'auth-link'}, ['Primeiro acesso ou esqueci a senha']);
  primeiro.addEventListener('click', async () => {
    const e = email.value.trim().toLowerCase();
    if (!e){ mostrar('Digite o seu e-mail acima e clique de novo.'); return; }
    try{
      if (isAdminEmail(e)) await criarContaEConvidar(e);
      else await sendPasswordResetEmail(auth, e);
      mostrar('Pronto! Se o seu e-mail estiver credenciado, chegou um link pra você criar a senha. Olhe também o spam.', true);
    }catch(err){ mostrar(authErrorPt(err)); }
  });
  return authShell([
    el('h2', {}, ['Entrar no Precifica']),
    el('p', {class:'sub'}, ['Recebeu um convite por e-mail? Clique em "Primeiro acesso" pra criar sua senha.']),
    msg,
    el('div', {class:'auth-field'}, [el('label',{},['E-mail']), email]),
    el('div', {class:'auth-field'}, [el('label',{},['Senha']), senha]),
    entrar,
    el('div', {class:'auth-forgot', style:'text-align:center;margin-top:12px;'}, [primeiro]),
    el('div', {class:'auth-switch'}, ['Ainda não tem conta? ', el('button', {type:'button', class:'auth-link', onclick:()=>{ APP.view='cadastro'; APP.authMsg=''; render(); }}, ['Criar conta'])]),
  ]);
}

function renderCadastro(){
  const nome = el('input', {class:'auth-input', placeholder:'Seu nome', autocomplete:'name'});
  const email = el('input', {class:'auth-input', type:'email', placeholder:'voce@email.com', autocomplete:'username'});
  const senha = el('input', {class:'auth-input', type:'password', placeholder:'mínimo 6 caracteres', autocomplete:'new-password'});
  const msg = el('div', {class:'auth-error', style:'display:none;'});
  const criar = el('button', {class:'btn btn-primary auth-submit', type:'button'}, ['Criar conta e entrar']);
  criar.addEventListener('click', async () => {
    msg.style.display = 'none';
    if (!nome.value.trim()){ msg.textContent = 'Digite o seu nome.'; msg.style.display = ''; return; }
    criar.disabled = true;
    APP.nomeCadastro = nome.value.trim();
    try{ await createUserWithEmailAndPassword(auth, email.value.trim(), senha.value); }
    catch(e){
      APP.nomeCadastro = '';
      msg.textContent = e && e.code === 'auth/email-already-in-use' ? 'Já existe uma conta com esse e-mail. Volte e use "Primeiro acesso ou esqueci a senha".' : authErrorPt(e);
      msg.style.display = '';
    }
    finally{ criar.disabled = false; }
  });
  return authShell([
    el('h2', {}, ['Criar sua conta']),
    el('p', {class:'sub'}, ['Leva menos de um minuto. Seus dados ficam salvos na sua conta.']),
    msg,
    el('div', {class:'auth-field'}, [el('label',{},['Nome']), nome]),
    el('div', {class:'auth-field'}, [el('label',{},['E-mail']), email]),
    el('div', {class:'auth-field'}, [el('label',{},['Senha']), senha]),
    criar,
    el('div', {class:'auth-switch'}, ['Já tem conta? ', el('button', {type:'button', class:'auth-link', onclick:()=>{ APP.view='login'; render(); }}, ['Entrar'])]),
  ]);
}

function renderVerificar(){
  const u = auth.currentUser;
  const msg = el('div', {class:'auth-ok', style:'display:none;'});
  return authShell([
    el('h2', {}, ['Confirme o seu e-mail']),
    el('p', {class:'sub'}, ['Por segurança, precisamos confirmar que ', el('b', {}, [u ? u.email : 'este e-mail']), ' é seu. Enviamos um link — clique nele e depois volte aqui.']),
    msg,
    el('button', {class:'btn btn-primary auth-submit', type:'button', onclick: async () => {
      await u.reload(); await u.getIdToken(true);
      if (u.emailVerified){ initApp(); } else { msg.textContent = 'Ainda não aparece como confirmado. Clique no link do e-mail e tente de novo.'; msg.style.display = ''; }
    }}, ['Já confirmei']),
    el('div', {style:'display:flex;justify-content:space-between;margin-top:12px;'}, [
      el('button', {type:'button', class:'auth-link', onclick: async () => {
        try{ await sendEmailVerification(u); msg.textContent = 'Link enviado. Olhe também o spam.'; msg.style.display = ''; }
        catch(e){ msg.textContent = authErrorPt(e); msg.style.display = ''; }
      }}, ['Enviar o link de novo']),
      el('button', {type:'button', class:'auth-link', onclick: doLogout}, ['Sair']),
    ]),
  ]);
}

function renderSemAcesso(){
  return authShell([
    el('h2', {}, ['Acesso ainda não liberado']),
    el('p', {class:'sub'}, [APP.authMsg || 'O seu e-mail ainda não está credenciado no Precifica. Se você já se inscreveu, fale com a equipe pra liberar o acesso.']),
    el('button', {class:'btn btn-secondary auth-submit', type:'button', onclick: doLogout}, ['Sair']),
  ]);
}

/* ---------------------------------------------------------------------- */
/* Admin: Credenciamento                                                   */
/* ---------------------------------------------------------------------- */

function adminHead(titulo, desc){
  return el('div', {class:'home-hero'}, [el('div', {class:'eyebrow'}, ['Administração']), el('h1', {class:'disp'}, [titulo]), el('p', {}, [desc])]);
}

function renderCredenciamento(){
  const wrap = el('div', {class:'home admin'});
  wrap.appendChild(adminHead('Credenciamento', 'O acesso é livre: qualquer pessoa pode criar a própria conta. Aqui você convida quem se inscreveu na plataforma — ela recebe um e-mail pra criar a senha e já entra.'));
  const nome = el('input', {class:'inp text-left', placeholder:'Nome completo'});
  const email = el('input', {class:'inp text-left', type:'email', placeholder:'e-mail usado na inscrição'});
  const msg = el('div', {class:'help', style:'margin-top:8px;'});
  const add = el('button', {class:'btn btn-primary', type:'button'}, ['Cadastrar e enviar convite']);
  add.addEventListener('click', async () => {
    const e = email.value.trim().toLowerCase(), n = nome.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){ msg.textContent = 'Confira o e-mail.'; return; }
    add.disabled = true; msg.textContent = 'Credenciando…';
    try{
      await setDoc(doc(dbfs, 'credenciados', e), {nome:n, email:e, criadoEm: serverTimestamp(), criadoPor: CURRENT_USER.email});
      await criarContaEConvidar(e);
      msg.textContent = '✅ ' + (n || e) + ' credenciado(a). O convite pra criar a senha foi enviado pra ' + e + '.';
      nome.value = ''; email.value = ''; carregar();
    }catch(err){ msg.textContent = 'Não deu certo: ' + ((err && err.code) || err) + '.'; }
    finally{ add.disabled = false; }
  });
  wrap.appendChild(el('div', {class:'cred-form'}, [nome, email, add]));
  wrap.appendChild(msg);

  const busca = el('input', {class:'inp text-left', placeholder:'buscar por nome ou e-mail', style:'margin-top:22px;max-width:360px;'});
  wrap.appendChild(busca);
  const lista = el('div', {class:'geral-tabela', style:'margin-top:10px;'});
  wrap.appendChild(lista);
  let itens = [];
  function desenhar(){
    const q = busca.value.trim().toLowerCase();
    lista.innerHTML = '';
    lista.appendChild(el('div', {class:'geral-row cred-row geral-head'}, ['Nome','E-mail','Credenciado em','Situação',''].map(x => el('span', {}, [x]))));
    const vis = itens.filter(c => !q || (c.nome||'').toLowerCase().includes(q) || c.email.includes(q));
    if (!vis.length) lista.appendChild(el('div', {class:'geral-row cred-row'}, [el('span', {class:'help'}, [itens.length ? 'Ninguém encontrado.' : 'Ninguém credenciado ainda.'])]));
    vis.forEach(c => {
      lista.appendChild(el('div', {class:'geral-row cred-row'}, [
        el('span', {}, [el('b', {}, [c.nome || '—'])]),
        el('span', {}, [c.email]),
        el('span', {}, [fmtWhen(c.criadoEm)]),
        el('span', {}, [c.ativo ? '✅ já acessou' : '⏳ aguardando 1º acesso']),
        el('span', {style:'display:flex;gap:6px;'}, [
          el('button', {class:'btn-ghost btn-sm', type:'button', onclick: async (ev) => {
            ev.target.disabled = true;
            try{ await sendPasswordResetEmail(auth, c.email); ev.target.textContent = 'enviado ✔'; } catch(e){ ev.target.textContent = 'erro'; }
          }}, ['reenviar convite']),
          el('button', {class:'btn-ghost btn-sm', type:'button', onclick: async () => {
            if (!confirm('Tirar ' + (c.nome || c.email) + ' da lista de convidados? A conta dela continua funcionando.')) return;
            await deleteDoc(doc(dbfs, 'credenciados', c.email)); carregar();
          }}, ['tirar da lista']),
        ]),
      ]));
    });
  }
  busca.addEventListener('input', desenhar);
  async function carregar(){
    try{
      const [cs, rs] = await Promise.all([getDocs(collection(dbfs, 'credenciados')), getDocs(collection(dbfs, 'resumos'))]);
      const ativos = new Set(); rs.forEach(d => { const e = (d.data().email||'').toLowerCase(); if (e) ativos.add(e); });
      itens = []; cs.forEach(d => itens.push(Object.assign({email:d.id}, d.data(), {ativo: ativos.has(d.id)})));
      itens.sort((a,b) => (a.nome||a.email).localeCompare(b.nome||b.email, 'pt-BR'));
    }catch(e){ itens = []; msg.textContent = 'Não consegui carregar a lista (' + ((e && e.code) || e) + '). Para ver e cadastrar pessoas, as regras novas precisam estar publicadas no Firebase (arquivo firestore.rules).'; }
    desenhar();
  }
  desenhar(); carregar();
  return wrap;
}

/* ---------------------------------------------------------------------- */
/* Admin: Alunos (os dados de todo mundo)                                  */
/* ---------------------------------------------------------------------- */

function renderAlunos(){
  const wrap = el('div', {class:'home admin'});
  wrap.appendChild(adminHead('Alunos', 'Os números de cada pessoa credenciada, por frente. Atualiza sozinho sempre que o aluno mexe no Precifica.'));
  const acoes = el('div', {style:'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;'});
  wrap.appendChild(acoes);
  const lista = el('div', {class:'geral-tabela'});
  wrap.appendChild(lista);
  lista.appendChild(el('div', {class:'geral-row'}, [el('span', {class:'help'}, ['carregando…'])]));
  const frenteTxt = (r) => r ? fmtBRL(r.liquido) + ' / ' + fmtBRL(r.meta) + (r.bateMeta ? ' ✅' : ' ❌') : '—';
  let linhas = [];
  (async () => {
    try{
      const [rs, cs] = await Promise.all([getDocs(collection(dbfs, 'resumos')), getDocs(collection(dbfs, 'credenciados'))]);
      const porEmail = {};
      rs.forEach(d => { const v = d.data(); porEmail[(v.email||'').toLowerCase()] = v; });
      cs.forEach(d => { const c = d.data(); if (!porEmail[d.id]) porEmail[d.id] = {nome:c.nome, email:d.id, _semDados:true}; else if (!porEmail[d.id].nome) porEmail[d.id].nome = c.nome; });
      linhas = Object.values(porEmail).filter(v => v.email).map(v => {
        const perda = Object.keys(MODELS).reduce((s,k) => s + ((v[k] && v[k].perdaMensal) || 0), 0);
        const ult = Object.keys(MODELS).map(k => v[k] && v[k].atualizadoEm).filter(Boolean).sort((a,b) => (b.seconds||0) - (a.seconds||0))[0];
        return Object.assign({}, v, {perda, ult});
      }).sort((a,b) => b.perda - a.perda);
    }catch(e){
      lista.innerHTML = ''; lista.appendChild(el('div', {class:'geral-row'}, [el('span', {class:'help'}, ['Não consegui carregar (' + ((e && e.code) || e) + '). Para ver os dados de todo mundo, as regras novas precisam estar publicadas no Firebase (arquivo firestore.rules).'])])); return;
    }
    lista.innerHTML = '';
    lista.appendChild(el('div', {class:'geral-row alunos-row geral-head'}, ['Aluno','Clínica (lucro / meta)','Cursos','Produtos','Deixando na mesa','Atualizado'].map(x => el('span', {}, [x]))));
    if (!linhas.length) lista.appendChild(el('div', {class:'geral-row'}, [el('span', {class:'help'}, ['Ainda não há alunos.'])]));
    linhas.forEach(v => lista.appendChild(el('div', {class:'geral-row alunos-row'}, [
      el('span', {}, [el('b', {}, [v.nome || '—']), el('div', {class:'help', style:'margin:0;'}, [v.email])]),
      el('span', {class:'mono'}, [v._semDados ? 'ainda não preencheu' : frenteTxt(v.prestador)]),
      el('span', {class:'mono'}, [frenteTxt(v.conhecimento)]),
      el('span', {class:'mono'}, [frenteTxt(v.produto)]),
      el('span', {class:'mono', style: v.perda > 0 ? 'color:var(--red);font-weight:700;' : ''}, [v.perda > 0 ? fmtBRL(v.perda) + '/mês' : '—']),
      el('span', {}, [v.ult ? fmtWhen(v.ult) : '—']),
    ])));
    acoes.appendChild(el('button', {class:'btn btn-secondary btn-sm', type:'button', onclick:()=>{
      const cab = ['Nome','E-mail','Clínica lucro','Clínica meta','Cursos lucro','Cursos meta','Produtos lucro','Produtos meta','Deixando na mesa/mês'];
      const n = (x) => x == null ? '' : String(Math.round(x*100)/100).replace('.', ',');
      const rows = linhas.map(v => [v.nome||'', v.email, n(v.prestador&&v.prestador.liquido), n(v.prestador&&v.prestador.meta), n(v.conhecimento&&v.conhecimento.liquido), n(v.conhecimento&&v.conhecimento.meta), n(v.produto&&v.produto.liquido), n(v.produto&&v.produto.meta), n(v.perda)]);
      const csv = [cab].concat(rows).map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(';')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + csv], {type:'text/csv;charset=utf-8'}));
      a.download = 'precifica-alunos-' + new Date().toISOString().slice(0,10) + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
    }}, ['⬇ Baixar planilha (Excel)']));
    acoes.appendChild(el('span', {class:'help', style:'margin:0;align-self:center;'}, [linhas.length + ' pessoa(s) · ordenado por quem está deixando mais dinheiro na mesa']));
  })();
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
  } else if (APP.view !== 'menu'){
    bar.appendChild(el('button', {class:'btn-ghost', onclick: goHome}, ['☰ Início']));
  }
  if (CURRENT_USER && CURRENT_USER.admin){
    bar.appendChild(el('button', {class:'btn-ghost' + (APP.view==='credenciamento'?' on':''), onclick:()=>{ APP.view='credenciamento'; APP.model=null; APP.state=null; render(); }}, ['👥 Credenciamento']));
    bar.appendChild(el('button', {class:'btn-ghost' + (APP.view==='alunos'?' on':''), onclick:()=>{ APP.view='alunos'; APP.model=null; APP.state=null; render(); }}, ['📈 Alunos']));
  }
  if (CURRENT_USER && APP.view === 'menu') bar.appendChild(el('span', {style:'font-size:13px;color:var(--ink-soft);'}, ['Olá, ', el('b',{style:'color:var(--ink);'},[CURRENT_USER.nome])]));
  if (CURRENT_USER) bar.appendChild(el('button', {class:'btn-ghost', onclick: doLogout}, ['Sair']));
  return bar;
}

/* ---------------------------------------------------------------------- */
/* Menu principal                                                         */
/* ---------------------------------------------------------------------- */

function fmtWhen(ts){
  try{
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : (ts.seconds != null ? new Date(ts.seconds * 1000) : new Date(ts));
    if (isNaN(d)) return '';
    return d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric'});
  }catch(e){ return ''; }
}

// Pra onde vai a aplicação ao DentistaCEO. Preencha UM dos três:
// link de formulário (Google Forms, Typeform…), WhatsApp (só números, com DDI 55) ou e-mail.
const APLICACAO = { link:'', whatsapp:'', email:'ubiratan@archettiodonto.com.br' };
function aplicarDentistaCEO(numeros){
  const texto = 'Olá! Usei o Precifica e quero aplicar para o DentistaCEO.' + (numeros ? '\n\nMeus números:\n' + numeros : '');
  if (APLICACAO.link) return window.open(APLICACAO.link, '_blank');
  if (APLICACAO.whatsapp) return window.open('https://wa.me/' + APLICACAO.whatsapp + '?text=' + encodeURIComponent(texto), '_blank');
  window.location.href = 'mailto:' + APLICACAO.email + '?subject=' + encodeURIComponent('Aplicação DentistaCEO') + '&body=' + encodeURIComponent(texto);
}

function renderMenu(){
  const wrap = el('div', {class:'home'});
  wrap.appendChild(el('div', {class:'home-hero'}, [
    el('div', {class:'eyebrow'}, ['PRECIFICA · Método 4C']),
    el('h1', {class:'disp'}, ['Descubra quanto a sua clínica está deixando na mesa.']),
    el('p', {}, ['Em 2 minutos você vê se o seu preço paga a clínica e o salário que você quer tirar. Depois, se quiser, faz o passo a passo completo.']),
  ]));

  const resumo = APP.menuResumo || {};
  const r = resumo.prestador;
  const main = el('div', {class:'home-main'});
  main.appendChild(el('div', {}, [
    el('span', {class:'tag'}, ['Para dentistas']),
    el('h2', {class:'disp', style:'margin:6px 0 6px;'}, ['Minha clínica']),
    el('p', {style:'margin:0;color:var(--ink-soft);'}, ['Procedimentos, hora clínica, custos da cadeira, equipe (ASB, recepção) — o seu tempo de atendimento é o produto.']),
    r ? el('div', {class:'progress-line', style:'margin-top:10px;'}, [el('span', {}, ['meta ', el('b',{},[fmtBRL(r.meta)])]), el('span', {}, [r.bateMeta ? '✅ bate a meta' : '❌ ainda não bate'])]) : null,
  ]));
  main.appendChild(el('div', {class:'home-main-btns'}, [
    el('button', {class:'btn btn-primary', type:'button', onclick:()=>{ APP.view = 'rapido'; render(); }}, ['⚡ Modo rápido (2 min)']),
    el('button', {class:'btn btn-secondary', type:'button', onclick:()=>selectModel('prestador')}, [r ? 'Continuar o passo a passo' : 'Passo a passo completo']),
  ]));
  wrap.appendChild(main);

  const preenchidas = Object.keys(MODELS).filter(k => lsGet('modelo:' + k));
  if (preenchidas.length) wrap.appendChild(el('button', {class:'home-geral', type:'button', onclick:()=>{ APP.view='geral'; render(); }}, [
    el('b', {}, ['📊 Visão geral — todas as frentes juntas']),
    el('span', {class:'help', style:'margin:0;'}, ['Clínica + cursos + produtos somados contra a sua meta, e onde cada hora sua rende mais.']),
  ]));
  wrap.appendChild(el('div', {class:'cat-title', style:'margin-top:30px;'}, ['Também vende produtos, cursos ou ebooks?']));
  const outros = el('div', {class:'home-outros'});
  ['produto', 'conhecimento'].forEach(k => {
    const m = MODELS[k]; const rr = resumo[k];
    outros.appendChild(el('button', {type:'button', class:'home-outro', onclick:()=>selectModel(k)}, [
      el('b', {}, [m.label]), el('span', {class:'help', style:'margin:0;'}, [m.examples]),
      rr ? el('span', {class:'help', style:'margin:0;'}, [rr.bateMeta ? '✅ bate a meta' : '❌ ainda não bate']) : null,
    ]));
  });
  wrap.appendChild(outros);

  wrap.appendChild(el('ul', {class:'note-list', style:'margin-top:26px;max-width:560px;'}, [
    el('li', {}, ['Seus dados ficam salvos na sua conta — dá pra continuar de qualquer computador ou celular.']),
    el('li', {}, ['Sonhos, vida pessoal e meta valem pra todas as frentes: você preenche uma vez só.']),
  ]));
  return wrap;
}

/* ---------- Visão geral: todas as frentes juntas ---------- */
const NOME_FRENTE = {prestador:'Clínica (atendimentos)', produto:'Produtos', conhecimento:'Cursos, ebooks e mentorias'};
function frentesAtivas(){
  const ign = (lsGet('pessoal') || {}).frentesIgnoradas || [];
  return Object.keys(MODELS).filter(k => lsGet('modelo:' + k) && !ign.includes(k));
}
function dadosFrente(k){
  const st = mergeWithDefaults(k, lerModelo(k));
  const r = computeResumo(k, st);
  const h = st.hora || {};
  let horasSemana = null;
  if (k === 'prestador') horasSemana = (parseBR(h.diasUteis)||0) * (parseBR(h.horasDia)||0);
  if (k === 'conhecimento') horasSemana = (parseBR(h.diasUteis)||0) * (parseBR(h.horasProdutivasDia)||0);
  const horasMesTrabalho = (k === 'prestador' || k === 'conhecimento') ? r.calc.totals.horas : 0;
  return {k, st, r, horasSemana, horasMesTrabalho, lucroHora: horasMesTrabalho > 0 ? r.liquido / horasMesTrabalho : null};
}

function renderVisaoGeral(){
  const wrap = el('div', {class:'home geral'});
  wrap.appendChild(el('div', {class:'home-hero'}, [
    el('div', {class:'eyebrow'}, ['Visão geral']),
    el('h1', {class:'disp'}, ['Todas as suas frentes juntas']),
    el('p', {}, ['Clínica, cursos, produtos: tudo somado contra a sua meta. Sonhos, vida e meta são os mesmos pra todas as frentes — você preenche uma vez só.']),
  ]));
  const ativas = frentesAtivas();
  if (!ativas.length){
    wrap.appendChild(el('p', {}, ['Você ainda não preencheu nenhuma frente. Comece pela sua clínica.']));
    wrap.appendChild(el('button', {class:'btn btn-primary', type:'button', onclick:()=>selectModel('prestador')}, ['Começar pela clínica']));
    return wrap;
  }
  const fs = ativas.map(dadosFrente);
  const st0 = fs[0].st;
  const metaNeg = computeMetaNegocio(st0);
  const lucroTotal = fs.reduce((s,f)=>s + f.r.liquido, 0);
  const receitaTotal = fs.reduce((s,f)=>s + f.r.receita, 0);
  const perdaTotal = fs.reduce((s,f)=>s + (f.r.perdaMensal||0), 0);
  const falta = metaNeg - lucroTotal;

  // destaque
  const hero = el('div', {class:'resumo-hero ' + (falta > 0 ? 'perda' : 'ok')});
  hero.appendChild(el('div', {class:'lbl'}, [falta > 0 ? 'Somando tudo, faltam' : '✅ Somando tudo, você bate a meta']));
  hero.appendChild(el('div', {class:'val'}, [(falta > 0 ? '' : '+') + fmtBRL(Math.abs(falta))]));
  hero.appendChild(el('div', {class:'lbl'}, [falta > 0 ? 'por mês pra chegar na meta de ' + fmtBRL(metaNeg) + '.' : 'por mês além da meta de ' + fmtBRL(metaNeg) + '.']));
  if (perdaTotal > 0) hero.appendChild(el('div', {class:'lbl', style:'margin-top:8px;'}, ['💸 E está deixando ' + fmtBRL(perdaTotal) + ' por mês na mesa, cobrando abaixo do preço certo.']));
  wrap.appendChild(hero);

  // tabela por frente
  const melhor = fs.filter(f => f.lucroHora != null && f.lucroHora > 0).sort((a,b)=>b.lucroHora - a.lucroHora)[0];
  const t = el('div', {class:'geral-tabela'});
  t.appendChild(el('div', {class:'geral-row geral-head'}, ['Frente','Receita/mês','Lucro/mês','Horas/semana','Lucro por hora sua',''].map(x => el('span', {}, [x]))));
  fs.forEach(f => {
    t.appendChild(el('div', {class:'geral-row'}, [
      el('span', {}, [el('b', {}, [NOME_FRENTE[f.k]])]),
      el('span', {class:'mono'}, [fmtBRL(f.r.receita)]),
      el('span', {class:'mono'}, [fmtBRL(f.r.liquido)]),
      el('span', {class:'mono'}, [f.horasSemana != null ? fmtNum(f.horasSemana,0) + ' h' : '—']),
      el('span', {class:'mono' + (melhor && melhor.k === f.k ? ' geral-best' : '')}, [f.lucroHora != null ? fmtBRL(f.lucroHora) + (melhor && melhor.k === f.k && fs.length > 1 ? ' ⭐' : '') : '—']),
      el('span', {}, [el('button', {class:'btn-ghost btn-sm', type:'button', onclick:()=>selectModel(f.k)}, ['abrir'])]),
    ]));
  });
  const horasTot = fs.reduce((s,f)=>s + (f.horasSemana||0), 0);
  t.appendChild(el('div', {class:'geral-row geral-foot'}, [
    el('span', {}, [el('b', {}, ['Total'])]), el('span', {class:'mono'}, [fmtBRL(receitaTotal)]), el('span', {class:'mono'}, [el('b', {}, [fmtBRL(lucroTotal)])]),
    el('span', {class:'mono'}, [horasTot ? fmtNum(horasTot,0) + ' h' : '—']), el('span'), el('span'),
  ]));
  wrap.appendChild(t);
  if (melhor && fs.filter(f => f.lucroHora).length > 1){
    wrap.appendChild(el('div', {class:'callout'}, [el('b', {}, ['A pergunta de ouro: ']),
      'cada hora sua rende mais em ' + NOME_FRENTE[melhor.k].toLowerCase() + ' (' + fmtBRL(melhor.lucroHora) + ' de lucro por hora). Antes de abrir mais horário, pense onde a sua próxima hora vale mais.']));
  }

  // alertas
  if (horasTot > 50) wrap.appendChild(el('div', {class:'svc-diff falta', style:'margin-top:10px;'}, ['⚠️ Somando as frentes, são ' + fmtNum(horasTot,0) + ' horas por semana. As horas de gravar aula e responder aluno saem da mesma semana da cadeira — revise a Minha Hora de cada frente.']));
  const rendas = (st0.rendas && st0.rendas.ativo) ? (st0.rendas.itens||[]) : [];
  if (fs.length > 1 && rendas.some(x => x.tipo === 'negocio' && parseBR(x.valor) > 0)){
    wrap.appendChild(el('div', {class:'svc-diff falta', style:'margin-top:10px;'}, ['⚠️ Em "Outras fontes de renda" há um "Outro negócio". Se for uma destas frentes, ela está sendo contada duas vezes — tire de lá, porque aqui elas já somam sozinhas.']));
  }

  // divisão da meta
  const d = Object.assign({}, st0.divisaoMeta || {});
  const box = el('div', {class:'cat-group', style:'margin-top:22px;'});
  box.appendChild(el('div', {class:'cat-title'}, ['Quanto da meta cada frente entrega']));
  box.appendChild(el('p', {class:'help', style:'margin:0 0 8px;'}, ['Assim o Resumo de cada frente compara com a parte dela, e não com a meta inteira. A soma deve dar 100%.']));
  const somaEl = el('div', {class:'help', style:'margin-top:6px;'});
  const salvarDiv = () => {
    const pes = lsGet('pessoal') || {};
    pes.divisaoMeta = d; setPessoal(pes);
    const soma = ativas.reduce((s,k)=>s + (parseBR(d[k]) || 0), 0);
    somaEl.textContent = 'Soma: ' + fmtNum(soma*100,0) + '%' + (Math.abs(soma-1) > 0.005 ? ' — ajuste pra chegar a 100%.' : ' ✔');
  };
  ativas.forEach(k => {
    if (d[k] == null) d[k] = ativas.length === 1 ? 1 : 0;
    box.appendChild(el('div', {class:'field-row'}, [el('label', {}, [NOME_FRENTE[k]]),
      numberInput({value:d[k], kind:'pct', onInput:(n)=>{ d[k] = n; salvarDiv(); }})]));
  });
  box.appendChild(somaEl);
  if (ativas.length > 1){
    box.appendChild(el('button', {class:'btn btn-secondary btn-sm', type:'button', style:'margin-top:6px;', onclick:()=>{
      const tot = lucroTotal > 0 ? lucroTotal : 0;
      fs.forEach(f => { d[f.k] = tot ? Math.round(Math.max(0,f.r.liquido)/tot*100)/100 : Math.round(100/fs.length)/100; });
      salvarDiv(); render();
    }}, ['Dividir conforme o lucro de hoje']));
  }
  wrap.appendChild(box);
  salvarDiv();

  // frentes que não usa
  const todas = Object.keys(MODELS).filter(k => lsGet('modelo:' + k));
  if (todas.length > ativas.length || todas.length > 1){
    const ign = (lsGet('pessoal') || {}).frentesIgnoradas || [];
    const g = el('div', {class:'help', style:'margin-top:16px;'}, ['Frentes consideradas: ']);
    todas.forEach(k => {
      const c = el('input', {type:'checkbox'}); c.checked = !ign.includes(k);
      c.addEventListener('change', () => {
        const pes = lsGet('pessoal') || {}; const l = new Set(pes.frentesIgnoradas || []);
        if (c.checked) l.delete(k); else l.add(k);
        pes.frentesIgnoradas = [...l]; setPessoal(pes); render();
      });
      g.appendChild(el('label', {style:'margin-right:14px;cursor:pointer;'}, [c, ' ' + NOME_FRENTE[k]]));
    });
    wrap.appendChild(g);
  }
  const outras = Object.keys(MODELS).filter(k => !lsGet('modelo:' + k));
  if (outras.length) wrap.appendChild(el('div', {style:'margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;'}, outras.map(k =>
    el('button', {class:'btn btn-secondary btn-sm', type:'button', onclick:()=>selectModel(k)}, ['+ Adicionar ' + NOME_FRENTE[k].toLowerCase()]))));
  wrap.appendChild(el('button', {class:'btn-ghost', type:'button', style:'margin-top:20px;', onclick:()=>{ APP.view='menu'; render(); }}, ['← Voltar ao início']));
  return wrap;
}

/* ---------- Modo rápido: 5 números → quanto está deixando na mesa ---------- */
// Premissas simples (o passo a passo completo permite ajustar tudo):
const RAPIDO = { semanasAno:46, ocupacao:0.7, impostosTaxas:0.09 };
function calcRapido(q){
  const horasMes = (parseBR(q.horasSemana)||0) * RAPIDO.semanasAno / 12 * RAPIDO.ocupacao;
  const necessarioHora = safeDiv((parseBR(q.custosClinica)||0) + (parseBR(q.querTirar)||0), horasMes);
  const durH = (parseBR(q.duracao)||0) / 60;
  const material = parseBR(q.material)||0;
  const precoCerto = durH > 0 ? (necessarioHora * durH + material) / (1 - RAPIDO.impostosTaxas) : 0;
  const cobra = parseBR(q.cobra)||0;
  const rendeHojeHora = durH > 0 ? Math.max(0, cobra * (1 - RAPIDO.impostosTaxas) - material) / durH : 0;
  const perdaMes = cobra > 0 ? Math.max(0, necessarioHora - rendeHojeHora) * horasMes : 0;
  return {horasMes, necessarioHora, precoCerto, rendeHojeHora, perdaMes, cobra};
}
function renderRapido(){
  const q = lsGet('rapido') || {querTirar:15000, custosClinica:12000, horasSemana:40, procedimento:'Restauração em resina', duracao:60, material:30, cobra:250};
  const salvar = () => { try{ lsSet('rapido', q); }catch(e){} };
  const wrap = el('div', {class:'home rapido'});
  wrap.appendChild(el('div', {class:'home-hero'}, [
    el('div', {class:'eyebrow'}, ['Modo rápido · 2 minutos']),
    el('h1', {class:'disp'}, ['Quanto você está deixando na mesa?']),
    el('p', {}, ['Cinco números e pronto. Use valores aproximados — dá pra refinar depois no passo a passo.']),
  ]));
  const grid = el('div', {class:'rapido-grid'});
  const form = el('div', {class:'rapido-form'});
  const out = el('div', {class:'rapido-res'});
  grid.appendChild(form); grid.appendChild(out);
  wrap.appendChild(grid);
  const campo = (n, label, help, key, kind, dec) => form.appendChild(el('div', {class:'rapido-q'}, [
    el('span', {class:'rapido-n'}, [String(n)]),
    el('label', {}, [label, help ? el('div',{class:'help'},[help]) : null]),
    numberInput({value:q[key], kind, dec, onInput:(v)=>{ q[key]=v; salvar(); upd(); }}),
  ]));
  campo(1, 'Quanto você quer tirar por mês?', 'Seu salário de dentista (pró-labore).', 'querTirar', 'brl');
  campo(2, 'Quanto custa a clínica por mês?', 'Aluguel, ASB, recepção, contador, luz, sistema, marketing…', 'custosClinica', 'brl');
  campo(3, 'Quantas horas por semana você atende?', 'Agenda aberta, com ou sem paciente.', 'horasSemana', 'num', 1);
  const proc = el('div', {class:'rapido-q'}, [el('span', {class:'rapido-n'}, ['4']), el('label', {}, ['Seu procedimento principal', el('div',{class:'help'},['O que você mais faz. Nome, tempo e material.'])])]);
  const nome = el('input', {class:'inp text-left', value:q.procedimento||'', placeholder:'ex.: restauração em resina'});
  nome.addEventListener('input', () => { q.procedimento = nome.value; salvar(); upd(); });
  proc.appendChild(el('div', {class:'rapido-proc'}, [nome,
    el('div', {}, [el('span',{class:'help',style:'margin:0;'},['minutos']), numberInput({value:q.duracao, kind:'num', dec:0, onInput:(v)=>{ q.duracao=v; salvar(); upd(); }})]),
    el('div', {}, [el('span',{class:'help',style:'margin:0;'},['material (R$)']), numberInput({value:q.material, kind:'brl', onInput:(v)=>{ q.material=v; salvar(); upd(); }})]),
  ]));
  form.appendChild(proc);
  campo(5, 'Quanto você cobra hoje por ele?', 'Valor particular.', 'cobra', 'brl');
  form.appendChild(el('p', {class:'help', style:'margin-top:10px;'}, ['Premissas do modo rápido: 46 semanas trabalhadas no ano, agenda 70% ocupada e 9% de impostos e taxas de cartão. No passo a passo você ajusta tudo isso.']));

  function upd(){
    const c = calcRapido(q);
    out.innerHTML = '';
    if (!c.horasMes || !c.precoCerto){ out.appendChild(el('p', {class:'help'}, ['Preencha os números pra ver o resultado.'])); return; }
    if (c.perdaMes > 0){
      out.appendChild(el('div', {class:'rapido-perda'}, [
        el('div', {class:'lbl'}, ['💸 Você está deixando na mesa']),
        el('div', {class:'val'}, [fmtBRL(c.perdaMes)]),
        el('div', {class:'lbl'}, ['por mês — ' + fmtBRL(c.perdaMes*12) + ' por ano']),
      ]));
    } else {
      out.appendChild(el('div', {class:'rapido-perda ok'}, [el('div', {class:'lbl'}, ['👏 Seu preço já paga a clínica e o salário que você quer.']),
        el('div', {class:'lbl', style:'margin-top:4px;'}, ['Vale fazer o passo a passo pra ver os outros procedimentos e a sua margem.'])]));
    }
    const linha = (l, v, cls) => out.appendChild(el('div', {class:'rapido-linha'}, [el('span', {}, [l]), el('b', {class:'mono ' + (cls||'')}, [v])]));
    linha('Cada hora atendida precisa render', fmtBRL(c.necessarioHora));
    if (c.cobra > 0) linha('Hoje, com ' + (q.procedimento || 'o procedimento') + ', rende', fmtBRL(c.rendeHojeHora) + '/h', c.rendeHojeHora < c.necessarioHora ? 'neg' : '');
    linha('Preço certo de ' + (q.procedimento || 'o procedimento'), fmtBRL(c.precoCerto), 'pos');
    if (c.cobra > 0) linha('Você cobra hoje', fmtBRL(c.cobra));
    out.appendChild(el('p', {class:'help', style:'margin:8px 0 14px;'}, ['Conta: (custos da clínica + o que você quer tirar) ÷ ' + fmtNum(c.horasMes,0) + ' horas atendidas por mês.']));
    out.appendChild(el('button', {class:'btn btn-primary', type:'button', style:'width:100%;', onclick:()=>aplicarDentistaCEO(
      'Quero tirar: ' + fmtBRL(parseBR(q.querTirar)) + '/mês\nCusto da clínica: ' + fmtBRL(parseBR(q.custosClinica)) + '/mês\nHoras/semana: ' + fmtNum(parseBR(q.horasSemana),0)
      + '\nProcedimento: ' + (q.procedimento||'') + ' — cobro ' + fmtBRL(c.cobra) + ', preço certo ' + fmtBRL(c.precoCerto)
      + '\nDeixando na mesa: ' + fmtBRL(c.perdaMes) + '/mês')}, ['Quero ajuda pra virar esse jogo → aplicar para o DentistaCEO']));
    out.appendChild(el('button', {class:'btn btn-secondary', type:'button', style:'width:100%;margin-top:8px;', onclick:()=>selectModel('prestador')}, ['Fazer o passo a passo completo']));
  }
  upd();
  wrap.appendChild(el('button', {class:'btn-ghost', type:'button', style:'margin-top:20px;', onclick:()=>{ APP.view='menu'; render(); }}, ['← Voltar ao início']));
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

// Itens que abrem uma lista pra detalhar (ex.: cada assinatura com seu nome e valor).
// O valor do item passa a ser a soma da lista.
const ITENS_DETALHAVEIS = {
  'Outras assinaturas recorrentes': {add:'+ Adicionar assinatura', ph:'ex.: Notion, CapCut Pro, Google Workspace'},
  'Outras assinaturas (CRM, e-mail, IA)': {add:'+ Adicionar assinatura', ph:'ex.: RD Station, ChatGPT Plus'},
};

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
      if (ITENS_DETALHAVEIS[label]){ group.appendChild(detalheItem(label, i)); return; }
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

  // Item com lista detalhada: o valor é a soma das linhas (quando houver linhas).
  function detalheItem(label, i){
    const cfg = ITENS_DETALHAVEIS[label];
    const st = APP.state;
    if (!st.detalhes) st.detalhes = {};
    const lista = st.detalhes[label] || (st.detalhes[label] = []);
    const wrap = el('div', {class:'det-item'});
    const row = el('div', {class:'field-row'});
    const btn = el('button', {type:'button', class:'det-toggle'}, ['']);
    row.appendChild(el('label', {}, [label, el('div', {}, [btn])]));
    const valWrap = el('div');
    row.appendChild(valWrap);
    wrap.appendChild(row);
    const box = el('div', {class:'det-box'});
    wrap.appendChild(box);
    let aberto = lista.length > 0;
    const soma = () => lista.reduce((t, x) => t + (parseBR(x.valor)||0), 0);
    function sync(){
      if (lista.length){ arr[i] = soma(); }
      persist(); updateTotal(); if (opts.onChange) opts.onChange();
      const out = document.getElementById('det-soma-' + i);
      if (out) out.value = fmtNum(arr[i]||0, 2);
    }
    function drawValor(){
      valWrap.innerHTML = '';
      if (lista.length){
        const f = numberInput({value: arr[i]||0, kind:'brl', locked:true});
        f.querySelector('input').id = 'det-soma-' + i;
        valWrap.appendChild(f);
      } else {
        valWrap.appendChild(numberInput({value: arr[i]||0, kind:'brl', onInput:(n)=>{ arr[i] = n; persist(); updateTotal(); if (opts.onChange) opts.onChange(); }}));
      }
    }
    function draw(){
      btn.textContent = aberto ? '▾ fechar lista' : (lista.length ? '▸ ver as ' + lista.length + (lista.length===1?' assinatura':' assinaturas') : '▸ detalhar uma por uma');
      box.innerHTML = '';
      box.style.display = aberto ? '' : 'none';
      if (!aberto) return;
      lista.forEach((it, k) => {
        const nome = el('input', {class:'inp text-left', value: it.nome||'', placeholder: cfg.ph});
        nome.addEventListener('input', () => { it.nome = nome.value; persist(); });
        box.appendChild(el('div', {class:'det-row'}, [
          nome,
          numberInput({value: it.valor||0, kind:'brl', onInput:(n)=>{ it.valor = n; sync(); }}),
          el('button', {class:'row-del', type:'button', title:'remover', onclick:()=>{ lista.splice(k,1); if (!lista.length) arr[i] = 0; sync(); drawValor(); draw(); }}, ['✕']),
        ]));
      });
      box.appendChild(el('button', {class:'btn btn-secondary btn-sm', type:'button', onclick:()=>{
        if (!lista.length && parseBR(arr[i]) > 0) lista.push({nome:'', valor: arr[i]}); // aproveita o valor já digitado
        lista.push({nome:'', valor:0}); sync(); drawValor(); draw();
        const ins = box.querySelectorAll('input.text-left'); if (ins.length) ins[ins.length-1].focus();
      }}, [cfg.add]));
      if (lista.length) box.appendChild(el('div', {class:'help', style:'margin-top:6px;'}, ['O valor ao lado é a soma desta lista.']));
    }
    btn.addEventListener('click', () => { aberto = !aberto; draw(); });
    drawValor(); draw();
    return wrap;
  }

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

// Itens de Meu Negócio que podem ser material clínico (pra avisar sobre conta em dobro).
const NEGOCIO_ITENS_MATERIAL = ['EPIs da equipe', 'Reposição de itens clínicos gerais', 'Descartáveis gerais (papel toalha, álcool)'];

function renderStepInsumosPrestador(panel){
  const st = APP.state;
  if (!Array.isArray(st.materialMeses)) st.materialMeses = [0,0,0];
  panelHead(panel, '5º passo — Conhecer', 'Insumos',
    'Não precisa contar luva por luva. Basta saber quanto a clínica gasta por mês com materiais — o Precifica distribui esse valor entre os serviços, conforme o tempo de cada um.');
  const body = el('div', {class:'panel-body'});
  const $ = (id) => document.getElementById(id);

  // pergunta principal
  const main = el('div', {class:'mat-main'});
  main.appendChild(el('label', {class:'mat-q'}, ['Quanto a clínica gasta por mês com materiais?',
    el('div', {class:'help'}, ['Some as notas e boletos dos fornecedores: material odontológico, descartáveis, anestésico, resina, esterilização… Uma média aproximada já basta.'])]));
  const mainInp = numberInput({value: st.materialMensal || 0, kind:'brl', onInput:(n)=>{ st.materialMensal = n; persist(); refresh(); }});
  mainInp.querySelector('input').id = 'mat-mensal';
  mainInp.querySelector('input').style.fontSize = '16px';
  main.appendChild(mainInp);
  body.appendChild(main);

  // ajuda: média de 3 meses
  const det = el('details', {class:'svc-det', style:'margin-top:12px;'});
  det.appendChild(el('summary', {}, ['Não sei o valor — me ajude a calcular']));
  det.appendChild(el('p', {class:'help'}, ['Coloque quanto foi gasto com materiais em cada um dos últimos 3 meses (pelas notas, extrato ou boletos). O Precifica tira a média.']));
  const meses = el('div', {class:'mat-meses'});
  ['Mês 1', 'Mês 2', 'Mês 3'].forEach((lbl, k) => {
    meses.appendChild(el('div', {}, [el('div', {class:'help', style:'margin:0 0 3px;'}, [lbl]),
      numberInput({value: st.materialMeses[k] || 0, kind:'brl', onInput:(n)=>{ st.materialMeses[k] = n; persist(); refreshMedia(); }})]));
  });
  det.appendChild(meses);
  const mediaRow = el('div', {style:'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px;'}, [
    el('span', {}, ['Média: ', el('b', {id:'mat-media', class:'mono'}, [''])]),
    el('button', {class:'btn btn-secondary btn-sm', type:'button', onclick:()=>{
      const m = media(); st.materialMensal = Math.round(m*100)/100; persist();
      $('mat-mensal').value = fmtNum(st.materialMensal, 2); refresh();
    }}, ['Usar essa média']),
  ]);
  det.appendChild(mediaRow);
  body.appendChild(det);
  function media(){
    const v = st.materialMeses.map(x => parseBR(x)).filter(x => x > 0);
    return v.length ? v.reduce((a,b)=>a+b,0) / v.length : 0;
  }
  function refreshMedia(){ const e = $('mat-media'); if (e) e.textContent = fmtBRL(media()); }

  // resultado
  const res = el('div', {class:'svc-res', style:'margin-top:18px;'});
  res.appendChild(el('div', {class:'svc-res-lbl'}, ['Custo de material por hora de atendimento']));
  res.appendChild(el('div', {class:'svc-res-val', id:'mat-hora'}, ['']));
  res.appendChild(el('div', {class:'help', id:'mat-hora-conta'}, ['']));
  res.appendChild(el('div', {class:'svc-res-line', id:'mat-exemplos', style:'margin-top:6px;'}, ['']));
  body.appendChild(res);

  // aviso de conta em dobro
  body.appendChild(el('div', {id:'mat-dobro', class:'callout', style:'display:none;'}));

  body.appendChild(el('ul', {class:'note-list', style:'margin-top:16px;'}, [
    el('li', {}, ['Na etapa Meus Serviços, o material de cada serviço sai automático: custo por hora × tempo do serviço.']),
    el('li', {}, ['Algum procedimento gasta muito mais que a média (ex.: kit de clareamento, implante)? Nele, escolha "Valor próprio" em Meus Serviços. Prótese e laboratório vão em "Outros custos" do serviço.']),
    el('li', {}, ['As horas de atendimento vêm da etapa Minha Hora (horas disponíveis × ocupação). Ajustando lá, o custo por hora daqui se atualiza.']),
  ]));

  function refresh(){
    const horaC = computeHora('prestador', st);
    const taxa = taxaMaterialHora(st);
    const mensal = parseBR(st.materialMensal);
    $('mat-hora').textContent = mensal ? fmtBRL(taxa) : '—';
    $('mat-hora-conta').textContent = mensal
      ? fmtBRL(mensal) + ' por mês ÷ ' + fmtNum(horaC.horasEfetivas, 0) + ' h atendidas por mês'
      : 'Preencha o gasto mensal acima pra ver o custo por hora.';
    $('mat-exemplos').innerHTML = mensal
      ? 'Ex.: um atendimento de 30 min leva <b>' + fmtBRL(taxa*0.5) + '</b> de material; um de 1 h, <b>' + fmtBRL(taxa) + '</b>.'
      : '';
    const neg = negocioFlat('prestador');
    const itens = neg.map((it, i) => ({label: it.label, v: parseBR((st.negocio||[])[i])}))
      .filter(x => NEGOCIO_ITENS_MATERIAL.includes(x.label) && x.v > 0);
    const dob = $('mat-dobro');
    if (itens.length && mensal){
      dob.style.display = '';
      dob.innerHTML = '<b>Cuidado pra não contar duas vezes:</b> em Meu Negócio você já colocou ' +
        itens.map(x => x.label + ' (' + fmtBRL(x.v) + ')').join(', ') +
        '. Esses valores já entram no custo da sua hora. Se eles também estão no gasto acima, tire de um dos dois lugares.';
    } else dob.style.display = 'none';
    refreshMedia();
  }

  panel.appendChild(body);
  footNav(panel, {});
  requestAnimationFrame(refresh);
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
  // Campo "Semanas efetivas" com um pop-up que mostra a conta semana a semana.
  function semanasField(help){
    const inp = numberInput({value:h.semanasEfetivas, kind:'num', dec:1, onInput:(n)=>{h.semanasEfetivas=n; persist(); refresh();}});
    const row = el('div', {class:'field-row'});
    row.appendChild(el('label', {}, ['Semanas efetivas no ano', el('div',{class:'help'},[help]),
      el('button', {type:'button', class:'det-toggle', onclick:()=>abrirSemanas(inp.querySelector('input'))}, ['📅 Ver e editar as semanas do ano'])]));
    row.appendChild(inp);
    return row;
  }
  // Pop-up editável: 52 quadradinhos (1 por semana). A pessoa escolhe uma cor
  // e clica (ou arrasta) nas semanas pra marcar férias, feriados, capacitação…
  function abrirSemanas(inputEl){
    const TIPOS = [
      {k:'trab', l:'Trabalhada'},
      {k:'ferias', l:'Férias'},
      {k:'feriado', l:'Feriados'},
      {k:'capacitacao', l:'Capacitação (cursos, congressos)'},
      {k:'ausencia', l:'Outras ausências'},
    ];
    if (!Array.isArray(h.semMapa) || h.semMapa.length !== 52) h.semMapa = mapaInicial();
    const mapa = h.semMapa.slice(); // edita uma cópia; só grava ao confirmar
    let pincel = 'ferias';

    const overlay = el('div', {class:'modal-overlay'});
    const box = el('div', {class:'modal-box', role:'dialog', 'aria-label':'Semanas trabalhadas no ano'});
    overlay.appendChild(box);
    const fechar = () => { overlay.remove(); document.removeEventListener('keydown', onKey); document.removeEventListener('pointerup', soltar); };
    const onKey = (e) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(); });

    box.appendChild(el('div', {class:'modal-head'}, [el('h3', {}, ['Quantas semanas você trabalha no ano?']),
      el('button', {class:'row-del', type:'button', title:'fechar', onclick:fechar}, ['✕'])]));
    box.appendChild(el('p', {class:'help', style:'margin:0 0 10px;'}, ['Escolha uma cor e clique nas semanas (ou arraste por cima) pra marcar. Clicar de novo com a mesma cor volta a semana pra "trabalhada". Cada linha é um mês (4 semanas; março, junho, setembro e dezembro têm 5, pra fechar as 52 semanas do ano).']));

    const paleta = el('div', {class:'sem-paleta'});
    box.appendChild(paleta);
    const gradeWrap = el('div', {class:'sem-grade-wrap'});
    box.appendChild(gradeWrap);
    const conta = el('div', {class:'sem-conta'});
    box.appendChild(conta);
    const usar = el('button', {class:'btn btn-primary', type:'button'}, ['']);
    box.appendChild(el('div', {style:'display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:14px;'}, [
      el('button', {class:'btn btn-secondary', type:'button', onclick:()=>{ for (let k=0;k<52;k++) mapa[k]='trab'; desenhar(); }}, ['Limpar tudo']),
      el('div', {style:'display:flex;gap:8px;'}, [el('button', {class:'btn btn-secondary', type:'button', onclick:fechar}, ['Cancelar']), usar]),
    ]));

    let pintando = false, modoPintura = null;
    const soltar = () => { pintando = false; modoPintura = null; };
    document.addEventListener('pointerup', soltar);
    function pinta(k, inicio){
      if (inicio) modoPintura = mapa[k] === pincel && pincel !== 'trab' ? 'trab' : pincel;
      mapa[k] = modoPintura;
      desenhar();
    }

    // Monta paleta e grade UMA vez; depois só troca cores/contagens (sem recriar elementos).
    const chips = {};
    TIPOS.forEach(t => {
      const num = el('b', {}, ['0']);
      const chip = el('button', {type:'button', class:'sem-chip', onclick:()=>{ pincel = t.k; desenhar(); }}, [el('span', {class:'sem-q ' + t.k}), t.l + ' ', num]);
      chips[t.k] = {chip, num};
      paleta.appendChild(chip);
    });
    // Uma linha por mês. O ano tem 52 semanas, então 4 meses (um por trimestre)
    // ganham uma 5ª semana: 4-4-5 semanas por trimestre.
    const cels = [];
    const MESES = [['Jan',4],['Fev',4],['Mar',5],['Abr',4],['Mai',4],['Jun',5],['Jul',4],['Ago',4],['Set',5],['Out',4],['Nov',4],['Dez',5]];
    let k = 0;
    MESES.forEach(([mes, n]) => {
      const linha = el('div', {class:'sem-linha'}, [el('span', {class:'sem-tri'}, [mes])]);
      for (let c = 0; c < n; c++){
        const idx = k++;
        const q = el('button', {type:'button', class:'sem-q sem-cel'});
        q.addEventListener('pointerdown', (e) => { e.preventDefault(); pintando = true; pinta(idx, true); });
        q.addEventListener('pointerenter', () => { if (pintando) pinta(idx, false); });
        cels.push(q); linha.appendChild(q);
      }
      gradeWrap.appendChild(linha);
    });

    function desenhar(){
      const cont = {}; TIPOS.forEach(t => cont[t.k] = 0); mapa.forEach(v => cont[v] = (cont[v]||0) + 1);
      TIPOS.forEach(t => { chips[t.k].chip.classList.toggle('on', pincel === t.k); chips[t.k].num.textContent = String(cont[t.k]); });
      cels.forEach((q, k) => {
        const tipo = TIPOS.find(t => t.k === mapa[k]) || TIPOS[0];
        q.className = 'sem-q sem-cel ' + tipo.k;
        q.title = 'Semana ' + (k+1) + ' — ' + tipo.l;
      });
      const partes = TIPOS.filter(t => t.k !== 'trab' && cont[t.k]).map(t => '<b>' + cont[t.k] + '</b> de ' + t.l.split(' (')[0].toLowerCase());
      conta.innerHTML = '<b>52</b> semanas no ano' + (partes.length ? ' − ' + partes.join(' − ') : '') + ' = <b class="sem-res">' + cont.trab + ' semanas trabalhadas</b>';
      usar.textContent = 'Usar ' + cont.trab + ' semanas';
    }
    usar.addEventListener('click', () => {
      h.semMapa = mapa.slice();
      h.semanasEfetivas = mapa.filter(v => v === 'trab').length;
      persist();
      if (inputEl) inputEl.value = fmtNum(h.semanasEfetivas, 1);
      refresh(); fechar();
    });
    desenhar();
    document.body.appendChild(overlay);
  }
  // Ponto de partida: respeita as semanas já informadas (as que faltam viram férias/feriados).
  function mapaInicial(){
    const m = new Array(52).fill('trab');
    const fora = Math.max(0, Math.min(52, 52 - Math.round(parseBR(h.semanasEfetivas) || 46)));
    // feriados: semana do Carnaval (~8) e do Natal (52); o resto vira férias em jan e jul
    const feriados = Math.min(2, fora), ferias = fora - feriados;
    const ordemFerias = [0,1,26,27,2,28,3,29,4,30,5,31];
    for (let n = 0; n < ferias && n < ordemFerias.length; n++) m[ordemFerias[n]] = 'ferias';
    if (feriados > 0) m[51] = 'feriado';
    if (feriados > 1) m[7] = 'feriado';
    return m;
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
    body.appendChild(semanasField('52 − férias − feriados. Ajuste se tira mais.'));
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
    body.appendChild(semanasField('52 − férias − feriados'));
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
    'Um cartão por ' + m.calcRowNoun + ': responda poucas perguntas e veja o preço certo na hora. Os detalhes ficam em "Mais detalhes". Os marcados "exemplo" são só ilustração — edite ou apague.');
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
    if (!r.matModo) r.matModo = 'auto';
    const root = el('div', {class:'svc-card'});

    // cabeçalho
    const head = el('div', {class:'svc-head'});
    const nome = el('input', {class:'inp text-left svc-nome', value:r.nome||'', placeholder:'nome do procedimento'});
    nome.addEventListener('input', () => { r.nome = nome.value; delete r._example; persist(); });
    head.appendChild(nome);
    if (r._example) head.appendChild(exampleBadge());
    head.appendChild(el('button', {class:'row-del', title:'remover procedimento', onclick:()=>{ st.calcular.splice(i,1); persist(); rebuild(); }}, ['✕']));
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
    mat.appendChild(el('label', {}, ['Material usado']));
    const modes = el('div', {class:'svc-seg'});
    const auto = r.matModo !== 'valor';
    const bAuto = el('button', {type:'button', class: auto ? 'on' : ''}, ['Automático']);
    const bValor = el('button', {type:'button', class: auto ? '' : 'on'}, ['Valor próprio']);
    bAuto.addEventListener('click', () => { r.matModo = 'auto'; persist(); rebuild(); });
    bValor.addEventListener('click', () => { r.matModo = 'valor'; persist(); rebuild(); });
    modes.appendChild(bAuto); modes.appendChild(bValor);
    mat.appendChild(modes);
    if (auto){
      mat.appendChild(el('div', {class:'help', style:'margin:0;'}, [el('b', {id:'svc-mat-'+i, class:'mono', style:'color:var(--ink);font-size:14px;'}, ['']), ' ', el('span', {id:'svc-mat-conta-'+i}, [''])]));
      if (!parseBR(st.materialMensal)){
        mat.appendChild(el('div', {class:'help'}, ['Informe o gasto mensal com materiais pra calcular. ',
          el('button', {class:'btn btn-secondary btn-sm', type:'button', onclick:()=>goStep('insumos')}, ['Ir para Insumos'])]));
      }
    } else {
      mat.appendChild(numberInput({value:r.insumos||0, kind:'brl', onInput:(n)=>{ r.insumos=n; persist(); refreshAll(); }}));
      mat.appendChild(el('div', {class:'help'}, ['Pra serviços que gastam bem mais (ou menos) que a média.']));
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
  const addBtn = el('button', {class:'btn btn-primary btn-sm', type:'button'}, ['+ Adicionar procedimento']);
  const picker = el('div', {class:'svc-picker', style:'display:none;'});
  addBtn.addEventListener('click', () => { picker.style.display = picker.style.display === 'none' ? '' : 'none'; });
  const novo = (nome, min) => {
    st.calcular.push({nome, atend:0, dur:min/60, insumos:0, outros:0, impostos:g.impostos, repasse:0, comissao:g.comissao, cartao:g.cartao, margem:g.margem,
      usaPadrao:true, matModo:'auto', cobraHoje:0});
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
      setTxt('svc-mat-conta-'+i, parseBR(st.materialMensal) ? '(' + fmtBRL(taxaMaterialHora(st)) + '/h × ' + fmtNum(parseBR(c.dur)*60, 0) + ' min)' : '');
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

const MODALIDADES = ['1:1','GRUPO','GRAVADO','MISTO','EVENTO','COMUNIDADE'];
const SEM_POR_MES = 52 / 12;
// Comunidade por assinatura: lives semanais + trilhas de aulas gravadas + moderação.
// As horas de produzir cada trilha são diluídas nos meses em que ela vai ser usada.
function comunidadeDefault(){
  return {livesSemana:1, duracaoLive:1.5, prepLive:1, moderacaoSemana:2, trilhas:[
    {nome:'IA no seu negócio', aulas:8, horasAula:2, meses:12},
    {nome:'Gestão de negócio', aulas:10, horasAula:2, meses:12},
  ]};
}
function comunidadeHoras(cfg){
  const lives = (parseBR(cfg.livesSemana)||0) * SEM_POR_MES;
  const vivo = lives * (parseBR(cfg.duracaoLive)||0);
  const prepLives = lives * (parseBR(cfg.prepLive)||0);
  const trilhas = (cfg.trilhas||[]).map(t => {
    const total = (parseBR(t.aulas)||0) * (parseBR(t.horasAula)||0);
    return {nome:t.nome, total, mes: safeDiv(total, Math.max(1, parseBR(t.meses)||1))};
  });
  const prepTrilhas = trilhas.reduce((s,t)=>s+t.mes, 0);
  const suporte = (parseBR(cfg.moderacaoSemana)||0) * SEM_POR_MES;
  return {lives, vivo, prepLives, prepTrilhas, trilhas, prep: prepLives + prepTrilhas, suporte, total: vivo + prepLives + prepTrilhas + suporte};
}
const FREQUENCIAS = [[1,'Todo mês'],[2,'A cada 2 meses'],[3,'Trimestral (a cada 3 meses)'],[4,'A cada 4 meses'],[6,'Semestral'],[12,'Anual']];


function abrirComunidade(r, onDone){
  const cfg = JSON.parse(JSON.stringify(r.comunidade || comunidadeDefault()));
  const overlay = el('div', {class:'modal-overlay'});
  const box = el('div', {class:'modal-box', role:'dialog', 'aria-label':'Montar comunidade'});
  overlay.appendChild(box);
  const onKey = (e) => { if (e.key === 'Escape') fechar(); };
  const fechar = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(); });
  box.appendChild(el('div', {class:'modal-head'}, [el('h3', {}, ['Montar comunidade']),
    el('button', {class:'row-del', type:'button', title:'fechar', onclick:fechar}, ['✕'])]));
  box.appendChild(el('p', {class:'help', style:'margin:0 0 10px;'}, ['Conte o que acontece dentro da comunidade. O Precifica transforma tudo em horas por mês — e o preço sai por membro, por mês (assinatura).']));

  const campo = (label, help, key, dec) => el('div', {class:'field-row'}, [
    el('label', {}, [label, help ? el('div',{class:'help'},[help]) : null]),
    numberInput({value:cfg[key], kind:'num', dec:dec, onInput:(n)=>{ cfg[key]=n; upd(); }}),
  ]);
  box.appendChild(el('div', {class:'cat-title'}, ['Lives com os inscritos']));
  box.appendChild(campo('Lives por semana', null, 'livesSemana', 1));
  box.appendChild(campo('Duração de cada live (horas)', null, 'duracaoLive', 1));
  box.appendChild(campo('Preparação de cada live (horas)', 'Roteiro, slides, convidados.', 'prepLive', 1));

  box.appendChild(el('div', {class:'cat-title', style:'margin-top:14px;'}, ['Trilhas de aulas gravadas']));
  box.appendChild(el('p', {class:'help', style:'margin:0 0 6px;'}, ['O tempo de produzir cada trilha é diluído nos meses em que ela vai servir aos membros.']));
  const lista = el('div');
  box.appendChild(lista);
  function drawTrilhas(){
    lista.innerHTML = '';
    lista.appendChild(el('div', {class:'trilha-row trilha-head'}, [el('span',{},['Trilha']), el('span',{},['Nº de aulas']), el('span',{},['Horas pra produzir cada aula']), el('span',{},['Diluir em (meses)']), el('span')]));
    cfg.trilhas.forEach((t, k) => {
      const nome = el('input', {class:'inp text-left', value:t.nome||'', placeholder:'ex.: IA no seu negócio'});
      nome.addEventListener('input', () => { t.nome = nome.value; });
      lista.appendChild(el('div', {class:'trilha-row'}, [
        nome,
        numberInput({value:t.aulas, kind:'num', dec:0, onInput:(n)=>{ t.aulas=n; upd(); }}),
        numberInput({value:t.horasAula, kind:'num', dec:1, onInput:(n)=>{ t.horasAula=n; upd(); }}),
        numberInput({value:t.meses, kind:'num', dec:0, onInput:(n)=>{ t.meses=n; upd(); }}),
        el('button', {class:'row-del', type:'button', title:'remover trilha', onclick:()=>{ cfg.trilhas.splice(k,1); drawTrilhas(); upd(); }}, ['✕']),
      ]));
    });
    lista.appendChild(el('button', {class:'btn btn-secondary btn-sm', type:'button', style:'margin-top:4px;', onclick:()=>{
      cfg.trilhas.push({nome:'', aulas:6, horasAula:2, meses:12}); drawTrilhas(); upd();
    }}, ['+ Adicionar trilha']));
  }
  drawTrilhas();

  box.appendChild(el('div', {class:'cat-title', style:'margin-top:14px;'}, ['Dia a dia da comunidade']));
  box.appendChild(campo('Moderação e suporte (horas por semana)', 'Responder dúvidas, postar, animar a comunidade.', 'moderacaoSemana', 1));

  const res = el('div', {class:'sem-conta'});
  box.appendChild(res);
  const aplicar = el('button', {class:'btn btn-primary', type:'button'}, ['Usar essas horas']);
  box.appendChild(el('div', {style:'display:flex;justify-content:flex-end;gap:8px;margin-top:14px;'}, [
    el('button', {class:'btn btn-secondary', type:'button', onclick:fechar}, ['Cancelar']), aplicar]));
  function upd(){
    const hrs = comunidadeHoras(cfg);
    res.innerHTML = 'Por mês: <b>' + fmtNum(hrs.vivo,1) + ' h</b> de lives (' + fmtNum(hrs.lives,1) + ' lives) + <b>' + fmtNum(hrs.prep,1) + ' h</b> de preparação ('
      + fmtNum(hrs.prepLives,1) + ' h das lives + ' + fmtNum(hrs.prepTrilhas,1) + ' h das trilhas) + <b>' + fmtNum(hrs.suporte,1) + ' h</b> de moderação = <b class="sem-res">'
      + fmtNum(hrs.total,1) + ' horas por mês</b>.'
      + (hrs.trilhas.length ? '<br><span class="help" style="margin:0;">' + hrs.trilhas.map(t => (t.nome||'Trilha') + ': ' + fmtNum(t.total,0) + ' h no total → ' + fmtNum(t.mes,1) + ' h/mês').join(' · ') + '</span>' : '');
  }
  aplicar.addEventListener('click', () => {
    const hrs = comunidadeHoras(cfg);
    r.comunidade = cfg;
    r.horasVivoAluno = 0;
    r.horasVivoGrupo = Math.round(hrs.vivo*10)/10;
    r.horasPrep = Math.round(hrs.prep*10)/10;
    r.horasSuporte = Math.round(hrs.suporte*10)/10;
    r.frequencia = 1;
    persist(); if (onDone) onDone(); fechar();
  });
  upd();
  document.body.appendChild(overlay);
}


/* ===================== Cartões genéricos (Produto e Conhecimento) ===================== */
// Peças reaproveitadas pelos dois modelos: pergunta, linha de detalhe, resultado.
function cardQ(label, help, input){
  return el('div', {class:'svc-q'}, [el('label', {}, [label, help ? el('div',{class:'help'},[help]) : null]), input]);
}
function cardDet(label, help, input){
  return el('div', {class:'field-row'}, [el('label', {}, [label, help ? el('div',{class:'help'},[help]) : null]), input]);
}
function cardDiffHtml(dif, porMes, unidadeTxt){
  if (dif > 0.5) return 'Você cobra <b>' + fmtBRL(dif) + ' a menos</b> que o preço certo' + (porMes > 0 ? ' — <b>' + fmtBRL(porMes) + ' por mês</b> que ficam na mesa.' : '.');
  return '👍 Seu preço atual já cobre o preço certo' + (unidadeTxt ? ' ' + unidadeTxt : '') + '.';
}

/* ======================= PRODUTO FÍSICO (cartões) ======================= */

function statusProduto(st){
  if (st === 'otimo') return '🟢 Ótimo: o preço é 3× ou mais o custo.';
  if (st === 'ok') return '🟡 OK: o preço é entre 2× e 3× o custo.';
  if (st === 'baixo') return '🔴 Atenção: preço menor que 2× o custo — sobra pouco.';
  return 'Preencha quantas unidades vende por mês pra ver o resultado.';
}

function buildCalcProduto(wrap, body){
  const st = APP.state;
  wrap.className = 'svc-wrap';
  const $ = (id) => document.getElementById(id);
  const setTxt = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  const calc = () => computeCalcAll('produto', st.calcular, computeHora('produto', st), st);
  const list = el('div', {class:'svc-list'});
  wrap.appendChild(list);

  function rebuild(){ list.innerHTML = ''; st.calcular.forEach((r, i) => list.appendChild(card(r, i))); refreshAll(); }

  function card(r, i){
    const root = el('div', {class:'svc-card'});
    const head = el('div', {class:'svc-head'});
    const nome = el('input', {class:'inp text-left svc-nome', value:r.nome||'', placeholder:'nome do produto'});
    nome.addEventListener('input', () => { r.nome = nome.value; delete r._example; persist(); });
    head.appendChild(nome);
    if (r._example) head.appendChild(exampleBadge());
    head.appendChild(el('button', {class:'row-del', title:'remover produto', onclick:()=>{ st.calcular.splice(i,1); persist(); rebuild(); }}, ['✕']));
    root.appendChild(head);

    const cols = el('div', {class:'svc-cols'});
    const qs = el('div', {class:'svc-qs'});
    qs.appendChild(cardQ('Quantas unidades vende por mês?', null, numberInput({value:r.unidades, kind:'num', dec:0, onInput:(n)=>{ r.unidades=n; persist(); refreshAll(); }})));
    qs.appendChild(cardQ('Tempo pra fazer 1 unidade (minutos)', 'Cortar, montar, embalar…', numberInput({value:Math.round(parseBR(r.tempo)*60), kind:'num', dec:0, onInput:(n)=>{ r.tempo = n/60; persist(); refreshAll(); }})));
    const mp = el('div', {style:'display:flex;gap:6px;align-items:center;'});
    const mpInp = numberInput({value:r.materiaPrima, kind:'brl', onInput:(n)=>{ r.materiaPrima=n; persist(); refreshAll(); }});
    mp.appendChild(mpInp);
    const calcBtn = el('button', {class:'btn-ghost btn-sm', type:'button', title:'somar a partir da matéria-prima', style:'padding:6px 8px;'}, ['🧮']);
    calcBtn.addEventListener('click', (e) => openInsumoPopover(e.currentTarget, (total) => {
      r.materiaPrima = total; persist(); mpInp.querySelector('input').value = fmtNum(total,2); refreshAll();
    }));
    mp.appendChild(calcBtn);
    qs.appendChild(cardQ('Matéria-prima de 1 unidade (R$)', 'Use a 🧮 pra somar a partir da sua lista.', mp));
    qs.appendChild(cardQ('Quanto você cobra hoje? (R$)', 'Deixe 0 se ainda não vende.', numberInput({value:r.cobraHoje||0, kind:'brl', onInput:(n)=>{ r.cobraHoje=n; persist(); refreshAll(); }})));
    cols.appendChild(qs);

    const res = el('div', {class:'svc-res'});
    res.appendChild(el('div', {class:'svc-res-lbl'}, ['Preço de venda certo']));
    res.appendChild(el('div', {class:'svc-res-val', id:'pd-preco-'+i}, ['']));
    res.appendChild(el('div', {class:'svc-res-line'}, ['Custo total de 1 unidade: ', el('b', {id:'pd-custo-'+i, class:'mono'}, [''])]));
    res.appendChild(el('div', {class:'svc-res-line'}, ['Receita no mês: ', el('b', {id:'pd-receita-'+i, class:'mono'}, [''])]));
    res.appendChild(el('div', {class:'svc-status', id:'pd-status-'+i}, ['']));
    res.appendChild(el('div', {class:'svc-diff', id:'pd-diff-'+i, style:'display:none;'}));
    cols.appendChild(res);
    root.appendChild(cols);

    const det = el('details', {class:'svc-det'});
    det.appendChild(el('summary', {}, ['Mais detalhes (embalagem, frete, impostos, margem…)']));
    det.appendChild(cardDet('Embalagem por unidade (R$)', null, numberInput({value:r.embalagem||0, kind:'brl', onInput:(n)=>{ r.embalagem=n; persist(); refreshAll(); }})));
    det.appendChild(cardDet('Frete por unidade (R$)', 'Se você paga o frete.', numberInput({value:r.frete||0, kind:'brl', onInput:(n)=>{ r.frete=n; persist(); refreshAll(); }})));
    det.appendChild(cardDet('Outros custos por unidade (R$)', 'Etiqueta, brinde, tag…', numberInput({value:r.outros||0, kind:'brl', onInput:(n)=>{ r.outros=n; persist(); refreshAll(); }})));
    det.appendChild(cardDet('Impostos', null, numberInput({value:r.impostos||0, kind:'pct', onInput:(n)=>{ r.impostos=n; persist(); refreshAll(); }})));
    det.appendChild(cardDet('Comissão de venda', null, numberInput({value:r.comissao||0, kind:'pct', onInput:(n)=>{ r.comissao=n; persist(); refreshAll(); }})));
    det.appendChild(cardDet('Taxa da plataforma / marketplace', 'Shopee, Mercado Livre, maquininha…', numberInput({value:r.plataforma||0, kind:'pct', onInput:(n)=>{ r.plataforma=n; persist(); refreshAll(); }})));
    det.appendChild(cardDet('Margem de lucro desejada', 'Quanto DO PREÇO vira lucro.', numberInput({value:r.margem||0, kind:'pct', onInput:(n)=>{ r.margem=n; persist(); refreshAll(); }})));
    const info = el('div', {class:'svc-info'});
    [['Mão de obra','pd-mao-'],['Custo de produção','pd-custou-'],['Parte dos custos fixos','pd-rateio-'],['Markup','pd-markup-']].forEach(([l,id]) =>
      info.appendChild(el('div', {}, [el('span', {class:'help', style:'margin:0;'}, [l]), el('b', {class:'mono', id:id+i}, [''])])));
    det.appendChild(info);
    root.appendChild(det);
    return root;
  }

  const tot = el('div', {class:'svc-total'}, [
    el('div', {}, [el('span',{class:'help',style:'margin:0;'},['Unidades no mês']), el('b',{id:'pd-tot-unid',class:'mono'},[''])]),
    el('div', {}, [el('span',{class:'help',style:'margin:0;'},['Receita no mês']), el('b',{id:'pd-tot-receita',class:'mono'},[''])]),
    el('div', {}, [el('span',{class:'help',style:'margin:0;'},['Lucro no mês']), el('b',{id:'pd-tot-lucro',class:'mono',style:'color:var(--green-strong);'},[''])]),
    el('div', {id:'pd-tot-perda-box', style:'display:none;'}, [el('span',{class:'help',style:'margin:0;'},['Deixando na mesa por mês']), el('b',{id:'pd-tot-perda',class:'mono',style:'color:var(--red);'},[''])]),
  ]);

  function refreshAll(){
    const {rows, totals} = calc();
    let perda = 0;
    rows.forEach((c, i) => {
      setTxt('pd-preco-'+i, c._preco ? fmtBRL(c._preco) : '—');
      setTxt('pd-custo-'+i, fmtBRL(c._custoTotalUnitario));
      setTxt('pd-receita-'+i, fmtBRL(parseBR(c.unidades) * c._preco));
      setTxt('pd-status-'+i, statusProduto(c._status));
      const se = $('pd-status-'+i); if (se) se.className = 'svc-status st-' + (c._status||'none');
      setTxt('pd-mao-'+i, fmtBRL(c._maoObra));
      setTxt('pd-custou-'+i, fmtBRL(c._custoUnitario));
      setTxt('pd-rateio-'+i, fmtBRL(c._rateio));
      setTxt('pd-markup-'+i, fmtNum(c._markup,2) + '×');
      const d = $('pd-diff-'+i), hoje = parseBR(c.cobraHoje);
      if (d){
        if (hoje > 0 && c._preco > 0){
          const dif = c._preco - hoje, mes = Math.max(0, dif) * parseBR(c.unidades);
          if (dif > 0.5) perda += mes;
          d.style.display = ''; d.className = 'svc-diff ' + (dif > 0.5 ? 'falta' : 'ok');
          d.innerHTML = cardDiffHtml(dif, mes);
        } else d.style.display = 'none';
      }
    });
    setTxt('pd-tot-unid', fmtNum(totals.unidades, 0));
    setTxt('pd-tot-receita', fmtBRL(totals.receita));
    setTxt('pd-tot-lucro', fmtBRL(totals.lucroLiquido));
    const pb = $('pd-tot-perda-box'); if (pb) pb.style.display = perda > 0 ? '' : 'none';
    setTxt('pd-tot-perda', fmtBRL(perda));
  }

  wrap.appendChild(el('div', {class:'svc-add'}, [el('button', {class:'btn btn-primary btn-sm', type:'button', onclick:()=>{
    st.calcular.push({nome:'', unidades:0, materiaPrima:0, tempo:0, embalagem:0, frete:0, outros:0, impostos:.06, comissao:.1, plataforma:.05, margem:.4, cobraHoje:0});
    persist(); rebuild();
  }}, ['+ Adicionar produto'])]));
  wrap.appendChild(tot);
  body.appendChild(el('ul', {class:'note-list', style:'margin-top:16px;'}, [
    el('li', {}, ['O preço certo cobre matéria-prima, mão de obra, embalagem, frete, a sua parte dos custos fixos, impostos e taxas — e ainda deixa a margem que você escolheu.']),
    el('li', {}, ['Vende em marketplace (Shopee, Mercado Livre)? Coloque a taxa deles em "Mais detalhes → Taxa da plataforma".']),
  ]));
  rebuild();  requestAnimationFrame(refreshAll); // os elementos só existem na página depois do render
}

/* ======================= PROFISSIONAL DO CONHECIMENTO (cartões) ======================= */

function statusConhecimento(st){
  if (st === 'gravado') return '🎬 Gravado: não usa horas ao vivo — escala sem gastar seu tempo.';
  if (st === 'otimo') return '🟢 Ótimo: cada hora sua rende bem mais que o custo dela.';
  if (st === 'ok') return '🟡 OK: paga o seu tempo, mas sobra pouco.';
  if (st === 'baixo') return '🔴 Atenção: o lucro por hora não paga nem o custo da sua hora.';
  return 'Preencha quantos alunos por turma pra ver o resultado.';
}

function buildCalcConhecimento(wrap, body){
  const st = APP.state;
  wrap.className = 'svc-wrap';
  const $ = (id) => document.getElementById(id);
  const setTxt = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  const calc = () => computeCalcAll('conhecimento', st.calcular, computeHora('conhecimento', st), st);
  const list = el('div', {class:'svc-list'});
  wrap.appendChild(list);

  function rebuild(){ list.innerHTML = ''; st.calcular.forEach((r, i) => list.appendChild(card(r, i))); refreshAll(); }

  function card(r, i){
    const root = el('div', {class:'svc-card'});
    const head = el('div', {class:'svc-head'});
    const nome = el('input', {class:'inp text-left svc-nome', value:r.nome||'', placeholder:'nome da oferta'});
    nome.addEventListener('input', () => { r.nome = nome.value; delete r._example; persist(); });
    head.appendChild(nome);
    if (r._example) head.appendChild(exampleBadge());
    head.appendChild(el('button', {class:'row-del', title:'remover oferta', onclick:()=>{ st.calcular.splice(i,1); persist(); rebuild(); }}, ['✕']));
    root.appendChild(head);

    const cols = el('div', {class:'svc-cols'});
    const qs = el('div', {class:'svc-qs'});
    const mod = el('select', {class:'inp'});
    const NOMES_MOD = {'1:1':'Individual (1:1)', 'GRUPO':'Em grupo', 'GRAVADO':'Curso gravado', 'MISTO':'Misto (grupo + individual)', 'EVENTO':'Evento / workshop', 'COMUNIDADE':'Comunidade (assinatura)'};
    MODALIDADES.forEach(mo => mod.appendChild(el('option', {value:mo, selected: mo===r.modalidade ? 'selected' : null}, [NOMES_MOD[mo] || mo])));
    mod.addEventListener('change', () => {
      r.modalidade = mod.value;
      if (r.modalidade === 'EVENTO' && !(parseBR(r.frequencia) > 1)) r.frequencia = 3;
      if (r.modalidade === 'COMUNIDADE'){ r.frequencia = 1; persist(); rebuild(); abrirComunidade(r, rebuild); return; }
      persist(); rebuild();
    });
    qs.appendChild(cardQ('Formato', null, mod));
    const freq = el('select', {class:'inp'});
    const fAtual = Math.max(1, parseBR(r.frequencia) || 1);
    FREQUENCIAS.forEach(([n, l]) => freq.appendChild(el('option', {value:String(n), selected: n===fAtual ? 'selected' : null}, [l])));
    freq.addEventListener('change', () => { r.frequencia = Number(freq.value); persist(); refreshAll(); });
    if (r.modalidade !== 'COMUNIDADE') qs.appendChild(cardQ('Acontece', null, freq));
    const comunidade = r.modalidade === 'COMUNIDADE';
    qs.appendChild(cardQ(comunidade ? 'Membros pagantes por mês' : 'Alunos por turma / edição', null,
      numberInput({value:r.alunos, kind:'num', dec:0, onInput:(n)=>{ r.alunos=n; persist(); refreshAll(); }})));
    // horas: o que aparece depende do formato
    const mo = r.modalidade;
    if (comunidade){
      const n = (r.comunidade && r.comunidade.trilhas || []).length;
      qs.appendChild(cardQ('Lives, trilhas e moderação', null, el('button', {class:'btn btn-secondary btn-sm', type:'button', onclick:()=>abrirComunidade(r, rebuild)},
        ['🧩 Montar comunidade' + (r.comunidade ? ' (' + n + (n===1?' trilha':' trilhas') + ')' : '')])));
    } else {
      if (mo === '1:1' || mo === 'MISTO') qs.appendChild(cardQ('Horas ao vivo por aluno (na edição)', mo === '1:1' ? 'Ex.: 1h por semana em 1 mês = 4h.' : 'A parte individual.', numberInput({value:r.horasVivoAluno, kind:'num', dec:1, onInput:(n)=>{ r.horasVivoAluno=n; persist(); refreshAll(); }})));
      if (mo === 'GRUPO' || mo === 'MISTO' || mo === 'EVENTO') qs.appendChild(cardQ(mo === 'EVENTO' ? 'Horas do evento' : 'Horas ao vivo com a turma', 'Não multiplica por aluno.', numberInput({value:r.horasVivoGrupo, kind:'num', dec:1, onInput:(n)=>{ r.horasVivoGrupo=n; persist(); refreshAll(); }})));
      qs.appendChild(cardQ('Horas de preparação', mo === 'GRAVADO' ? 'Gravar, editar, atualizar (no mês).' : 'Roteiro, material, organização.', numberInput({value:r.horasPrep, kind:'num', dec:1, onInput:(n)=>{ r.horasPrep=n; persist(); refreshAll(); }})));
    }
    qs.appendChild(cardQ(comunidade ? 'Quanto cobra hoje por mês? (R$)' : 'Quanto você cobra hoje? (R$)', 'Por aluno. Deixe 0 se ainda não vende.', numberInput({value:r.cobraHoje||0, kind:'brl', onInput:(n)=>{ r.cobraHoje=n; persist(); refreshAll(); }})));
    cols.appendChild(qs);

    const res = el('div', {class:'svc-res'});
    res.appendChild(el('div', {class:'svc-res-lbl'}, [comunidade ? 'Preço certo por membro, por mês' : 'Preço certo por aluno']));
    res.appendChild(el('div', {class:'svc-res-val', id:'cn-preco-'+i}, ['']));
    res.appendChild(el('div', {class:'help', id:'cn-promo-'+i, style:'margin:-2px 0 6px;'}, ['']));
    res.appendChild(el('div', {class:'svc-res-line', id:'cn-receita-'+i}, ['']));
    res.appendChild(el('div', {class:'svc-res-line'}, ['Suas horas no mês: ', el('b', {id:'cn-horas-'+i, class:'mono'}, [''])]));
    res.appendChild(el('div', {class:'svc-status', id:'cn-status-'+i}, ['']));
    res.appendChild(el('div', {class:'svc-diff', id:'cn-diff-'+i, style:'display:none;'}));
    cols.appendChild(res);
    root.appendChild(cols);

    const det = el('details', {class:'svc-det'});
    det.appendChild(el('summary', {}, ['Mais detalhes (custos, taxas, margem, lote promocional…)']));
    if (!comunidade) det.appendChild(cardDet('Horas de suporte', 'Tirar dúvidas, corrigir tarefas, grupo de WhatsApp.', numberInput({value:r.horasSuporte, kind:'num', dec:1, onInput:(n)=>{ r.horasSuporte=n; persist(); refreshAll(); }})));
    det.appendChild(cardDet('Duração (meses)', 'Quanto tempo o aluno fica no programa. Só informativo.', numberInput({value:r.duracao, kind:'num', dec:0, onInput:(n)=>{ r.duracao=n; persist(); }})));
    det.appendChild(cardDet('Custo por aluno (R$)', 'Material, kit, apostila impressa…', numberInput({value:r.custoMaterial||0, kind:'brl', onInput:(n)=>{ r.custoMaterial=n; persist(); refreshAll(); }})));
    det.appendChild(cardDet('Custo fixo por edição (R$)', 'Local, coffee, equipe, ferramentas só deste programa.', numberInput({value:r.custoFixoPrograma||0, kind:'brl', onInput:(n)=>{ r.custoFixoPrograma=n; persist(); refreshAll(); }})));
    det.appendChild(cardDet('Taxa da plataforma', 'Hotmart/Kiwify ≈ 10%. Pix direto = 0%.', numberInput({value:r.plataforma||0, kind:'pct', onInput:(n)=>{ r.plataforma=n; persist(); refreshAll(); }})));
    det.appendChild(cardDet('Comissão de afiliados', null, numberInput({value:r.afiliados||0, kind:'pct', onInput:(n)=>{ r.afiliados=n; persist(); refreshAll(); }})));
    det.appendChild(cardDet('Impostos', null, numberInput({value:r.impostos||0, kind:'pct', onInput:(n)=>{ r.impostos=n; persist(); refreshAll(); }})));
    det.appendChild(cardDet('Margem de lucro desejada', 'Quanto DO PREÇO vira lucro.', numberInput({value:r.margem||0, kind:'pct', onInput:(n)=>{ r.margem=n; persist(); refreshAll(); }})));
    det.appendChild(el('div', {class:'cat-title', style:'margin-top:10px;'}, ['Lote promocional (primeiros inscritos, pré-venda, cupom)']));
    det.appendChild(cardDet('Desconto do lote', null, numberInput({value:r.descontoPromo||0, kind:'pct', onInput:(n)=>{ r.descontoPromo=n; persist(); refreshAll(); }})));
    det.appendChild(cardDet('% dos alunos que compram no lote', 'O preço cheio sobe o necessário pra compensar.', numberInput({value:r.pctPromo||0, kind:'pct', onInput:(n)=>{ r.pctPromo=n; persist(); refreshAll(); }})));
    const info = el('div', {class:'svc-info'});
    [['Custo do seu tempo (edição)','cn-ctempo-'],['Custo total (edição)','cn-ctot-'],['Custo por aluno','cn-caluno-'],['Receita por edição','cn-redicao-']].forEach(([l,id]) =>
      info.appendChild(el('div', {}, [el('span', {class:'help', style:'margin:0;'}, [l]), el('b', {class:'mono', id:id+i}, [''])])));
    det.appendChild(info);
    root.appendChild(det);
    return root;
  }

  const horaC0 = computeHora('conhecimento', st);
  const tot = el('div', {class:'svc-total'}, [
    el('div', {}, [el('span',{class:'help',style:'margin:0;'},['Alunos por mês (média)']), el('b',{id:'cn-tot-alunos',class:'mono'},[''])]),
    el('div', {}, [el('span',{class:'help',style:'margin:0;'},['Suas horas por mês']), el('b',{id:'cn-tot-horas',class:'mono'},[''])]),
    el('div', {}, [el('span',{class:'help',style:'margin:0;'},['Receita por mês (média)']), el('b',{id:'cn-tot-receita',class:'mono'},[''])]),
    el('div', {}, [el('span',{class:'help',style:'margin:0;'},['Lucro por mês (média)']), el('b',{id:'cn-tot-lucro',class:'mono',style:'color:var(--green-strong);'},[''])]),
    el('div', {id:'cn-tot-perda-box', style:'display:none;'}, [el('span',{class:'help',style:'margin:0;'},['Deixando na mesa por mês']), el('b',{id:'cn-tot-perda',class:'mono',style:'color:var(--red);'},[''])]),
  ]);

  function refreshAll(){
    const {rows, totals} = calc();
    let perda = 0;
    rows.forEach((c, i) => {
      const freq = c._freq || 1;
      setTxt('cn-preco-'+i, c._precoCheio ? fmtBRL(c._precoCheio) : '—');
      setTxt('cn-promo-'+i, c._temPromo ? 'Lote promocional: ' + fmtBRL(c._precoPromo) + ' (' + c._alunosPromo + (c._alunosPromo===1?' aluno':' alunos') + ')' : '');
      const rl = $('cn-receita-'+i);
      if (rl) rl.innerHTML = freq > 1
        ? 'Receita por edição: <b class="mono">' + fmtBRL(c._receita) + '</b> → <b class="mono">' + fmtBRL(c._receitaMes) + '</b> por mês (média)'
        : 'Receita no mês: <b class="mono">' + fmtBRL(c._receitaMes) + '</b>';
      setTxt('cn-horas-'+i, fmtNum(c._horasMes, 1) + ' h');
      setTxt('cn-status-'+i, statusConhecimento(c._status));
      const se = $('cn-status-'+i); if (se) se.className = 'svc-status st-' + (c._status||'none');
      setTxt('cn-ctempo-'+i, fmtBRL(c._custoTempo));
      setTxt('cn-ctot-'+i, fmtBRL(c._custoTotalMes));
      setTxt('cn-caluno-'+i, fmtBRL(c._custoPorAluno));
      setTxt('cn-redicao-'+i, fmtBRL(c._receita));
      const d = $('cn-diff-'+i), hoje = parseBR(c.cobraHoje);
      if (d){
        if (hoje > 0 && c._preco > 0){
          const dif = c._preco - hoje, mes = Math.max(0, dif) * c._alunosMes;
          if (dif > 0.5) perda += mes;
          d.style.display = ''; d.className = 'svc-diff ' + (dif > 0.5 ? 'falta' : 'ok');
          d.innerHTML = cardDiffHtml(dif, mes);
        } else d.style.display = 'none';
      }
    });
    setTxt('cn-tot-alunos', fmtNum(totals.alunos, 1));
    setTxt('cn-tot-horas', fmtNum(totals.horas, 1) + ' h de ' + fmtNum(horaC0.horasProdutivasMes || 0, 0) + ' h produtivas');
    setTxt('cn-tot-receita', fmtBRL(totals.receita));
    setTxt('cn-tot-lucro', fmtBRL(totals.lucroLiquido));
    const pb = $('cn-tot-perda-box'); if (pb) pb.style.display = perda > 0 ? '' : 'none';
    setTxt('cn-tot-perda', fmtBRL(perda));
  }

  wrap.appendChild(el('div', {class:'svc-add'}, [el('button', {class:'btn btn-primary btn-sm', type:'button', onclick:()=>{
    st.calcular.push({nome:'', modalidade:'GRUPO', frequencia:1, alunos:0, duracao:1, horasVivoAluno:0, horasVivoGrupo:0, horasPrep:0, horasSuporte:0,
      custoMaterial:0, custoFixoPrograma:0, plataforma:0, afiliados:0, impostos:.06, margem:.4, descontoPromo:0, pctPromo:0, cobraHoje:0});
    persist(); rebuild();
  }}, ['+ Adicionar oferta'])]));
  wrap.appendChild(tot);
  body.appendChild(el('ul', {class:'note-list', style:'margin-top:16px;'}, [
    el('li', {}, ['Cada cartão é UMA turma/edição. Em "Acontece", diga a frequência (todo mês, trimestral, anual…) — a receita é dividida pelos meses pra comparar com a sua meta.']),
    el('li', {}, ['Comunidade (assinatura): clique em "🧩 Montar comunidade" e informe lives semanais, trilhas de aulas gravadas e moderação. O preço sai por membro, por mês.']),
    el('li', {}, ['O preço garante sua margem. Se o mercado não paga, o ajuste é posicionamento, público ou formato — não rebaixar preço.']),
  ]));
  rebuild();  requestAnimationFrame(refreshAll); // os elementos só existem na página depois do render
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
  if (r.metaShare < 1){
    grid.appendChild(statTile(null,'🎯 Meta total (tudo que você precisa)', fmtBRL(r.metaTotal)));
    if (r.outrasRendas > 0) grid.appendChild(statTile(null,'💼 Outras rendas (CLT, investimentos…)', fmtBRL(r.outrasRendas)));
    grid.appendChild(statTile(null,'🎯 Parte desta frente (' + fmtNum(r.metaShare*100,0) + '% — ajuste na Visão geral)', fmtBRL(r.meta)));
    return;
  }
  if (r.outrasRendas > 0){
    grid.appendChild(statTile(null,'🎯 Meta total (tudo que você precisa)', fmtBRL(r.metaTotal)));
    grid.appendChild(statTile(null,'💼 Outras rendas (CLT, investimentos…)', fmtBRL(r.outrasRendas)));
    grid.appendChild(statTile(null,'🎯 Meta deste negócio', fmtBRL(r.meta)));
  } else {
    grid.appendChild(statTile(null,'🎯 Meta de lucro mensal', fmtBRL(r.meta)));
  }
}

// Linhas de preço de cada modelo (pro PDF e pra mensagem de aplicação).
function linhasPreco(model, r){
  return (r.calc.rows || []).filter(c => c.nome).map(c => {
    const certo = model === 'prestador' ? c._precoParticular : (model === 'conhecimento' ? c._precoCheio : c._preco);
    return {nome:c.nome, certo, hoje: parseBR(c.cobraHoje)||0};
  }).filter(l => l.certo > 0);
}
function textoNumeros(model, r){
  const linhas = linhasPreco(model, r).slice(0, 8).map(l => '- ' + l.nome + ': preço certo ' + fmtBRL(l.certo) + (l.hoje ? ' (cobro ' + fmtBRL(l.hoje) + ')' : ''));
  return 'Modelo: ' + MODELS[model].label + '\nMeta de lucro: ' + fmtBRL(r.meta) + '/mês\nLíquido projetado: ' + fmtBRL(r.liquido) + '/mês'
    + (r.perdaMensal > 0 ? '\nDeixando na mesa: ' + fmtBRL(r.perdaMensal) + '/mês' : '') + (linhas.length ? '\n' + linhas.join('\n') : '');
}
// Topo do Resumo: o número que importa, a aplicação e o PDF.
function resumoHero(model, r){
  const box = el('div', {class:'resumo-hero'});
  if (r.perdaMensal > 0){
    box.classList.add('perda');
    box.appendChild(el('div', {class:'lbl'}, ['💸 Você está deixando na mesa']));
    box.appendChild(el('div', {class:'val'}, [fmtBRL(r.perdaMensal)]));
    box.appendChild(el('div', {class:'lbl'}, ['por mês — ' + fmtBRL(r.perdaMensal * 12) + ' por ano, cobrando abaixo do preço certo.']));
  } else if (!r.bateMeta){
    box.classList.add('perda');
    box.appendChild(el('div', {class:'lbl'}, ['Faltam']));
    box.appendChild(el('div', {class:'val'}, [fmtBRL(r.diff)]));
    box.appendChild(el('div', {class:'lbl'}, ['por mês pra chegar na sua meta. Dica: preencha "Quanto você cobra hoje" nos ' + MODELS[model].calcTitle.toLowerCase() + ' pra ver quanto está deixando na mesa.']));
  } else {
    box.classList.add('ok');
    box.appendChild(el('div', {class:'lbl'}, ['✅ Seus preços batem a meta']));
    box.appendChild(el('div', {class:'val'}, ['+' + fmtBRL(r.diff)]));
    box.appendChild(el('div', {class:'lbl'}, ['por mês além do que você precisa.']));
  }
  box.appendChild(el('div', {class:'resumo-hero-btns'}, [
    el('button', {class:'btn btn-primary', type:'button', onclick:()=>aplicarDentistaCEO(textoNumeros(model, r))}, ['Quero ajuda pra crescer → aplicar para o DentistaCEO']),
    el('button', {class:'btn btn-secondary', type:'button', onclick:()=>imprimirResumo(model, r)}, ['📄 Baixar PDF (1 página)']),
    el('button', {class:'btn btn-secondary', type:'button', onclick:()=>{ APP.view='geral'; APP.model=null; APP.state=null; render(); }}, ['📊 Ver todas as frentes juntas']),
  ]));
  return box;
}
// PDF: monta uma folha só com o essencial e abre a impressão do navegador ("Salvar como PDF").
function imprimirResumo(model, r){
  const old = document.getElementById('print-sheet'); if (old) old.remove();
  const sheet = el('div', {id:'print-sheet'});
  const hoje = new Date().toLocaleDateString('pt-BR');
  sheet.appendChild(el('div', {class:'ps-head'}, [el('b', {}, ['Precifica · Método 4C']), el('span', {}, [MODELS[model].label + ' · ' + hoje])]));
  sheet.appendChild(el('h1', {}, ['A foto do meu negócio']));
  const kpis = [['Meta de lucro (mês)', fmtBRL(r.meta)], ['Receita projetada (mês)', fmtBRL(r.receita)], ['Líquido que sobra (mês)', fmtBRL(r.liquido)]];
  if (r.custoHora) kpis.push(['Custo da hora', fmtBRL(r.custoHora)]);
  if (r.perdaMensal > 0) kpis.push(['Deixando na mesa (mês)', fmtBRL(r.perdaMensal)]);
  sheet.appendChild(el('div', {class:'ps-kpis'}, kpis.map(([l,v]) => el('div', {}, [el('span', {}, [l]), el('b', {}, [v])]))));
  sheet.appendChild(el('p', {class:'ps-verdict'}, [r.bateMeta ? '✅ Bate a meta — sobra ' + fmtBRL(r.diff) + ' por mês.' : '❌ Ainda não bate a meta — faltam ' + fmtBRL(r.diff) + ' por mês.']));
  const linhas = linhasPreco(model, r);
  if (linhas.length){
    const t = el('table', {}, [el('thead', {}, [el('tr', {}, [el('th', {}, [MODELS[model].calcRowNoun.replace(/^./, c => c.toUpperCase())]), el('th', {}, ['Preço certo']), el('th', {}, ['Cobro hoje']), el('th', {}, ['Diferença'])])])]);
    const tb = el('tbody');
    linhas.forEach(l => tb.appendChild(el('tr', {}, [el('td', {}, [l.nome]), el('td', {}, [fmtBRL(l.certo)]), el('td', {}, [l.hoje ? fmtBRL(l.hoje) : '—']), el('td', {}, [l.hoje ? fmtBRL(l.certo - l.hoje) : '—'])])));
    t.appendChild(tb);
    sheet.appendChild(t);
  }
  sheet.appendChild(el('p', {class:'ps-foot'}, ['Preço certo = cobre seu tempo, os custos, impostos e taxas e ainda deixa a margem de lucro escolhida. Gerado no Precifica.']));
  document.body.appendChild(sheet);
  document.body.classList.add('imprimindo');
  const fim = () => { document.body.classList.remove('imprimindo'); sheet.remove(); window.removeEventListener('afterprint', fim); };
  window.addEventListener('afterprint', fim);
  setTimeout(() => window.print(), 50);
}

function renderStepResumo(panel){
  const model = APP.model;
  const r = computeResumo(model, APP.state);
  panelHead(panel, '📊 A foto do seu negócio', 'Resumo — Seus Números',
    'Olhe aqui antes de aceitar um novo cliente, mudar de preço ou decidir qualquer coisa importante.');
  const body = el('div', {class:'panel-body'});
  body.appendChild(resumoHero(model, r));
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

initApp();
