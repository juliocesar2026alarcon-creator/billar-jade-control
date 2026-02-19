// URL de tu backend real en Render
const API_BASE_URL = 'https://billar-backend-1.onrender.com';
// === Estado y configuración ===
const DEFAULT_CONFIG = {
  tarifaPorHora: 15.0,
  fraccionMinutos: 5,
  minimoMinutos: 30,
  adminPIN: '2468',
  colorHex: '#16a34a'
};
const BRANCHES = ['BILLAR JADE', 'BILLAR JADE ANEXO'];
const MESAS_POR_SUCURSAL = 10;

let state = {
  branch: BRANCHES[0],
  role: 'cajero',
  config: { ...DEFAULT_CONFIG },
  mesas: {},
  // Historial por día (clave YYYY-MM-DD)
  historial: {}
};

const LS_KEY = 'billar_jade_advanced_state_v1';

function hoyKey(){
  return new Date().toISOString().slice(0,10); // YYYY-MM-DD
}

function initMesas(){
  BRANCHES.forEach(s=>{
    if(!state.mesas[s]){
      state.mesas[s] = Array.from({length:MESAS_POR_SUCURSAL}, (_,i)=>({
        id: i+1,
        status: 'libre',
        inicio: null,
        pausadoEn: null,
        acumuladoMs: 0
      }));
    }
  });
}

// Helper GET sencillo a tu API (si ya lo pegaste más arriba, no lo repitas)
async function apiGet(path){
  const res = await fetch(`${API_BASE_URL}${path}`);
  if(!res.ok) throw new Error(`Error API ${path}: ${res.status}`);
  return res.json();
}

// Carga inicial leyendo de la API real
async function load(){
  try{
    // Sucursal 1 (BILLAR JADE). Más adelante podemos leerlo del selector.
    const sucursalId = 1;

    // 1) Tarifas desde la API
    const t = await apiGet(`/tarifas?sucursal_id=${sucursalId}`);
    state.config = {
      ...DEFAULT_CONFIG,
      tarifaPorHora: Number(t.price_per_hour_bs || 15),
      fraccionMinutos: Number(t.fraction_minutes || 5),
      minimoMinutos: Number(t.min_minutes || 30),
    };

    // 2) Mesas desde la API
    const mesas = await apiGet(`/mesas?sucursal_id=${sucursalId}`);
    // Normalizar al formato que ya usa tu UI:
    state.mesas = mesas.map(m => ({
      id: m.id,
      nombre: m.nombre || m.code || `Mesa ${m.id}`,
      estado: (m.estado || 'libre'),
      inicio: null,
      transcurrido: 0,
      consumo: []
    }));

    // 3) Datos base para tu pantalla
    state.branch = 'BILLAR JADE';
    state.role = state.role || 'cajero';
    state.historial = state.historial || [];

    // 4) Pintar mesas
    initMesas();

  }catch(e){
    console.error('Error cargando desde API:', e);
    // Si algo falla, al menos inicializá la UI
    initMesas();
  }
}
}
function save(){
  try{localStorage.setItem(LS_KEY, JSON.stringify(state));}catch(e){}
}

function msToHMS(ms){
  const totalSec = Math.max(0, Math.floor(ms/1000));
  const h = Math.floor(totalSec/3600);
  const m = Math.floor((totalSec%3600)/60);
  const s = totalSec%60;
  const pad = n => String(n).padStart(2,'0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function calcularCobro(ms){
  const minutos = Math.ceil(ms/60000);
  let cobrables = Math.max(minutos, state.config.minimoMinutos);
  const f = state.config.fraccionMinutos;
  if(f>1){
    cobrables = Math.ceil(cobrables/f)*f;
  }
  const total = +(cobrables * (state.config.tarifaPorHora/60)).toFixed(2);
  return { minutos, minutosCobrables:cobrables, total };
}

// UI refs
const branchSelect = document.getElementById('branchSelect');
const roleSelect = document.getElementById('roleSelect');
const adminPin = document.getElementById('adminPin');
const btnIngresarRol = document.getElementById('btnIngresarRol');
const lblTarifa = document.getElementById('lblTarifa');
const lblFraccion = document.getElementById('lblFraccion');
const lblMinimo = document.getElementById('lblMinimo');
const btnConfig = document.getElementById('btnConfig');
const mesasGrid = document.getElementById('mesasGrid');
const lblFecha = document.getElementById('lblFecha');

const configModal = document.getElementById('configModal');
const cfgTarifa = document.getElementById('cfgTarifa');
const cfgFraccion = document.getElementById('cfgFraccion');
const cfgMinimo = document.getElementById('cfgMinimo');
const cfgPin = document.getElementById('cfgPin');
const cfgColor = document.getElementById('cfgColor');
const btnGuardarConfig = document.getElementById('btnGuardarConfig');
const btnCancelarConfig = document.getElementById('btnCancelarConfig');

const ticketModal = document.getElementById('ticketModal');
const ticketBody = document.getElementById('ticketBody');
const btnImprimirTicket = document.getElementById('btnImprimirTicket');
const btnCerrarTicket = document.getElementById('btnCerrarTicket');
const btnExportarPDF = document.getElementById('btnExportarPDF');

const historialModal = document.getElementById('historialModal');
const historialTabla = document.getElementById('historialTabla');
const btnCerrarHistorial = document.getElementById('btnCerrarHistorial');
const btnExportarCSV = document.getElementById('btnExportarCSV');

const reporteModal = document.getElementById('reporteModal');
const reporteBody = document.getElementById('reporteBody');
const btnCerrarReporte = document.getElementById('btnCerrarReporte');

const cajaModal = document.getElementById('cajaModal');
const cajaBody = document.getElementById('cajaBody');
const btnCerrarCaja = document.getElementById('btnCerrarCaja');
const btnConfirmarCierre = document.getElementById('btnConfirmarCierre');
const btnHistorial = document.getElementById('btnHistorial');
const btnReporte = document.getElementById('btnReporte');

let intervalId=null;

function aplicarTema(){
  document.documentElement.style.setProperty('--color', state.config.colorHex || DEFAULT_CONFIG.colorHex);
}

function renderTarifas(){
  lblTarifa.textContent = `${state.config.tarifaPorHora.toFixed(2)} Bs/h`;
  lblFraccion.textContent = `Fracción: ${state.config.fraccionMinutos} min`;
  lblMinimo.textContent = `Mínimo: ${state.config.minimoMinutos} min`;
  btnConfig.disabled = (state.role !== 'admin');
}

function getMs(m){
  let base = m.acumuladoMs;
  if(m.status==='ocupada' && m.inicio){
    base += Date.now()-m.inicio;
  }
  return base;
}

function mkBtn(text, onClick, variant){
  const b = document.createElement('button');
  b.className = 'btn' + (variant? ' ' + variant : '');
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

function renderMesas(){
  const mesas = state.mesas[state.branch];
  mesasGrid.innerHTML = '';
  mesas.forEach(m=>{
    const card = document.createElement('div');
    card.className = 'card';

    const header = document.createElement('div');
    header.className='card-header';
    const title = document.createElement('strong');
    title.textContent = `Mesa ${m.id}`;
    const badge = document.createElement('span');
    badge.className = 'badge ' + (m.status==='libre'?'free':'busy');
    badge.textContent = (m.status==='libre')? 'Libre' : (m.status==='ocupada'? 'En uso' : 'Pausada');
    header.append(title,badge);

    const timeRow = document.createElement('div');
    timeRow.className='row gap';
    timeRow.innerHTML = `<span>Transcurrido:</span><span class="time" id="time-${m.id}">${msToHMS(getMs(m))}</span>`;

    const controls = document.createElement('div');
    controls.className='controls-row';

    const btnIniciar = mkBtn('Iniciar', ()=>iniciarMesa(m.id));
    const btnPausar = mkBtn('Pausar', ()=>pausarMesa(m.id),'outline');
    const btnReanudar = mkBtn('Reanudar', ()=>reanudarMesa(m.id));
    const btnCobrar = mkBtn('Detener y Cobrar', ()=>cobrarMesa(m.id));

    if(m.status==='libre') controls.append(btnIniciar);
    else if(m.status==='ocupada') controls.append(btnPausar, btnCobrar);
    else controls.append(btnReanudar, btnCobrar);

    // Info cobro estimado
    if(m.status!=='libre'){
      const calc = calcularCobro(getMs(m));
      const info = document.createElement('div');
      info.className='muted';
      info.textContent = `Cobro estimado: ${calc.total.toFixed(2)} Bs (cobrables: ${calc.minutosCobrables} min)`;
      card.append(header,timeRow,controls,info);
    } else {
      card.append(header,timeRow,controls);
    }

    mesasGrid.appendChild(card);
  })
}

function saveAndRender(){
  save();
  aplicarTema();
  renderTarifas();
  renderMesas();
}

// Acciones de mesa
function iniciarMesa(id){
  const m = state.mesas[state.branch][id-1];
  if(m.status!=='libre') return;
  m.status='ocupada';
  m.inicio=Date.now();
  m.pausadoEn=null;
  m.acumuladoMs=0;
  saveAndRender();
}
function pausarMesa(id){
  const m = state.mesas[state.branch][id-1];
  if(m.status!=='ocupada') return;
  m.status='pausada';
  m.acumuladoMs += Date.now()-m.inicio;
  m.inicio=null;
  m.pausadoEn=Date.now();
  saveAndRender();
}
function reanudarMesa(id){
  const m = state.mesas[state.branch][id-1];
  if(m.status!=='pausada') return;
  m.status='ocupada';
  m.inicio=Date.now();
  m.pausadoEn=null;
  saveAndRender();
}

function agregarTicketHistorial(ticket){
  const key = hoyKey();
  if(!state.historial[key]) state.historial[key]=[];
  state.historial[key].push(ticket);
  save();
}

function cobrarMesa(id){
  const m = state.mesas[state.branch][id-1];
  if(m.status==='libre') return;
  let ms = m.acumuladoMs;
  if(m.inicio) ms += Date.now()-m.inicio;
  const inicioReal = new Date(Date.now()-ms);
  const fin = new Date();
  const calc = calcularCobro(ms);

  // Interacción de cobro: efectivo recibido y cambio
  const efectivo = prompt(`Total ${calc.total.toFixed(2)} Bs\nIngresa efectivo recibido:`);
  let entregado = parseFloat(efectivo||'0');
  if(!Number.isFinite(entregado)||entregado<0) entregado=0;
  const cambio = +(entregado - calc.total).toFixed(2);

  const fmt = (d)=> new Intl.DateTimeFormat('es-BO',{dateStyle:'short', timeStyle:'short'}).format(d);

  // Armar ticket
  const t = {
    sucursal: state.branch,
    mesa: m.id,
    inicio: inicioReal.toISOString(),
    fin: fin.toISOString(),
    transcurrido: ms,
    cobrables: calc.minutosCobrables,
    tarifaHora: state.config.tarifaPorHora,
    total: calc.total,
    entregado,
    cambio: Math.max(0,cambio),
    rol: state.role
  };

  ticketBody.innerHTML = `
    <div class="ticket-row"><span>Sucursal</span><strong>${t.sucursal}</strong></div>
    <div class="ticket-row"><span>Mesa</span><strong>${t.mesa}</strong></div>
    <div class="ticket-row"><span>Inicio</span><strong>${fmt(new Date(t.inicio))}</strong></div>
    <div class="ticket-row"><span>Fin</span><strong>${fmt(new Date(t.fin))}</strong></div>
    <div class="ticket-row"><span>Transcurrido</span><strong>${msToHMS(t.transcurrido)}</strong></div>
    <div class="ticket-row"><span>Cobrables</span><strong>${t.cobrables} min</strong></div>
    <div class="ticket-row"><span>Total</span><strong>${t.total.toFixed(2)} Bs</strong></div>
    <div class="ticket-row"><span>Entregado</span><strong>${t.entregado.toFixed(2)} Bs</strong></div>
    <div class="ticket-row"><span>Cambio</span><strong>${Math.max(0,t.cambio).toFixed(2)} Bs</strong></div>
    <div class="ticket-row"><span>Rol</span><strong>${t.rol}</strong></div>
  `;

  ticketModal.showModal();

  // Guardar en historial
  agregarTicketHistorial(t);

  // Reset mesa
  m.status='libre';
  m.inicio=null; m.pausadoEn=null; m.acumuladoMs=0;
  saveAndRender();

  // Botones ticket
  btnCerrarTicket.onclick = ()=> ticketModal.close();
  btnImprimirTicket.onclick = ()=> window.print();
  btnExportarPDF.onclick = ()=> exportarTicketPDF();
}

function exportarTicketPDF(){
  // Estrategia simple: abrir ventana de impresión con CSS (los navegadores permiten "Guardar como PDF")
  // Para exportar archivo directo sin diálogo se requeriría backend o librerías; aquí usamos print-to-PDF del navegador.
  window.print();
}

// Historial
function abrirHistorial(){
  const key = hoyKey();
  const items = (state.historial[key]||[]).slice().reverse();
  const table = document.createElement('table');
  table.className='table';
  table.innerHTML = `<thead><tr>
    <th>Hora</th><th>Sucursal</th><th>Mesa</th><th>Min cobrables</th><th>Total (Bs)</th><th>Entregado</th><th>Cambio</th>
  </tr></thead>`;
  const tb = document.createElement('tbody');
  const fmtTime = d=> new Intl.DateTimeFormat('es-BO',{ timeStyle:'short'}).format(new Date(d));
  items.forEach(t=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${fmtTime(t.fin)}</td><td>${t.sucursal}</td><td>${t.mesa}</td><td>${t.cobrables}</td><td>${t.total.toFixed(2)}</td><td>${t.entregado.toFixed(2)}</td><td>${Math.max(0,t.cambio).toFixed(2)}</td>`;
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  historialTabla.innerHTML='';
  historialTabla.appendChild(table);
  historialModal.showModal();
}

function exportarCSV(){
  const key=hoyKey();
  const items = state.historial[key]||[];
  const rows = [['Fecha','Sucursal','Mesa','MinCobrables','Total','Entregado','Cambio','Rol']];
  items.forEach(t=>{
    rows.push([
      t.fin,
      t.sucursal,
      t.mesa,
      t.cobrables,
      t.total.toFixed(2),
      t.entregado.toFixed(2),
      Math.max(0,t.cambio).toFixed(2),
      t.rol
    ]);
  })
  const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=`reporte_${hoyKey()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// Reporte diario (totales por sucursal y mesa)
function abrirReporte(){
  const key = hoyKey();
  const items = state.historial[key]||[];
  const totales = {};
  let totalGeneral = 0;
  items.forEach(t=>{
    totales[t.sucursal] = (totales[t.sucursal]||0) + t.total;
    totalGeneral += t.total;
  });
  let html = '<div class="table-wrap"><table class="table"><thead><tr><th>Sucursal</th><th>Total (Bs)</th></tr></thead><tbody>';
  BRANCHES.forEach(s=>{
    const val = (totales[s]||0).toFixed(2);
    html += `<tr><td>${s}</td><td><strong>${val}</strong></td></tr>`;
  });
  html += `</tbody><tfoot><tr><th>Total general</th><th>${totalGeneral.toFixed(2)} Bs</th></tr></tfoot></table></div>`;

  // Top 5 mesas por ingreso
  const porMesa = {};
  items.forEach(t=>{
    const keyM = `${t.sucursal} - Mesa ${t.mesa}`;
    porMesa[keyM] = (porMesa[keyM]||0) + t.total;
  });
  const top = Object.entries(porMesa).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(top.length){
    html += '<h4>Top mesas por ingreso</h4><div class="table-wrap"><table class="table"><thead><tr><th>Mesa</th><th>Total (Bs)</th></tr></thead><tbody>';
    top.forEach(([monto, val])=>{
      html += `<tr><td>${monto}</td><td>${val.toFixed(2)}</td></tr>`;
    });
    html += '</tbody></table></div>';
  }

  reporteBody.innerHTML = html;
  reporteModal.showModal();
}

// Cierre de caja
function abrirCierreCaja(){
  const key=hoyKey();
  const items = state.historial[key]||[];
  const total = items.reduce((s,t)=>s+t.total,0);
  const n = items.length;
  cajaBody.innerHTML = `<p>Tickets del día: <strong>${n}</strong></p>
    <p>Total recaudado: <strong>${total.toFixed(2)} Bs</strong></p>
    <p class="muted">Al confirmar, se guardará un registro del cierre y se limpiará el historial del día.</p>`;
  cajaModal.showModal();
}

function confirmarCierre(){
  const key = hoyKey();
  const items = state.historial[key]||[];
  const total = items.reduce((s,t)=>s+t.total,0);
  // Guardar un resumen simple en otra clave
  const cierres = JSON.parse(localStorage.getItem('cierres_billar_jade')||'[]');
  cierres.push({ fecha:key, total, tickets:items.length, sucursales:BRANCHES });
  localStorage.setItem('cierres_billar_jade', JSON.stringify(cierres));
  // Limpiar historial del día
  state.historial[key]=[];
  save();
  cajaModal.close();
  alert('Cierre realizado. Historial del día reiniciado.');
}

// Configuración
function openConfig(){
  if(state.role!=='admin'){ alert('Solo administrador.'); return; }
  cfgTarifa.value = state.config.tarifaPorHora;
  cfgFraccion.value = state.config.fraccionMinutos;
  cfgMinimo.value = state.config.minimoMinutos;
  cfgPin.value = state.config.adminPIN;
  cfgColor.value = state.config.colorHex || DEFAULT_CONFIG.colorHex;
  configModal.showModal();
}
function saveConfig(e){
  e?.preventDefault();
  const t=parseFloat(cfgTarifa.value);
  const f=parseInt(cfgFraccion.value,10);
  const mi=parseInt(cfgMinimo.value,10);
  const pin=cfgPin.value.trim()||DEFAULT_CONFIG.adminPIN;
  const color=cfgColor.value||DEFAULT_CONFIG.colorHex;
  if(Number.isFinite(t)&&Number.isFinite(f)&&Number.isFinite(mi)){
    state.config.tarifaPorHora=Math.max(0,t);
    state.config.fraccionMinutos=Math.max(1,f);
    state.config.minimoMinutos=Math.max(0,mi);
    state.config.adminPIN=pin;
    state.config.colorHex=color;
    saveAndRender();
    configModal.close();
  } else {
    alert('Revisa los valores.');
  }
}

function applyRole(){
  const desired = roleSelect.value;
  if(desired==='admin'){
    const pin = adminPin.value.trim();
    if(pin!==state.config.adminPIN){
      alert('PIN incorrecto. Continuas como cajero.');
      roleSelect.value='cajero';
      state.role='cajero';
    } else {
      state.role='admin';
    }
  } else { state.role='cajero'; }
  adminPin.classList.toggle('hidden', roleSelect.value!=='admin');
  saveAndRender();
}

// Eventos
branchSelect.addEventListener('change', ()=>{ state.branch=branchSelect.value; saveAndRender(); });
roleSelect.addEventListener('change', ()=>{ adminPin.classList.toggle('hidden', roleSelect.value!=='admin'); });
btnIngresarRol.addEventListener('click', applyRole);
btnConfig.addEventListener('click', openConfig);
btnGuardarConfig.addEventListener('click', saveConfig);
btnCancelarConfig.addEventListener('click', (e)=>{e.preventDefault(); configModal.close();});

btnHistorial.addEventListener('click', abrirHistorial);
btnCerrarHistorial.addEventListener('click', ()=> historialModal.close());
btnExportarCSV.addEventListener('click', exportarCSV);

btnReporte.addEventListener('click', abrirReporte);
btnCerrarReporte.addEventListener('click', ()=> reporteModal.close());

btnCerrarCaja.addEventListener('click', abrirCierreCaja);
btnConfirmarCierre.addEventListener('click', confirmarCierre);
btnCancelarCierre.addEventListener('click', ()=> cajaModal.close());

function startTicker(){
  if(intervalId) clearInterval(intervalId);
  intervalId = setInterval(()=>{
    const mesas = state.mesas[state.branch];
    mesas.forEach(m=>{
      const el = document.getElementById(`time-${m.id}`);
      if(el) el.textContent = msToHMS(getMs(m));
    })
  },1000);
}

// ⬇️ init: ahora es asíncrona y usa la API real (load())
(async function init(){
  // lo que ya tenías
  local();
  aplicarTema();
  branchSelect.value = state.branch;
  roleSelect.value   = state.role;
  adminPin.classList.toggle('hidden', roleSelect.value !== 'admin');

  // ⬇️ CAMBIO CLAVE:
  // en lugar de renderTarifas()/renderMesas() locales, pedimos a la API
  await load();      // load() trae /tarifas y /mesas y llama a initMesas() para pintar

  startTicker();
  lblFecha.textContent = new Date().toLocaleDateString('es-BO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
})();
