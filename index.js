const firebaseConfig = {
  apiKey: "AIzaSyCeDYL0fzSgAqDbbbss193DuKsa9Mo6_x0",
  authDomain: "ecofome-7da87.firebaseapp.com",
  projectId: "ecofome-7da87",
  storageBucket: "ecofome-7da87.firebasestorage.app",
  messagingSenderId: "14663886144",
  appId: "1:14663886144:web:170f44c9f77baeb5e706a5",
  measurementId: "G-2WX516DEBC",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const firebaseConfig = {
  apiKey: "COLE_AQUI_SUA_API_KEY",
  authDomain: "COLE_AQUI.firebaseapp.com",
  projectId: "COLE_AQUI_SEU_PROJECT_ID",
  storageBucket: "COLE_AQUI.appspot.com",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI_SEU_APP_ID",
};
// ============================================================

// ---- INICIALIZAÇÃO FIREBASE ----
let db = null;
let firebaseOk = false;

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  firebaseOk = true;
  setConnectionStatus(true);
} catch (e) {
  console.warn(
    "Firebase não configurado. Usando modo offline (localStorage).",
    e,
  );
  setConnectionStatus(false);
}

function setConnectionStatus(online) {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  if (!dot || !text) return;
  if (online) {
    dot.style.background = "#22c55e";
    text.textContent = "Online";
    dot.style.boxShadow = "0 0 6px #22c55e";
  } else {
    dot.style.background = "#f59e0b";
    text.textContent = "Modo offline";
    dot.style.boxShadow = "0 0 6px #f59e0b";
  }
}

// ============================================================
//  BANCO DE DADOS LOCAL (fallback quando Firebase não configurado)
// ============================================================
const DB_KEY = "ecofome_doacoes";

const SEED = [
  {
    id: "1",
    titulo: "Pão artesanal",
    descricao:
      "Sobrou do dia, ainda fresco. Ideal para café da manhã ou jantar.",
    quantidade: "15 unidades",
    categoria: "paes",
    validade_retirada: new Date(Date.now() + 4 * 3600000).toISOString(),
    estabelecimento: "Padaria Bom Gosto",
    endereco: "Rua das Flores, 123 – Centro, Uberaba/MG",
    telefone: "(34) 99111-2222",
    status: "disponivel",
    location: { lat: -19.748, lng: -47.931 },
    criado_em: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "2",
    titulo: "Marmitas de frango grelhado",
    descricao:
      "8 marmitas prontas com arroz, feijão, frango e salada. Feitas hoje.",
    quantidade: "8 marmitas",
    categoria: "refeicoes",
    validade_retirada: new Date(Date.now() + 2 * 3600000).toISOString(),
    estabelecimento: "Restaurante Sabor da Terra",
    endereco: "Av. Leopoldino de Oliveira, 450 – Mercês, Uberaba/MG",
    telefone: "(34) 98222-3333",
    status: "disponivel",
    location: { lat: -19.755, lng: -47.94 },
    criado_em: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "3",
    titulo: "Frutas mistas",
    descricao:
      "Bananas, maçãs e laranjas. Ligeiramente maduras, perfeitas para consumo imediato.",
    quantidade: "5 kg",
    categoria: "frutas",
    validade_retirada: new Date(Date.now() + 6 * 3600000).toISOString(),
    estabelecimento: "Mercadinho São Paulo",
    endereco: "Rua Getúlio Vargas, 88 – Abadia, Uberaba/MG",
    telefone: "(34) 97333-4444",
    status: "reservado",
    location: { lat: -19.76, lng: -47.925 },
    criado_em: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "4",
    titulo: "Iogurte natural e queijo minas",
    descricao:
      "Produtos próximos ao vencimento, mas em perfeitas condições. Laticínios frescos.",
    quantidade: "2 kg de queijo + 6 iogurtes",
    categoria: "laticinios",
    validade_retirada: new Date(Date.now() + 8 * 3600000).toISOString(),
    estabelecimento: "Supermercado Esperança",
    endereco: "Rua Rio de Janeiro, 702 – Nova Uberaba, Uberaba/MG",
    telefone: "(34) 96444-5555",
    status: "disponivel",
    location: { lat: -19.744, lng: -47.95 },
    criado_em: new Date(Date.now() - 10800000).toISOString(),
  },
];

// ---- CACHE LOCAL ----
let cacheLocal = [];

// ---- LEITURA DO BANCO ----
async function getDB() {
  if (firebaseOk && db) {
    try {
      const snap = await db
        .collection("doacoes")
        .orderBy("criado_em", "desc")
        .get();
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      cacheLocal = docs;
      return docs;
    } catch (e) {
      console.warn("Erro ao ler Firebase, usando cache local.", e);
      return cacheLocal.length ? cacheLocal : getSeedLocal();
    }
  }
  return getSeedLocal();
}

function getSeedLocal() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    localStorage.setItem(DB_KEY, JSON.stringify(SEED));
    return SEED;
  }
  return JSON.parse(raw);
}

function saveLocalDB(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

// ---- ESCUTA EM TEMPO REAL (Firebase) ----
// Atualiza o feed automaticamente quando outro usuário fizer uma doação
function iniciarListenerTempoReal() {
  if (!firebaseOk || !db) return;
  db.collection("doacoes")
    .orderBy("criado_em", "desc")
    .onSnapshot(
      (snap) => {
        cacheLocal = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderFeed();
        renderMapList();
        atualizarPinsDoMapa(cacheLocal);
        animarStats(cacheLocal);
      },
      (err) => {
        console.warn("Listener tempo real falhou:", err);
      },
    );
}

// ============================================================
//  CATEGORIAS
// ============================================================
const CATEGORIAS = {
  frutas: "🍎",
  paes: "🍞",
  refeicoes: "🍽️",
  laticinios: "🥛",
  outros: "📦",
};

// ============================================================
//  GEOCODIFICAÇÃO — Nominatim (gratuito, sem chave de API)
// ============================================================
let geocodeTimer = null;
let coordenadasForm = null; // salva as coordenadas detectadas para o cadastro
let previewMapInstance = null;
let previewMarker = null;

function debounceGeocode(endereco) {
  clearTimeout(geocodeTimer);
  if (endereco.length < 10) return;
  geocodeTimer = setTimeout(() => geocodificarEndereco(endereco), 900);
}

async function geocodificarEndereco(endereco) {
  const statusEl = document.getElementById("geocodeStatus");
  if (statusEl) {
    statusEl.innerHTML = `<span class="geocode-loading">🔍 Buscando localização...</span>`;
  }

  try {
    const query = encodeURIComponent(
      endereco + ", Uberaba, Minas Gerais, Brasil",
    );
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
    const data = await res.json();

    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      coordenadasForm = { lat, lng };

      if (statusEl) {
        statusEl.innerHTML = `<span class="geocode-ok">✅ Localização encontrada: ${data[0].display_name.split(",").slice(0, 3).join(", ")}</span>`;
      }

      // Mostra mini mapa de preview
      const wrapper = document.getElementById("previewMapWrapper");
      if (wrapper) {
        wrapper.style.display = "block";

        if (!previewMapInstance) {
          previewMapInstance = L.map("previewMap", {
            zoomControl: true,
            scrollWheelZoom: false,
          });
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap",
          }).addTo(previewMapInstance);
        }

        previewMapInstance.setView([lat, lng], 16);

        if (previewMarker) previewMapInstance.removeLayer(previewMarker);
        previewMarker = L.marker([lat, lng]).addTo(previewMapInstance);

        // Fix: o Leaflet precisa de invalidateSize quando o container estava oculto
        setTimeout(() => previewMapInstance.invalidateSize(), 100);
      }
    } else {
      coordenadasForm = null;
      if (statusEl) {
        statusEl.innerHTML = `<span class="geocode-warn">⚠️ Endereço não encontrado. Verifique o texto.</span>`;
      }
    }
  } catch (e) {
    console.warn("Erro na geocodificação:", e);
    coordenadasForm = null;
    if (statusEl) {
      statusEl.innerHTML = `<span class="geocode-warn">⚠️ Não foi possível buscar a localização agora.</span>`;
    }
  }
}

// ============================================================
//  MAPA PRINCIPAL — Leaflet + OpenStreetMap
// ============================================================
let mapaInstance = null;
const marcadoresDoMapa = {};

function iniciarMapaPrincipal() {
  if (mapaInstance) return; // já criado

  mapaInstance = L.map("map").setView([-19.748, -47.931], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(mapaInstance);
}

function atualizarPinsDoMapa(doacoes) {
  if (!mapaInstance) return;

  // Remove marcadores antigos que não existem mais
  Object.keys(marcadoresDoMapa).forEach((id) => {
    if (!doacoes.find((d) => d.id === id)) {
      mapaInstance.removeLayer(marcadoresDoMapa[id]);
      delete marcadoresDoMapa[id];
    }
  });

  doacoes.forEach((d) => {
    if (!d.location || !d.location.lat || !d.location.lng) return;

    const emoji = CATEGORIAS[d.categoria] || "📦";
    const corStatus =
      d.status === "disponivel"
        ? "#22c55e"
        : d.status === "reservado"
          ? "#f59e0b"
          : "#94a3b8";

    const icone = L.divIcon({
      className: "",
      html: `<div style="
        background:white;
        border:3px solid ${corStatus};
        border-radius:50%;
        width:38px;height:38px;
        display:flex;align-items:center;justify-content:center;
        font-size:1.1rem;
        box-shadow:0 2px 8px rgba(0,0,0,0.2);
        cursor:pointer;
      ">${emoji}</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -38],
    });

    if (marcadoresDoMapa[d.id]) {
      // Atualiza popup se já existe
      marcadoresDoMapa[d.id].setPopupContent(popupHTML(d));
    } else {
      const marker = L.marker([d.location.lat, d.location.lng], { icon: icone })
        .addTo(mapaInstance)
        .bindPopup(popupHTML(d));
      marcadoresDoMapa[d.id] = marker;
    }
  });
}

function popupHTML(d) {
  const isDisp = d.status === "disponivel";
  return `
    <div style="min-width:180px;font-family:sans-serif">
      <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px">${CATEGORIAS[d.categoria] || "📦"} ${d.titulo}</div>
      <div style="font-size:0.8rem;color:#64748b;margin-bottom:8px">${d.estabelecimento}</div>
      <div style="font-size:0.78rem;color:#475569">📍 ${d.endereco}</div>
      <div style="font-size:0.78rem;color:#475569">📦 ${d.quantidade}</div>
      <div style="font-size:0.78rem;color:#475569;margin-bottom:8px">⏰ Até ${formatarData(d.validade_retirada)}</div>
      <button onclick="abrirModal('${d.id}')"
        style="width:100%;padding:7px;background:${isDisp ? "#22c55e" : "#94a3b8"};color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:0.82rem">
        ${isDisp ? "Ver e Reservar" : statusLabel(d.status)}
      </button>
    </div>
  `;
}

// ============================================================
//  ESTADO
// ============================================================
let filtroAtual = "todas";
let buscaAtual = "";
let doacoesCache = [];

// ============================================================
//  TABS
// ============================================================
function showTab(tab) {
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelectorAll(".bnav-btn")
    .forEach((b) => b.classList.remove("active"));

  document.getElementById(`tab-${tab}`).classList.add("active");

  const navBtns = document.querySelectorAll(".nav-btn");
  const tabIndex = { feed: 0, doar: 1, mapa: 2 };
  if (navBtns[tabIndex[tab]]) navBtns[tabIndex[tab]].classList.add("active");

  const bnav = document.getElementById(`bnav-${tab}`);
  if (bnav) bnav.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (tab === "feed") renderFeed();
  if (tab === "mapa") {
    iniciarMapaPrincipal();
    renderMapList();
    // Leaflet precisa de invalidateSize quando o container estava oculto
    setTimeout(() => mapaInstance && mapaInstance.invalidateSize(), 200);
  }
}

// ---- MENU MOBILE ----
function toggleMenu() {
  document.getElementById("mobileMenu").classList.toggle("open");
}

// ============================================================
//  FEED
// ============================================================
async function renderFeed() {
  const list = document.getElementById("feed-list");
  const empty = document.getElementById("emptyState");

  list.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>Carregando...</p></div>`;

  const db = await getDB();
  doacoesCache = db;

  let items = db.filter((d) => {
    const matchFiltro = filtroAtual === "todas" || d.status === filtroAtual;
    const matchBusca =
      !buscaAtual ||
      d.titulo.toLowerCase().includes(buscaAtual) ||
      d.estabelecimento.toLowerCase().includes(buscaAtual) ||
      (d.descricao || "").toLowerCase().includes(buscaAtual);
    return matchFiltro && matchBusca;
  });

  items.sort((a, b) => {
    if (a.status === "disponivel" && b.status !== "disponivel") return -1;
    if (a.status !== "disponivel" && b.status === "disponivel") return 1;
    return new Date(b.criado_em) - new Date(a.criado_em);
  });

  if (items.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  list.innerHTML = items.map((d) => cardHTML(d)).join("");
}

function cardHTML(d) {
  const emoji = CATEGORIAS[d.categoria] || "📦";
  const validadeStr = formatarData(d.validade_retirada);
  const tempoStr = tempoRelativo(d.criado_em);
  const isDisp = d.status === "disponivel";

  return `
    <div class="donation-card" onclick="abrirModal('${d.id}')">
      <div class="card-top">
        <span class="card-emoji">${emoji}</span>
        <div style="flex:1">
          <div class="card-title">${d.titulo}</div>
          <div class="card-desc">${d.descricao || "Sem descrição."}</div>
        </div>
        <span class="status-badge status-${d.status}">${statusLabel(d.status)}</span>
      </div>
      <div class="card-meta">
        <div class="meta-item"><span class="material-icons-round">inventory_2</span>${d.quantidade}</div>
        <div class="meta-item"><span class="material-icons-round">storefront</span>${d.estabelecimento}</div>
        <div class="meta-item"><span class="material-icons-round">schedule</span>Até ${validadeStr}</div>
        <div class="meta-item"><span class="material-icons-round">access_time</span>${tempoStr}</div>
      </div>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="btn-reserve" onclick="reservar('${d.id}')" ${!isDisp ? "disabled" : ""}>
          <span class="material-icons-round">${isDisp ? "check_circle" : "block"}</span>
          ${isDisp ? "Reservar" : d.status === "reservado" ? "Reservado" : "Entregue"}
        </button>
        <button class="btn-details" onclick="abrirModal('${d.id}')">
          <span class="material-icons-round">info</span>
        </button>
      </div>
    </div>
  `;
}

function statusLabel(s) {
  const map = {
    disponivel: "✅ Disponível",
    reservado: "🔒 Reservado",
    entregue: "✔️ Entregue",
  };
  return map[s] || s;
}

function formatarData(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tempoRelativo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora mesmo";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)} dia(s)`;
}

// ---- FILTRO + BUSCA ----
function filterDoacoes(status, btn) {
  filtroAtual = status;
  document
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderFeed();
}

function searchDoacoes(val) {
  buscaAtual = val.toLowerCase().trim();
  renderFeed();
}

// ============================================================
//  MODAL
// ============================================================
async function abrirModal(id) {
  // Tenta usar cache primeiro para abrir rápido
  let d = doacoesCache.find((x) => x.id === id);

  // Se não estiver no cache, busca direto no Firebase
  if (!d && firebaseOk && db) {
    try {
      const doc = await db.collection("doacoes").doc(id).get();
      if (doc.exists) d = { id: doc.id, ...doc.data() };
    } catch (e) {
      console.warn(e);
    }
  }
  if (!d) return;

  const emoji = CATEGORIAS[d.categoria] || "📦";
  const isDisp = d.status === "disponivel";

  document.getElementById("modal-content").innerHTML = `
    <div class="modal-emoji">${emoji}</div>
    <div class="modal-title">${d.titulo}</div>
    <span class="status-badge status-${d.status}" style="display:inline-block;margin-bottom:12px">${statusLabel(d.status)}</span>
    <div class="modal-desc">${d.descricao || "Sem descrição adicional."}</div>
    <div class="modal-info-grid">
      <div class="modal-info-item">
        <div class="modal-info-label">Quantidade</div>
        <div class="modal-info-val">${d.quantidade}</div>
      </div>
      <div class="modal-info-item">
        <div class="modal-info-label">Retirar até</div>
        <div class="modal-info-val">${formatarData(d.validade_retirada)}</div>
      </div>
      <div class="modal-info-item">
        <div class="modal-info-label">Estabelecimento</div>
        <div class="modal-info-val">${d.estabelecimento}</div>
      </div>
      <div class="modal-info-item">
        <div class="modal-info-label">Telefone</div>
        <div class="modal-info-val">${d.telefone || "Não informado"}</div>
      </div>
    </div>
    <div class="modal-info-item" style="margin-bottom:16px">
      <div class="modal-info-label">Endereço</div>
      <div class="modal-info-val">${d.endereco}</div>
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn-reserve" style="flex:2" onclick="reservar('${d.id}'); closeModal()" ${!isDisp ? "disabled" : ""}>
        <span class="material-icons-round">${isDisp ? "check_circle" : "block"}</span>
        ${isDisp ? "Confirmar Reserva" : "Indisponível"}
      </button>
      ${
        d.telefone
          ? `
        <a href="https://wa.me/55${d.telefone.replace(/\D/g, "")}" target="_blank" style="text-decoration:none">
          <button class="btn-details" style="background:#25d366;color:white;border-color:#25d366">
            <span class="material-icons-round">chat</span>
          </button>
        </a>`
          : ""
      }
    </div>
  `;

  document.getElementById("modalOverlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}

// ============================================================
//  RESERVAR
// ============================================================
async function reservar(id) {
  if (firebaseOk && db) {
    try {
      const ref = db.collection("doacoes").doc(id);
      const doc = await ref.get();
      if (!doc.exists || doc.data().status !== "disponivel") {
        showToast("⚠️ Esta doação não está mais disponível.");
        return;
      }
      await ref.update({ status: "reservado" });
      showToast("🎉 Doação reservada! Vá buscar antes do prazo.");
      // O listener em tempo real vai atualizar o feed automaticamente
    } catch (e) {
      console.error("Erro ao reservar:", e);
      showToast("❌ Erro ao reservar. Tente novamente.");
    }
  } else {
    // Fallback: localStorage
    const localDB = getSeedLocal();
    const idx = localDB.findIndex((x) => x.id === id);
    if (idx === -1 || localDB[idx].status !== "disponivel") {
      showToast("⚠️ Esta doação não está mais disponível.");
      return;
    }
    localDB[idx].status = "reservado";
    saveLocalDB(localDB);
    renderFeed();
    renderMapList();
    showToast("🎉 Doação reservada! Vá buscar antes do prazo.");
  }
}

// ============================================================
//  CADASTRAR DOAÇÃO
// ============================================================
async function cadastrarDoacao(e) {
  e.preventDefault();

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<div class="loading-spinner" style="width:18px;height:18px;border-width:2px"></div> Publicando...`;

  const nova = {
    titulo: document.getElementById("titulo").value.trim(),
    descricao: document.getElementById("descricao").value.trim(),
    quantidade: document.getElementById("quantidade").value.trim(),
    categoria: document.getElementById("categoria").value,
    validade_retirada: document.getElementById("validade").value,
    estabelecimento: document.getElementById("estabelecimento").value.trim(),
    endereco: document.getElementById("endereco").value.trim(),
    telefone: document.getElementById("telefone").value.trim(),
    status: "disponivel",
    // Usa coordenadas detectadas pelo geocoder, ou ponto central de Uberaba como fallback
    location: coordenadasForm || { lat: -19.748, lng: -47.931 },
    criado_em: new Date().toISOString(),
  };

  if (firebaseOk && db) {
    try {
      await db.collection("doacoes").add(nova);
      showToast("✅ Doação publicada com sucesso! Todos podem ver agora.");
      resetForm();
      setTimeout(() => showTab("feed"), 800);
    } catch (e) {
      console.error("Erro ao salvar no Firebase:", e);
      showToast("❌ Erro ao publicar. Verifique sua conexão.");
    }
  } else {
    // Fallback: localStorage
    const localDB = getSeedLocal();
    nova.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    localDB.unshift(nova);
    saveLocalDB(localDB);
    showToast("✅ Doação publicada (modo offline).");
    resetForm();
    setTimeout(() => showTab("feed"), 800);
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = `<span class="material-icons-round">check_circle</span> Publicar Doação`;
}

function resetForm() {
  document.getElementById("donation-form").reset();
  coordenadasForm = null;
  const statusEl = document.getElementById("geocodeStatus");
  if (statusEl) statusEl.innerHTML = "";
  const wrapper = document.getElementById("previewMapWrapper");
  if (wrapper) wrapper.style.display = "none";
}

// ============================================================
//  MAPA — LISTA LATERAL
// ============================================================
async function renderMapList() {
  const container = document.getElementById("map-list");
  if (!container) return;

  const data = cacheLocal.length ? cacheLocal : await getDB();
  const disponiveis = data.filter((d) => d.status === "disponivel").slice(0, 8);

  container.innerHTML =
    disponiveis
      .map(
        (d) => `
    <div class="map-item" onclick="abrirModal('${d.id}'); if(marcadoresDoMapa['${d.id}']) marcadoresDoMapa['${d.id}'].openPopup()">
      <div class="map-item-title">${CATEGORIAS[d.categoria] || "📦"} ${d.titulo}</div>
      <div class="map-item-sub">${d.estabelecimento}</div>
      <div class="map-item-sub">Até ${formatarData(d.validade_retirada)}</div>
    </div>
  `,
      )
      .join("") ||
    "<p style='color:#94a3b8;font-size:0.85rem'>Nenhuma doação disponível.</p>";

  // Atualiza os pins no mapa com os dados atuais
  atualizarPinsDoMapa(data);
}

// ============================================================
//  STATS (animado)
// ============================================================
async function animarStats(dados) {
  const data = dados || (await getDB());
  const disponiveis = data.filter((d) => d.status === "disponivel").length;
  const total = data.length;
  const kg = Math.round(total * 3.2);

  animarNumero("stat-doacoes", disponiveis);
  animarNumero("stat-pessoas", total * 4);
  animarNumero("stat-kg", kg);
}

function animarNumero(id, alvo) {
  const el = document.getElementById(id);
  if (!el) return;
  let atual = 0;
  const step = Math.ceil(alvo / 40);
  const timer = setInterval(() => {
    atual = Math.min(atual + step, alvo);
    el.textContent = atual;
    if (atual >= alvo) clearInterval(timer);
  }, 30);
}

// ============================================================
//  TOAST
// ============================================================
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3500);
}

// ============================================================
//  INIT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Define validade mínima como agora
  const validadeInput = document.getElementById("validade");
  if (validadeInput) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    validadeInput.min = now.toISOString().slice(0, 16);
  }

  // Carrega dados e renderiza
  const dados = await getDB();
  doacoesCache = dados;

  renderFeed();
  renderMapList();
  animarStats(dados);

  // Inicia listener em tempo real (se Firebase estiver configurado)
  iniciarListenerTempoReal();
});
