// ===============================
//  APP.JS — MODO API REAL
//  Billar JADE — Frontend
// ===============================

// 1) URL de tu backend real en Render
const API_BASE_URL = 'https://billar-backend-1.onrender.com';

// 2) Config por defecto (si la API no responde)
const DEFAULT_CONFIG = {
  tarifaPorHora: 15,
  fraccionMinutos: 5,
  minimoMinutos: 30,
};

// 3) Estado global (expuesto por si tu UI lo usa)
const state = {
  branch: 'BILLAR JADE', // sucursal activa
  role: 'cajero',
  config: { ...DEFAULT_CONFIG },
  mesas: [],
  historial: [],
};
window.state = state; // para compatibilidad con funciones previas

// 4) Helpers DOM (opcionales)
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// 5) Helper de llamadas a la API (GET)
async function apiGet(path){
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url);
  if(!res.ok){
    const txt = await res.text().catch(()=> '');
    throw new Error(`Error API ${path}: ${res.status} ${txt}`);
  }
  return res.json();
}

// 6) Render de tarifas — usa tus funciones si existen; si no, rellena etiquetas simples
function renderTarifasFromState(){
  if (typeof renderTarifas === 'function') {
    // tu función original (si existe) pintará desde state.config
    try { renderTarifas(); return; } catch(_) {}
  }
  // respaldo: pinta en etiquetas si existen
  const elTarifa   = $('#lbl-tarifa, #tarifaValor, #lblTarifa');
  const elFrac     = $('#lbl-fraccion, #tarifaFraccion, #lblFraccion');
  const elMin      = $('#lbl-minimo, #tarifaMinimo, #lblMinimo');
  if (elTarifa) elTarifa.textContent = `${state.config.tarifaPorHora} Bs/h`;
  if (elFrac)   elFrac.textContent   = `${state.config.fraccionMinutos} min`;
  if (elMin)    elMin.textContent    = `${state.config.minimoMinutos} min`;
}

// 7) Render de mesas — intenta usar tu initMesas(); si no existe, pinta simple
function renderMesasFromState(){
  if (typeof initMesas === 'function') {
    try { initMesas(); return; } catch(_) {}
  }
  // Respaldo simple: requiere un contenedor con id #mesasGrid
  const grid = $('#mesasGrid') || $('#mesas') || $('#gridMesas');
  if (!grid) return;
  grid.innerHTML = '';
  state.mesas.forEach(m => {
    const card = document.createElement('div');
    card.className = 'mesa';
    card.innerHTML = `
      <div class="mesa-title">${m.nombre || `Mesa ${m.id}`}</div>
      <div class="mesa-time" id="time-${m.id}">00:00:00</div>
      <div class="mesa-estado ${m.estado || 'libre'}">${m.estado || 'libre'}</div>
    `;
    grid.appendChild(card);
  });
}

// 8) Carga inicial desde la API real
async function load(){
  try{
    const sucursalId = 1; // BILLAR JADE; si tienes selector, puedes leerlo aquí

    // 8.1 Tarifas
    const t = await apiGet(`/tarifas?sucursal_id=${sucursalId}`);
    state.config = {
      ...DEFAULT_CONFIG,
      tarifaPorHora: Number(t.price_per_hour_bs ?? DEFAULT_CONFIG.tarifaPorHora),
      fraccionMinutos: Number(t.fraction_minutes ?? DEFAULT_CONFIG.fraccionMinutos),
      minimoMinutos: Number(t.min_minutes ?? DEFAULT_CONFIG.minimoMinutos),
    };
    renderTarifasFromState();

    // 8.2 Mesas
    const mesas = await apiGet(`/mesas?sucursal_id=${sucursalId}`);
    // Normaliza estructura para que tu UI siga funcionando
    state.mesas = mesas.map(m => ({
      id: m.id,
      nombre: m.nombre || m.code || `Mesa ${m.id}`,
      estado: m.estado || 'libre',
      inicio: m.inicio || null,
      transcurrido: 0,
      consumo: m.consumo || []
    }));
    renderMesasFromState();

  }catch(e){
    console.error('Error cargando desde API:', e);
    // Si algo falla, se queda con DEFAULT_CONFIG y sin mesas
  }
}

// 9) Reloj (usa el mismo patrón que ya tenías: time-${id})
let intervalId = null;
function startTicker(){
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(()=>{
    const mesas = state.mesas || [];
    mesas.forEach(m=>{
      const el = document.getElementById(`time-${m.id}`);
      if (el) el.textContent = msToHMS(getMs(m));
    });
  }, 1000);
}
// -> utilidades de tiempo (ajusta a tu lógica real si ya las tienes)
function getMs(m){
  // ejemplo: si no manejas 'inicio', deja en 0
  return m.inicio ? (Date.now() - new Date(m.inicio).getTime()) : 0;
}
function msToHMS(ms){
  const s = Math.max(0, Math.floor(ms/1000));
  const hh = String(Math.floor(s/3600)).padStart(2,'0');
  const mm = String(Math.floor((s%3600)/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return `${hh}:${mm}:${ss}`;
}

// 10) Utilidades opcionales que tu código invoca (no hacen nada si no existen los nodos)
function aplicarTema(){ /* si ya tenías una, esta es neutra */ }
const branchSelect = $('#branchSelect') || { value: state.branch };
const roleSelect   = $('#roleSelect')   || { value: state.role   };
const adminPin     = $('#adminPin')     || { classList:{ toggle:()=>{} } };
const lblFecha     = $('#lblFecha')     || { textContent: '' };

// 11) INIT — asíncrono y usando la API real
// === CIERRE REAL: crea ticket en la base y recarga las mesas ===
async function confirmarCierreReal(opciones = {}) {
  try {
    // 1) Lee datos desde tu UI o usa valores por defecto
    const sucursal_id       = opciones.sucursal_id       ?? 1;                                // BILLAR JADE
    const mesa_id           = opciones.mesa_id           ?? (window.state?.mesaActual?.id || 1);
    const minutos_fact      = opciones.minutos_fact      ?? (window.state?.minutosFacturados || 0);
    const importe_tiempo    = Number(opciones.importe_tiempo ?? 0);   // si ya lo calculas en tu UI, pásalo aquí
    const consumo_total     = Number(opciones.consumo_total  ?? 0);   // idem
    const metodo_pago       = opciones.metodo_pago       ?? 'efectivo';
    const efectivo_recibido = Number(opciones.efectivo_recibido ?? (importe_tiempo + consumo_total));

    // 2) Llama al BACKEND REAL
    const res = await fetch(`${API_BASE_URL}/tickets/cerrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sucursal_id,
        mesa_id,
        minutos_fact,
        importe_tiempo,
        consumo_total,
        metodo_pago,
        efectivo_recibido
      })
    });
    if (!res.ok) {
      const txt = await res.text().catch(()=> '');
      throw new Error(`Error al cerrar ticket: ${res.status} ${txt}`);
    }
    const data = await res.json(); // { ok:true, ticket:{ id, created_at } }

    // 3) Refresca mesas desde la API para ver la mesa "libre"
    await load();

    alert(`Cierre realizado. Ticket #${data?.ticket?.id ?? ''}`);
  } catch(e) {
    console.error(e);
    alert('No se pudo cerrar el ticket: ' + e.message);
  }
}
(async function init(){
  try{
    // Preferencias/UI
    aplicarTema();
    branchSelect.value = state.branch;
    roleSelect.value   = state.role;
    adminPin.classList.toggle('hidden', roleSelect.value !== 'admin');

    // 🔑 CAMBIO CLAVE: pedir a la API y pintar
    await load();

    // Reloj y fecha
    startTicker();
    lblFecha.textContent = new Date().toLocaleDateString('es-BO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }catch(e){
    console.error('Init error:', e);
  }
})();
