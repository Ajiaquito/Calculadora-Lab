// Calculadora de precios · Rodríguez Granados Laboratorio Dental
// Los precios viven en productos.json (no hace falta tocar este archivo para actualizarlos).

function iniciar(DATA){
  const fmt = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  const cant = {};      // id -> cantidad
  const precios = {};   // id -> precio
  let cat = 'todas', q = '';

  DATA.productos.forEach(p => precios[p.id] = p.precio);
  DATA.tabletasDientes.items.forEach(p => precios[p.id] = p.precio);

  const categorias = [
    ...DATA.categorias.map(c => ({id:c.id, nombre:c.nombre})),
    {id:'dientes', nombre:'Tabletas de dientes'}
  ];

  const info = {};     // id -> datos para el desglose
  DATA.productos.forEach(p => info[p.id] = {nombre:p.nombre, rango:p.rango, cat:p.categoria});
  DATA.tabletasDientes.items.forEach(p => info[p.id] = {nombre:p.nombre, rango:null, cat:'dientes'});

  function coincide(texto){ return !q || norm(texto).includes(q); }

  function armarSecciones(){
    const secs = [];
    for (const c of DATA.categorias){
      const grupos = new Map();
      DATA.productos.filter(p => p.categoria === c.id && coincide(p.nombre + ' ' + (p.rango||''))).forEach(p => {
        if (!grupos.has(p.nombre)) grupos.set(p.nombre, {nombre:p.nombre, dientes:p.dientes, items:[]});
        grupos.get(p.nombre).items.push(p);
      });
      secs.push({id:c.id, titulo:c.nombre, grupos:[...grupos.values()]});
    }
    const dientes = DATA.tabletasDientes.items.filter(d => coincide(d.nombre)).map(d => ({
      nombre:d.nombre, dientes:null, items:[{id:d.id, rango:null, unidad:d.presentacion, precio:d.precio}]
    }));
    secs.push({id:'dientes', titulo:'Tabletas de dientes (costo adicional)', grupos:dientes});
    return secs.filter(s => s.grupos.length && (cat === 'todas' || cat === s.id));
  }

  function filaHTML(it){
    const n = cant[it.id] || 0;
    const etiqueta = it.rango ? it.rango + ' pónticos' : (it.unidad || '');
    return `<div class="fila${n ? ' activa' : ''}" id="f-${it.id}">
      <div><div class="rango">${etiqueta}</div><div class="precio">${fmt(it.precio)}</div></div>
      <div class="step">
        <button data-id="${it.id}" data-d="-1" aria-label="Quitar">−</button>
        <span class="n" id="c-${it.id}">${n}</span>
        <button data-id="${it.id}" data-d="1" aria-label="Agregar">+</button>
      </div></div>`;
  }

  function render(){
    const secs = armarSecciones();
    const cont = document.getElementById('lista');
    if (!secs.length){ cont.innerHTML = '<div class="vacio">No se encontraron servicios</div>'; return; }
    cont.innerHTML = secs.map(s => `<section class="seccion"><h2>${s.titulo}</h2>` +
      s.grupos.map(g => `<div class="card"><h3>${g.nombre}${g.dientes ? `<span class="badge">incluye ${g.dientes}</span>` : ''}</h3>${g.items.map(filaHTML).join('')}</div>`).join('') +
      '</section>').join('');
  }

  function renderChips(){
    const todos = [{id:'todas', nombre:'Todas'}, ...categorias];
    document.getElementById('chips').innerHTML = todos.map(c => `<button class="chip${c.id === cat ? ' on' : ''}" data-cat="${c.id}">${c.nombre}</button>`).join('');
  }

  function actualizarTotal(){
    let total = 0, unidades = 0;
    for (const id in cant){ total += cant[id] * precios[id]; unidades += cant[id]; }
    document.getElementById('total').textContent = fmt(total);
    document.getElementById('cuenta').textContent = unidades + (unidades === 1 ? ' unidad' : ' unidades') + (unidades ? ' · ver desglose ›' : '');
    document.getElementById('limpiar').disabled = unidades === 0;
  }

  document.getElementById('lista').addEventListener('click', e => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    const id = b.dataset.id;
    const n = Math.max(0, (cant[id] || 0) + Number(b.dataset.d));
    if (n) cant[id] = n; else delete cant[id];
    document.getElementById('c-' + id).textContent = n;
    document.getElementById('f-' + id).classList.toggle('activa', n > 0);
    actualizarTotal();
  });

  document.getElementById('chips').addEventListener('click', e => {
    const b = e.target.closest('button[data-cat]');
    if (!b) return;
    cat = b.dataset.cat;
    renderChips(); render();
    window.scrollTo({top:0});
  });

  document.getElementById('buscar').addEventListener('input', e => { q = norm(e.target.value.trim()); render(); });

  document.getElementById('limpiar').addEventListener('click', () => {
    if (!confirm('¿Borrar todo el pedido?')) return;
    for (const id in cant) delete cant[id];
    render(); actualizarTotal();
  });

  function abrirDetalle(){
    const porCat = {};
    for (const id in cant){ (porCat[info[id].cat] ||= []).push(id); }
    let total = 0, html = '';
    for (const c of categorias){
      const ids = porCat[c.id];
      if (!ids) continue;
      let sub = 0;
      const lineas = ids.map(id => {
        const s = cant[id] * precios[id]; sub += s;
        const i = info[id];
        return `<div class="lin"><div>${i.nombre}<small>${cant[id]} × ${fmt(precios[id])}${i.rango ? ' · ' + i.rango + ' pónticos' : ''}</small></div><b>${fmt(s)}</b></div>`;
      }).join('');
      total += sub;
      html += `<div class="cat-sub"><span>${c.nombre}</span><span>${fmt(sub)}</span></div>${lineas}`;
    }
    document.getElementById('detalle').innerHTML = html;
    document.getElementById('total-detalle').textContent = fmt(total);
    document.getElementById('hoja').classList.add('abierta');
  }

  function cerrarDetalle(){ document.getElementById('hoja').classList.remove('abierta'); }

  document.getElementById('resumen').addEventListener('click', () => { if (Object.keys(cant).length) abrirDetalle(); });
  document.getElementById('fondo').addEventListener('click', cerrarDetalle);
  document.getElementById('cerrar').addEventListener('click', cerrarDetalle);

  renderChips(); render(); actualizarTotal();
}

fetch('productos.json', {cache: 'no-cache'})
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(iniciar)
  .catch(() => {
    document.getElementById('lista').innerHTML =
      '<div class="vacio">No se pudo cargar la lista de precios.<br>Abre la app una vez con internet.</div>';
  });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}
