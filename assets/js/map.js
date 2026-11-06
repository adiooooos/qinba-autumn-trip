/* =========================================================
   高德地图 · 路线渲染
   ---------------------------------------------------------
   路线几何已在构建期用高德 Driving 插件算好，落在
   assets/js/routes.js（window.ROUTE_LINES），页面只做渲染，
   不再实时请求算路 —— 打开即出图，也不吃每日配额。
   ========================================================= */
(function () {
  const T = window.TRIP;
  const LINES = window.ROUTE_LINES || {};
  const $ = s => document.querySelector(s);

  const AMAP_KEY = new URLSearchParams(location.search).get('key')
    || 'ddfec8dab891f69b52b0ce4c4fb05fd3';
  const AMAP_SEC = new URLSearchParams(location.search).get('sec')
    || 'f630e21d2b9efc645feb52644f448abe';

  let map, satLayer = null, satOn = false;
  let segLines = {};    // dayId -> [{line, i, w}]
  let halos = [];       // 路线光晕
  let markers = [];     // {day, m, full, only}
  let dead = false;

  if (AMAP_SEC) window._AMapSecurityConfig = { securityJsCode: AMAP_SEC };

  const timer = setTimeout(() => { if (!map) fail('加载超时'); }, 12000);

  const s = document.createElement('script');
  s.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(AMAP_KEY)}`;
  s.onerror = () => fail('脚本加载失败');
  s.onload = () => { try { boot(); } catch (e) { console.error(e); fail('初始化失败'); } };
  document.head.appendChild(s);

  function fail(reason) {
    if (dead) return;
    dead = true;
    clearTimeout(timer);
    const l = $('#mapLoad'); if (l) l.classList.add('hide');
    const f = $('#mapFallback'); if (f) f.classList.add('show');
    console.warn('[map]', reason);
  }

  /* ---------------- 主流程 ---------------- */
  function boot() {
    if (!window.AMap) return fail('AMap 未就绪');

    map = new AMap.Map('amap', {
      zoom: 8.4,
      center: [107.05, 32.55],
      mapStyle: 'amap://styles/dark',
      viewMode: '2D',
      features: ['bg', 'road', 'point'],
      zooms: [5, 17],
      resizeEnable: true
    });

    window.__amap = map;
    map.on('complete', () => { const l = $('#mapLoad'); if (l) l.classList.add('hide'); });

    draw();
    collectMetrics();
    if (window.PanelAPI) window.PanelAPI.render(window.PanelAPI.day);

    window.MapCtl = { focusDay, focusSegment, fitAll };

    /* 手机上抽屉默认收起，点头部展开 —— 必须先于首次取景 */
    const panel = $('#mapPanel');
    if (panel && window.innerWidth < 860) {
      panel.classList.add('min');
      document.body.classList.add('panel-min');
      const head = panel.querySelector('.mp-head');
      if (head) head.addEventListener('click', () => {
        const min = panel.classList.toggle('min');
        document.body.classList.toggle('panel-min', min);
        if (min) focusDay(window.__activeDay || 'all');
      });
    }

    focusDay('all');
    map.on('zoomend', applyLabels);

    const bf = $('#btnFit'); if (bf) bf.addEventListener('click', () => window.selectDay('all'));
    const bt = $('#btnTop'); if (bt) bt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    const bs = $('#btnSat'); if (bs) bs.addEventListener('click', toggleSat);

    window.addEventListener('resize', () => map && map.resize());

    clearTimeout(timer);
  }

  /* ---------------- 里程回写 ---------------- */
  function collectMetrics() {
    let drive = 0;
    T.days.forEach(d => {
      let km = 0, min = 0, any = false;
      d.segments.forEach((sg, i) => {
        const r = LINES[d.id + '-' + i];
        if (!r) return;
        if (sg.mode === 'drive') { sg.km = r.km; sg.min = r.min; km += r.km; min += r.min; any = true; }
      });
      if (any) {
        d.km = Math.round(km);
        d.min = Math.round(min);
        if (/^d[123]$/.test(d.id)) drive += km;
      }
    });
    if (drive > 0) T.meta.driveKm = Math.round(drive);
    window.dispatchEvent(new CustomEvent('routes:ready'));
  }

  /* ---------------- 绘制 ---------------- */
  function draw() {
    T.days.forEach(d => {
      segLines[d.id] = [];
      d.segments.forEach((sg, i) => {
        const r = LINES[d.id + '-' + i];
        const o = T.points[sg.from].gcj, t = T.points[sg.to].gcj;
        const path = r
          ? r.path.map(p => new AMap.LngLat(p[0], p[1]))
          : (o && t ? [new AMap.LngLat(o[0], o[1]), new AMap.LngLat(t[0], t[1])] : null);
        if (!path) return;

        const walking = sg.mode !== 'drive';

        if (!walking) {
          const halo = new AMap.Polyline({
            path, strokeColor: d.color, strokeWeight: 14, strokeOpacity: .10,
            lineJoin: 'round', lineCap: 'round', zIndex: 28, bubble: true
          });
          halo.setMap(map);
          halos.push({ line: halo, day: d.id });
        }

        const line = new AMap.Polyline({
          path,
          strokeColor: d.color,
          strokeWeight: walking ? 2.5 : 4.5,
          strokeOpacity: .95,
          strokeStyle: walking ? 'dashed' : 'solid',
          strokeDasharray: walking ? [6, 6] : undefined,
          lineJoin: 'round',
          lineCap: 'round',
          zIndex: 30,
          cursor: 'pointer'
        });
        line.on('click', () => {
          window.selectDay(d.id);
          if (window.MapCtl) window.MapCtl.focusSegment(d.id, i);
        });
        line.setMap(map);
        segLines[d.id].push({ line, i, w: walking ? 2.5 : 4.5 });
      });
    });

    /* 序号标记 */
    markers = [];
    T.days.forEach(d => {
      const seen = new Set(), order = [];
      d.segments.forEach(sg => [sg.from, sg.to].forEach(id => {
        if (!seen.has(id)) { seen.add(id); order.push(id); }
      }));
      order.forEach((id, idx) => {
        const p = T.points[id];
        if (!p || !p.gcj) return;
        const dot = `<div class="bx" style="background:${d.color};color:#17120F">${idx + 1}</div>`;
        const full = `<div class="amk">${dot}<div class="lb">${p.name}</div></div>`;
        const only = `<div class="amk">${dot}</div>`;
        const m = new AMap.Marker({
          position: p.gcj,
          anchor: 'middle-left',
          zIndex: 60,
          content: full
        });
        m.setMap(null);
        markers.push({ day: d.id, m: m, full: full, only: only });
      });
    });
  }

  /* ---------------- 视图切换 ---------------- */
  function focusDay(id) {
    if (!map) return;
    window.__activeDay = id;

    Object.keys(segLines).forEach(dayId => {
      const on = (id === 'all' || dayId === id);
      segLines[dayId].forEach(o => {
        o.line.setOptions({ strokeOpacity: on ? .95 : .16, strokeWeight: on ? o.w : 2, zIndex: on ? 40 : 10 });
      });
    });

    halos.forEach(h => h.line.setOptions({
      strokeOpacity: (id === 'all' || h.day === id) ? .11 : .02
    }));

    markers.forEach(o => {
      if (id === 'all' || o.day === id) o.m.setMap(map); else o.m.setMap(null);
    });
    applyLabels();

    const overlays = [];
    Object.keys(segLines).forEach(dayId => {
      if (id === 'all' || dayId === id) segLines[dayId].forEach(o => overlays.push(o.line));
    });
    markers.forEach(o => { if (id === 'all' || o.day === id) overlays.push(o.m); });
    if (!overlays.length) return;

    const mob = window.innerWidth < 860;
    if (mob) {
      const panel = document.getElementById('mapPanel');
      if (panel && !panel.classList.contains('min')) return;   // 面板展开时不抢镜
      map.setFitView(overlays, false, [110, 20, 110, 20]);
    } else {
      map.setFitView(overlays, false, [150, 70, 90, 420]);
    }
    setTimeout(applyLabels, 700);
  }

  function focusSegment(dayId, idx) {
    if (!map) return;
    const target = (segLines[dayId] || []).filter(o => o.i === idx)[0];
    if (!target) return;
    map.setFitView([target.line], false, [180, 80, 100, 460]);
    target.line.setOptions({ strokeWeight: 7, strokeOpacity: 1, zIndex: 50 });
    setTimeout(() => target.line.setOptions({ strokeWeight: target.w, zIndex: 40 }), 1400);
  }

  function fitAll() { focusDay('all'); }

  /* 缩得太小时只留圆点，避免标签打架 */
  function applyLabels() {
    if (!map) return;
    const show = map.getZoom() >= 9.5;
    markers.forEach(o => { if (o.m.getMap()) o.m.setContent(show ? o.full : o.only); });
  }

  function toggleSat() {
    if (!map) return;
    if (!satLayer) {
      satLayer = new AMap.TileLayer.Satellite({ zIndex: 5 });
      satLayer.setMap(map);
      satOn = true;
    } else {
      satOn = !satOn;
      if (satOn) satLayer.setMap(map); else satLayer.setMap(null);
    }
    const b = $('#btnSat'); if (b) b.classList.toggle('on', satOn);
  }
})();
