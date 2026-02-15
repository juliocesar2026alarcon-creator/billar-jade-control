// ======= Estado, configuración y catálogo =======
const DEFAULT_CONFIG = {
  tarifaPorHora: 15.0,
  fraccionMinutos: 5,
  minimoMinutos: 30,
  adminPIN: '2468',
  colorHex: '#16a34a'
};
const BRANCHES = ['BILLAR JADE', 'BILLAR JADE ANEXO'];
const MESAS_POR_SUCURSAL = 10;

// Catálogo inicial (editable en “Productos” si eres admin)
const DEFAULT_PRODUCTS = [
  { id:'p1',  name:'Cerveza paceña 1 Lts', price:25 },
  { id:'p2',  name:'Cerveza Golden Lata',  price:12 },
  { id:'p3',  name:'Papas Picantes',       price:3.5 },
  { id:'p4',  name:'Papas Churrasco',      price:3.5 },
  { id:'p5',  name:'Cigarro Hills',        price:0.67 },
  { id:'p6',  name:'Cigarro Bohem',        price:1 },
  { id:'p7',  name:'Soda Mini',            price:2.5 },
  { id:'p8',  name:'Soda Popular',         price:6 },
  { id:'p9',  name:'Soda 1 1/2',           price:10 },
  { id:'p10', name:'Coca Machucada',       price:20 }
];

let state = {
  branch: BRANCHES[0],
  role: 'cajero',
  config: { ...DEFAULT_CONFIG },
  mesas: {},            // por sucursal
  historial: {},        // por día (YYYY-MM-DD)
  products: [...DEFAULT_PRODUCTS],
  consumo: {}           // consumo por sucursal y mesa
};

const LS_KEY = 'billar_jade_products_state_v1';
function hoyKey(){ return new Date().toISOString().slice(0,10); }

function initMesas(){
  BRANCHES.forEach(s=>{
    if(!state.mesas[s]){
      state.mesas[s] = Array.from({length:MESAS_POR_SUCURSAL}, (_,i)=>({
        id:i+1, status:'libre', inicio:null, pausadoEn:null, acumuladoMs:0
      }));
    }
    if(!state.consumo[s]) state.consumo[s] = {};
  });
}

function load(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      state = {
        branch: parsed.branch ?? BRANCHES[0],
        role: parsed.role ?? 'cajero',
        config: { ...DEFAULT_CONFIG, ...(parsed.config||{}) },
        mesas: parsed.mesas || {},
        historial: parsed.historial || {},
        products: parsed.products && parsed.products.length ? parsed.products : [...DEFAULT_PRODUCTS],
        consumo: parsed.consumo || {}
      };
    }
  }catch(e){ console.warn('No storage', e); }
  initMesas();
}
function save(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){} }

function aplicarTema(){ document.documentElement.style.setProperty('--color', state.config.colorHex || DEFAULT_CONFIG.colorHex); }

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
  if(f>1){ cobrables = Math.ceil(cobrables/f)*f; }
  const total = +(cobrables * (state.config.tarifaPorHora/60)).toFixed(2);
  return { minutos, minutosCobrables:cobrables, total };
}

// ======= UI refs =======
const branchSelect = document.getElementById('branchSelect');
const roleSelect   = document.getElementById('roleSelect');
const adminPin     = document.getElementById('adminPin');
const btnIngresarRol = document.getElementById('btnIngresarRol');
const lblTarifa    = document.getElementById('lblTarifa');
const lblFraccion  = document.getElementById('lblFraccion');
const lblMinimo    = document.getElementById('lblMinimo');
const btnConfig    = document.getElementById('btnConfig');
const btnProductos = document.getElementById('btnProductos');
const mesasGrid    = document.getElementById('mesasGrid');
const lblFecha     = document.getElementById('lblFecha');
const liveClock    = document.getElementById('liveClock');
const liveDate     = document.getElementById('liveDate');

// Modales comunes
const configModal    = document.getElementById('configModal');
const cfgTarifa      = document.getElementById('cfgTarifa');
const cfgFraccion    = document.getElementById('cfgFraccion');
const cfgMinimo      = document.getElementById('cfgMinimo');
const cfgPin         = document.getElementById('cfgPin');
const cfgColor       = document.getElementById('cfgColor');
const btnGuardarConfig = document.getElementById('btnGuardarConfig');
const btnCancelarConfig = document.getElementById('btnCancelarConfig');

// Productos (admin)
const productosModal = document.getElementById('productosModal');
const prodNombre     = document.getElementById('prodNombre');
const prodPrecio     = document.getElementById('prodPrecio');
const btnAgregarProducto = document.getElementById('btnAgregarProducto');
const tablaProductos = document.getElementById('tablaProductos');
const btnCerrarProductos = document.getElementById('btnCerrarProductos');

// Consumo por mesa
const consumoModal   = document.getElementById('consumoModal');
const consumoMesaTitulo = document.getElementById('consumoMesaTitulo');
const buscarProducto = document.getElementById('buscarProducto');
const listaProductos = document.getElementById('listaProductos');
const detalleConsumo = document.getElementById('detalleConsumo');
const subtotalProductos = document.getElementById('subtotalProductos');
const btnCerrarConsumo  = document.getElementById('btnCerrarConsumo');

// Ticket / Historial / Reporte / Caja
const ticketModal    = document.getElementById('ticketModal');
const ticketBody     = document.getElementById('ticketBody');
const btnImprimirTicket = document.getElementById('btnImprimirTicket');
const btnCerrarTicket   = document.getElementById('btnCerrarTicket');
const btnExportarPDF    = document.getElementById('btnExportarPDF');

const historialModal = document.getElementById('historialModal');
const historialTabla = document.getElementById('historialTabla');
const btnCerrarHistorial = document.getElementById('btnCerrarHistorial');
const btnExportarCSV = document.getElementById('btnExportarCSV');

const reporteModal   = document.getElementById('reporteModal');
const reporteBody    = document.getElementById('reporteBody');
const btnCerrarReporte = document.getElementById('btnCerrarReporte');

const cajaModal      = document.getElementById('cajaModal');
const cajaBody       = document.getElementById('cajaBody');
const btnCerrarCaja  = document.getElementById('btnCerrarCaja');
const btnConfirmarCierre = document.getElementById('btnConfirmarCierre');

const btnHistorial   = document.getElementById('btnHistorial');
const btnReporte     = document.getElementById('btnReporte');

let intervalId=null, clockId=null, mesaActualParaConsumo=null;

function aplicarReloj(){
  function tick(){
    const now = new Date();
    liveClock.textContent = now.toLocaleTimeString('es-BO', {hour12:false});
    liveDate.textContent  = now.toLocaleDateString('es-BO', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
  }
  tick();
  if(clockId) clearInterval(clockId);
  clockId = setInterval(tick, 1000);
}

function renderTarifas(){
  lblTarifa.textContent   = `${state.config.tarifaPorHora.toFixed(2)} Bs/h`;
  lblFraccion.textContent = `Fracción: ${state.config.fraccionMinutos} min`;
  lblMinimo.textContent   = `Mínimo: ${state.config.minimoMinutos} min`;
  btnConfig.disabled      = (state.role !== 'admin');
  btnProductos.disabled   = (state.role !== 'admin');
}

function getMs(m){ let base=m.acumuladoMs; if(m.status==='ocupada'&&m.inicio){ base+=Date.now()-m.inicio; } return base; }

function mkBtn(text, onClick, variant){ const b=document.createElement('button'); b.className='btn'+(variant?' '+variant:''); b.textContent=text; b.addEventListener('click', onClick); return b; }

function subtotalMesaProductos(branch, mesaId){
  const items = (state.consumo[branch] && state.consumo[branch][mesaId]) ? state.consumo[branch][mesaId] : [];
  return +(items.reduce((s,it)=> s + it.price*it.qty, 0).toFixed(2));
}

function renderMesas(){
  const mesas = state.mesas[state.branch];
  mesasGrid.innerHTML = '';
  mesas.forEach(m=>{
    const card = document.createElement('div'); card.className='card';

    const header = document.createElement('div'); header.className='card-header';
    const title  = document.createElement('strong'); title.textContent = `Mesa ${m.id}`;
    const badge  = document.createElement('span');  badge.className='badge ' + (m.status==='libre'?'free':'busy'); badge.textContent=(m.status==='libre')? 'Libre' : (m.status==='ocupada'? 'En uso' : 'Pausada');
    header.append(title,badge);

    const timeRow = document.createElement('div'); timeRow.className='row gap';
    timeRow.innerHTML = `<span>Transcurrido:</span><span class="time" id="time-${m.id}">${msToHMS(getMs(m))}</span>`;

    const consumoRow = document.createElement('div');
    const sub = subtotalMesaProductos(state.branch, m.id);
    consumoRow.innerHTML = `<span class="muted">Productos: </span> <strong>${sub.toFixed(2)} Bs</strong>`;

    const controls = document.createElement('div'); controls.className='controls-row';
    const btnIniciar = mkBtn('Iniciar', ()=>iniciarMesa(m.id));
    const btnPausar  = mkBtn('Pausar',  ()=>pausarMesa(m.id),'outline');
    const btnReanudar= mkBtn('Reanudar',()=>reanudarMesa(m.id));
    const btnConsumo = mkBtn('Consumo 🍺', ()=>abrirConsumo(m.id),'outline');
    const btnCobrar  = mkBtn('Detener y Cobrar', ()=>cobrarMesa(m.id));

    if(m.status==='libre') controls.append(btnIniciar, btnConsumo);
    else if(m.status==='ocupada') controls.append(btnPausar, btnConsumo, btnCobrar);
    else controls.append(btnReanudar, btnConsumo, btnCobrar);

    let info=null;
    if(m.status!=='libre'){
      const calc = calcularCobro(getMs(m));
      info = document.createElement('div'); info.className='muted';
      info.textContent = `Tiempo: ${calc.total.toFixed(2)} Bs (cobrables: ${calc.minutosCobrables} min)`;
    }

    card.append(header,timeRow,consumoRow,controls);
    if(info) card.append(info);

    mesasGrid.appendChild(card);
  });
}

function saveAndRender(){ save(); aplicarTema(); renderTarifas(); renderMesas(); }

// ======= Acciones de mesa =======
function iniciarMesa(id){ const m=state.mesas[state.branch][id-1]; if(m.status!=='libre')return; m.status='ocupada'; m.inicio=Date.now(); m.pausadoEn=null; m.acumuladoMs=0; saveAndRender(); }
function pausarMesa(id){  const m=state.mesas[state.branch][id-1]; if(m.status!=='ocupada')return; m.status='pausada'; m.acumuladoMs += Date.now()-m.inicio; m.inicio=null; m.pausadoEn=Date.now(); saveAndRender(); }
function reanudarMesa(id){const m=state.mesas[state.branch][id-1]; if(m.status!=='pausada')return; m.status='ocupada'; m.inicio=Date.now(); m.pausadoEn=null; saveAndRender(); }

// ======= Consumo de productos =======
function abrirConsumo(mesaId){
  mesaActualParaConsumo = mesaId;
  consumoMesaTitulo.textContent = `Mesa ${mesaId} — ${state.branch}`;
  buscarProducto.value='';
  renderCatalogoProductos();
  renderDetalleConsumo();
  consumoModal.showModal();
}

function renderCatalogoProductos(){
  const q = buscarProducto.value.trim().toLowerCase();
  const list = state.products.filter(p=> !q || p.name.toLowerCase().includes(q));
  listaProductos.innerHTML='';
  list.forEach(p=>{
    const div = document.createElement('div'); div.className='prod-item';
    const left = document.createElement('div');
    const nm = document.createElement('div'); nm.className='prod-name';  nm.textContent = p.name;
    const pr = document.createElement('div'); pr.className='prod-price'; pr.textContent = `${p.price.toFixed(2)} Bs`;
    left.append(nm,pr);

    const qtyBox = document.createElement('div'); qtyBox.className='qty-box';
    const minus = document.createElement('button'); minus.className='qty-btn'; minus.textContent='–';
    const qty   = document.createElement('span');   qty.className='qty';    qty.textContent='0';
    const plus  = document.createElement('button'); plus.className='qty-btn';  plus.textContent='+';

    plus.onclick = ()=> agregarProductoAMesa(p, 1);
    minus.onclick = ()=> agregarProductoAMesa(p, -1);
    qtyBox.append(minus, qty, plus);

    div.append(left, qtyBox);
    listaProductos.appendChild(div);
  });
}

function obtenerConsumoMesa(branch, mesaId){
  if(!state.consumo[branch]) state.consumo[branch] = {};
  if(!state.consumo[branch][mesaId]) state.consumo[branch][mesaId] = [];
  return state.consumo[branch][mesaId];
}

function agregarProductoAMesa(prod, delta){
  const items = obtenerConsumoMesa(state.branch, mesaActualParaConsumo);
  let it = items.find(x=>x.id===prod.id);
  if(!it && delta>0){ items.push({id:prod.id, name:prod.name, price:prod.price, qty:0}); it = items.find(x=>x.id===prod.id); }
  if(it){
    it.qty = Math.max(0, (it.qty||0) + delta);
    if(it.qty===0){
      const i=items.findIndex(x=>x.id===prod.id);
      if(i>=0) items.splice(i,1);
    }
  }
  save();
  renderDetalleConsumo();
  renderMesas();
}

function renderDetalleConsumo(){
  const items = obtenerConsumoMesa(state.branch, mesaActualParaConsumo);
  const table = document.createElement('table'); table.className='table';
  table.innerHTML = '<thead><tr><th>Producto</th><th>Precio</th><th>Cant</th><th>Subtotal</th><th></th></tr></thead>';
  const tb = document.createElement('tbody');
  items.forEach(it=>{
    const tr = document.createElement('tr');
    const sub = +(it.price*it.qty).toFixed(2);
    tr.innerHTML = `<td>${it.name}</td><td>${it.price.toFixed(2)}</td><td>${it.qty}</td><td>${sub.toFixed(2)}</td>`;
    const tdAcc = document.createElement('td');
    const menos = document.createElement('button'); menos.className='qty-btn'; menos.textContent='–'; menos.onclick = ()=> agregarProductoAMesa(it, -1);
    const mas   = document.createElement('button'); mas.className='qty-btn';   mas.textContent='+';  mas.onclick   = ()=> agregarProductoAMesa(it, 1);
    tdAcc.append(menos, mas);
    tr.appendChild(tdAcc);
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  detalleConsumo.innerHTML=''; detalleConsumo.appendChild(table);
  subtotalProductos.textContent = subtotalMesaProductos(state.branch, mesaActualParaConsumo).toFixed(2);
}

buscarProducto.addEventListener('input', renderCatalogoProductos);
btnCerrarConsumo.addEventListener('click', ()=> consumoModal.close());

// ======= Productos - administración =======
function abrirProductos(){
  if(state.role!=='admin'){ alert('Solo administrador.'); return; }
  renderTablaProductos();
  productosModal.showModal();
}

function renderTablaProductos(){
  const table = document.createElement('table'); table.className='table';
  table.innerHTML = '<thead><tr><th>Producto</th><th>Precio (Bs)</th><th></th></tr></thead>';
  const tb = document.createElement('tbody');
  state.products.forEach((p,idx)=>{
    const tr  = document.createElement('tr');

    const tdN = document.createElement('td');
    const inpN= document.createElement('input'); inpN.value=p.name; inpN.style.width='100%';
    tdN.appendChild(inpN);

    const tdP = document.createElement('td');
    const inpP= document.createElement('input'); inpP.type='number'; inpP.step='0.01'; inpP.min='0'; inpP.value=p.price; inpP.style.width='120px';
    tdP.appendChild(inpP);

    const tdA = document.createElement('td');
    const btnDel = document.createElement('button'); btnDel.className='btn outline'; btnDel.textContent='Eliminar';
    btnDel.onclick=()=>{ if(confirm('¿Eliminar producto?')){ state.products.splice(idx,1); save(); renderTablaProductos(); } };
    const btnSave= document.createElement('button'); btnSave.className='btn'; btnSave.textContent='Guardar'; btnSave.style.marginLeft='6px';
    btnSave.onclick=()=>{ p.name=inpN.value.trim()||p.name; p.price=Math.max(0, parseFloat(inpP.value)||p.price); save(); renderTablaProductos(); };
    tdA.append(btnDel, btnSave);

    tr.append(tdN, tdP, tdA);
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  tablaProductos.innerHTML=''; tablaProductos.appendChild(table);
}

btnAgregarProducto.addEventListener('click', (e)=>{
  e.preventDefault();
  if(state.role!=='admin'){ alert('Solo administrador.'); return; }
  const name = prodNombre.value.trim();
  const price= parseFloat(prodPrecio.value);
  if(!name || !Number.isFinite(price)) { alert('Completa nombre y precio.'); return; }
  const id='p'+(Math.random().toString(36).slice(2,8));
  state.products.push({id, name, price:Math.max(0,price)});
  prodNombre.value=''; prodPrecio.value='';
  save(); renderTablaProductos();
});
btnCerrarProductos.addEventListener('click', ()=> productosModal.close());

// ======= Ticket, historial, reporte, caja =======
function agregarTicketHistorial(ticket){
  const key=hoyKey(); if(!state.historial[key]) state.historial[key]=[];
  state.historial[key].push(ticket); save();
}

function cobrarMesa(id){
  const m = state.mesas[state.branch][id-1];
  if(m.status==='libre' && subtotalMesaProductos(state.branch,id)<=0){ alert('Nada para cobrar.'); return; }

  let ms = m.acumuladoMs; if(m.inicio) ms += Date.now()-m.inicio;
  const inicioReal = new Date(Date.now()-ms); const fin = new Date();
  const calc = calcularCobro(ms);

  const productos = obtenerConsumoMesa(state.branch, id);
  const totalProductos = +(productos.reduce((s,it)=> s+it.price*it.qty,0).toFixed(2));
  const totalGeneral = +(calc.total + totalProductos).toFixed(2);

  const efectivo = prompt(`Total ${totalGeneral.toFixed(2)} Bs\nIngresa efectivo recibido:`);
  let entregado = parseFloat(efectivo||'0'); if(!Number.isFinite(entregado)||entregado<0) entregado=0;
  const cambio = +(entregado - totalGeneral).toFixed(2);

  const fmt = (d)=> new Intl.DateTimeFormat('es-BO',{dateStyle:'short', timeStyle:'short'}).format(d);

  // Ticket HTML
  let productosHtml='';
  if(productos.length){
    productosHtml += '<div class="ticket-row"><strong>Productos</strong><span></span></div>';
    productos.forEach(it=>{ const sub=+(it.price*it.qty).toFixed(2);
      productosHtml += `<div class="ticket-row"><span>${it.qty} x ${it.name}</span><strong>${sub.toFixed(2)} Bs</strong></div>`;
    });
    productosHtml += `<div class="ticket-row"><span>Subtotal productos</span><strong>${totalProductos.toFixed(2)} Bs</strong></div>`;
  }

  ticketBody.innerHTML = `
    <div class="ticket-row"><span>Sucursal</span><strong>${state.branch}</strong></div>
    <div class="ticket-row"><span>Mesa</span><strong>${id}</strong></div>
    <div class="ticket-row"><span>Inicio</span><strong>${fmt(inicioReal)}</strong></div>
    <div class="ticket-row"><span>Fin</span><strong>${fmt(fin)}</strong></div>
    <div class="ticket-row"><span>Transcurrido</span><strong>${msToHMS(ms)}</strong></div>
    <div class="ticket-row"><span>Cobrables</span><strong>${calc.minutosCobrables} min</strong></div>
    <div class="ticket-row"><span>Tiempo</span><strong>${calc.total.toFixed(2)} Bs</strong></div>
    ${productosHtml}
    <div class="ticket-row" style="border-top:1px dashed #999; padding-top:6px; margin-top:6px;">
      <span>Total</span><strong>${totalGeneral.toFixed(2)} Bs</strong>
    </div>
    <div class="ticket-row"><span>Entregado</span><strong>${entregado.toFixed(2)} Bs</strong></div>
    <div class="ticket-row"><span>Cambio</span><strong>${Math.max(0,cambio).toFixed(2)} Bs</strong></div>
    <div class="ticket-row"><span>Rol</span><strong>${state.role}</strong></div>
  `;
  ticketModal.showModal();

  // Guardar historial
  const t = {
    sucursal:state.branch, mesa:id,
    inicio:inicioReal.toISOString(), fin:fin.toISOString(), ms,
    cobrables:calc.minutosCobrables, tiempoBs:calc.total,
    productos:productos.map(x=>({name:x.name, price:x.price, qty:x.qty})),
    totalProductos, total: totalGeneral, entregado, cambio:Math.max(0,cambio), rol:state.role
  };
  agregarTicketHistorial(t);

  // Reset mesa y consumo
  m.status='libre'; m.inicio=null; m.pausadoEn=null; m.acumuladoMs=0;
  state.consumo[state.branch][id]=[];
  saveAndRender();

  btnCerrarTicket.onclick=()=> ticketModal.close();
  btnImprimirTicket.onclick=()=> window.print();
  btnExportarPDF.onclick=()=> window.print();
}

function abrirHistorial(){
  const key=hoyKey(); const items=(state.historial[key]||[]).slice().reverse();
  const table=document.createElement('table'); table.className='table';
  table.innerHTML = '<thead><tr><th>Hora</th><th>Sucursal</th><th>Mesa</th><th>Tiempo (Bs)</th><th>Productos (Bs)</th><th>Total (Bs)</th></tr></thead>';
  const tb=document.createElement('tbody');
  const fmt=d=> new Intl.DateTimeFormat('es-BO',{timeStyle:'short'}).format(new Date(d));
  items.forEach(t=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${fmt(t.fin)}</td><td>${t.sucursal}</td><td>${t.mesa}</td><td>${t.tiempoBs.toFixed(2)}</td><td>${t.totalProductos.toFixed(2)}</td><td><strong>${t.total.toFixed(2)}</strong></td>`;
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  historialTabla.innerHTML=''; historialTabla.appendChild(table);
  historialModal.showModal();
}

function exportarCSV(){
  const key=hoyKey(); const items=state.historial[key]||[];
  const rows=[["Fecha","Sucursal","Mesa","TiempoBs","ProductosBs","Total","Entregado","Cambio","Rol"]];
  items.forEach(t=> rows.push([t.fin,t.sucursal,t.mesa,t.tiempoBs.toFixed(2),t.totalProductos.toFixed(2),t.total.toFixed(2),t.entregado.toFixed(2),t.cambio.toFixed(2),t.rol]));
  const csv = rows.map(r=> r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',') ).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`reporte_${hoyKey()}.csv`; a.click(); URL.revokeObjectURL(url);
}

function abrirReporte(){
  const key=hoyKey(); const items=state.historial[key]||[];
  const totalesSucursal={}; let totalGeneral=0, totalProductos=0, totalTiempo=0;
  items.forEach(t=>{ totalesSucursal[t.sucursal]=(totalesSucursal[t.sucursal]||0)+t.total; totalGeneral+=t.total; totalProductos+=t.totalProductos; totalTiempo+=t.tiempoBs; });
  let html = '<div class="table-wrap"><table class="table"><thead><tr><th>Sucursal</th><th>Tiempo (Bs)</th><th>Productos (Bs)</th><th>Total (Bs)</th></tr></thead><tbody>';
  BRANCHES.forEach(s=>{
    const tSuc = items.filter(x=>x.sucursal===s);
    const sumT = tSuc.reduce((a,b)=>a+b.tiempoBs,0);
    const sumP = tSuc.reduce((a,b)=>a+b.totalProductos,0);
    const sum  = sumT+sumP;
    html += `<tr><td>${s}</td><td>${sumT.toFixed(2)}</td><td>${sumP.toFixed(2)}</td><td><strong>${sum.toFixed(2)}</strong></td></tr>`;
  });
  html += `</tbody><tfoot><tr><th colspan="1">Total general</th><th>${totalTiempo.toFixed(2)}</th><th>${totalProductos.toFixed(2)}</th><th>${totalGeneral.toFixed(2)} Bs</th></tr></tfoot></table></div>`;

  // Top productos
  const prodMap={}; items.forEach(t=> t.productos.forEach(p=>{ prodMap[p.name]=(prodMap[p.name]||0)+p.price*p.qty; }));
  const top = Object.entries(prodMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
  if(top.length){
    html += '<h4>Top productos</h4><div class="table-wrap"><table class="table"><thead><tr><th>Producto</th><th>Total (Bs)</th></tr></thead><tbody>';
    top.forEach(([n,v])=> html+=`<tr><td>${n}</td><td>${v.toFixed(2)}</td></tr>`);
    html += '</tbody></table></div>';
  }

  reporteBody.innerHTML = html; reporteModal.showModal();
}

function abrirCierreCaja(){
  const key=hoyKey(); const items=state.historial[key]||[]; const total = items.reduce((s,t)=>s+t.total,0);
  cajaBody.innerHTML = `<p>Tickets del día: <strong>${items.length}</strong></p><p>Total recaudado: <strong>${total.toFixed(2)} Bs</strong></p><p class='muted'>Al confirmar se reiniciará el historial del día y se guardará un resumen simple.</p>`;
  cajaModal.showModal();
}

function confirmarCierre(){
  const key=hoyKey(); const items=state.historial[key]||[]; const total=items.reduce((s,t)=>s+t.total,0);
  const cierres=JSON.parse(localStorage.getItem('cierres_billar_jade')||'[]');
  cierres.push({fecha:key,total,tickets:items.length});
  localStorage.setItem('cierres_billar_jade', JSON.stringify(cierres));
  state.historial[key]=[];
  save(); cajaModal.close(); alert('Cierre realizado.');
}

// ======= Configuración y rol =======
function openConfig(){
  if(state.role!=='admin'){ alert('Solo administrador.'); return; }
  cfgTarifa.value   = state.config.tarifaPorHora;
  cfgFraccion.value = state.config.fraccionMinutos;
  cfgMinimo.value   = state.config.minimoMinutos;
  cfgPin.value      = state.config.adminPIN;
  cfgColor.value    = state.config.colorHex || DEFAULT_CONFIG.colorHex;
  configModal.showModal();
}
function saveConfig(e){
  e?.preventDefault();
  const t=parseFloat(cfgTarifa.value);
  const f=parseInt(cfgFraccion.value,10);
  const mi=parseInt(cfgMinimo.value,10);
