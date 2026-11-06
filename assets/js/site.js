/* =========================================================
   页面渲染 · 动效 · 交互
   ========================================================= */
(function () {
  const T = window.TRIP;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = n => n.toLocaleString('en-US');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hmOr = m => !m ? '' : (m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m}min`);

  /* ---------------- HERO 数字 ---------------- */
  const stats = [
    { v: T.meta.totalDays, u: '天', k: '总天数', id: 'statDays' },
    { v: T.meta.driveDays, u: '天', k: '整自驾', id: 'statDriveDays' },
    { v: T.meta.driveKm || 0, u: 'km', k: '自驾里程', id: 'statKm' },
    { v: T.meta.nights, u: '晚', k: '住宿', dec: 0 },
    { v: T.meta.perPerson, u: '/人', k: '含机票', dec: 0, prefix: '¥' }
  ];
  $('#heroStats').innerHTML = stats.map(s => `
    <div class="hstat">
      <div class="v" ${s.id ? `id="${s.id}"` : ''} data-v="${s.v}" data-p="${s.prefix || ''}">${s.prefix || ''}${s.v || '—'}<small>${s.u}</small></div>
      <div class="k">${s.k}</div>
    </div>`).join('');

  function countUp(el) {
    if (el.dataset.fixed) return;
    const target = +el.dataset.v, p = el.dataset.p || '';
    const u = el.querySelector('small').outerHTML;
    if (reduce) { el.innerHTML = p + fmt(target) + u; return; }
    const dur = 1100, t0 = performance.now();
    (function step(t) {
      if (el.dataset.fixed) return;
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.innerHTML = p + fmt(Math.round(target * e)) + u;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------------- 每日行程 ---------------- */
  const TYPE_ICON = { drive: '🚗', key: '', stop: '', meal: '' };
  $('#dayList').innerHTML = T.days.map(d => `
    <article class="day rv" id="day-${d.id}" style="--dc:${d.color}">
      <div class="d-left">
        <div class="d-code"><i></i>${d.code}</div>
        <div class="d-date">${d.date} · ${d.weekday}</div>
        <h3 class="d-title">${esc(d.title)}</h3>
        <div class="d-tag">${esc(d.tag)}</div>
        <div class="d-wx">${d.weather.map(w => `<span class="wchip${/日落|日出/.test(w) ? ' w' : ''}">${esc(w)}</span>`).join('')}</div>
        <div class="d-mets">
          <div class="m"><div class="v" data-daykm="${d.id}">${d.km == null ? '—' : d.km}<small>km</small></div><div class="k">车程</div></div>
          <div class="m"><div class="v" data-minkm="${d.id}" style="font-size:15px">${hmOr(d.min) || esc(d.dur.split('（')[0])}</div><div class="k">纯驾驶</div></div>
          <div class="m"><div class="v" style="font-size:14px;letter-spacing:1px;color:${d.color}">${'★'.repeat(d.energy)}<span style="color:#3A342E">${'★'.repeat(5 - d.energy)}</span></div><div class="k">体力</div></div>
        </div>
      </div>
      <div class="d-right">
        ${d.blocks.map(b => `
          <div class="blk ${b.type || ''}">
            <div class="tm">${esc(b.t)}</div>
            <div class="ct">
              <div class="h">${esc(b.h)}${b.pill ? `<span class="pill${/禁|无|停运|确认|无加油站/.test(b.pill) ? ' r' : ''}">${esc(b.pill)}</span>` : ''}</div>
              <div class="d">${esc(b.d)}</div>
            </div>
          </div>`).join('')}
        ${d.fuse ? `<div class="blk"><div class="tm">熔断</div><div class="ct"><div class="d" style="color:#D9A0A0">${esc(d.fuse)}</div></div></div>` : ''}
        ${d.hotel ? `
          <div class="d-hotel">
            <div>
              <div class="lb">今晚住</div>
              <div class="nm">${esc(d.hotel.name)}</div>
              <div class="br">${esc(d.hotel.branch)}</div>
              <div class="wh">${esc(d.hotel.why)}</div>
            </div>
            <div class="pr">${esc(d.hotel.price)}</div>
            <div class="alt">备选　${esc(d.hotel.alt)}</div>
          </div>` : ''}
      </div>
    </article>`).join('');

  /* ---------------- 住宿 ---------------- */
  $('#stayList').innerHTML = T.days.filter(d => d.hotel).map((d, i) => `
    <div class="stay rv" style="--sc:${d.color};transition-delay:${i * 60}ms">
      <div class="d">${d.date} · ${d.weekday}</div>
      <div class="n">${esc(d.hotel.name)}</div>
      <div class="b">${esc(d.hotel.branch)}</div>
      <div class="p">${esc(d.hotel.price)}</div>
      <div class="w">${esc(d.hotel.why)}</div>
    </div>`).join('');

  /* ---------------- 预算 ---------------- */
  const max = Math.max(...T.budget.map(b => b.amount));
  $('#barList').innerHTML = T.budget.map(b => `
    <div class="bar-row">
      <div class="bar-top"><span class="n">${esc(b.item)}</span>
        <span class="v">¥${fmt(b.amount)}<span>人均 ¥${fmt(b.per)}</span></span></div>
      <div class="bar-tr"><div class="bar-fill" data-w="${(b.amount / max * 100).toFixed(1)}"></div></div>
      <div class="dd">${esc(b.detail)}</div>
    </div>`).join('');

  const total = T.budget.reduce((a, b) => a + b.amount, 0);
  $('#totBig').textContent = '¥' + fmt(total);
  $('#totPer').textContent = '¥' + fmt(Math.round(total / T.meta.people));
  $('#totNoAir').textContent = '¥' + fmt(total - T.budget[0].amount);

  /* ---------------- 提示 / 天气 / 装备 ---------------- */
  $('#tipList').innerHTML = T.tips.map((t, i) => `
    <div class="tip"><div class="no">${String(i + 1).padStart(2, '0')}</div>
      <div><div class="h">${esc(t.h)}</div><div class="d">${esc(t.d)}</div></div></div>`).join('');

  $('#tempList').innerHTML = T.temps.map(t => `
    <div class="trow">
      <span class="p">${esc(t.place)}<i>${esc(t.alt)}</i></span>
      <span class="t${/香炉|十八/.test(t.place) ? ' cool' : ''}">${esc(t.day)}</span>
      <span class="n">${esc(t.note)}</span>
    </div>`).join('');

  $('#gearList').innerHTML = T.gear.map(g => `
    <div><span class="k">${esc(g.k)}</span><span class="v">${esc(g.v)}</span></div>`).join('');

  /* =========================================================
     地图面板（与地图解耦：地图挂了也照样能看）
     ========================================================= */
  const Panel = {
    day: 'all',
    render(id) {
      this.day = id;
      const mpK = $('#mpK'), mpT = $('#mpT'), mpMets = $('#mpMets'), mpBody = $('#mpBody');
      if (id === 'all') {
        mpK.textContent = 'OVERVIEW';
        mpT.innerHTML = `全程 · 5 天`;
        mpMets.innerHTML = `
          <div><b>${T.meta.driveKm || '—'}</b> km<span>自驾里程</span></div>
          <div><b>${T.meta.driveDays}</b> 天<span>整自驾</span></div>
          <div><b>${T.meta.nights}</b> 晚<span>住宿</span></div>`;
        mpBody.innerHTML = T.days.map(d => `
          <div class="seg" data-day="${d.id}">
            <div class="ic" style="color:${d.color}">${d.code}</div>
            <div>
              <div class="nm">${esc(d.title)}</div>
              <div class="nt">${d.date} · ${esc(d.tag)}</div>
            </div>
            <div class="mt">${d.km == null ? '—' : d.km + 'km'}</div>
          </div>`).join('');
      } else {
        const d = T.days.find(x => x.id === id);
        mpK.textContent = `${d.code} · ${d.date} ${d.weekday}`;
        mpT.innerHTML = `<span class="sw" style="background:${d.color}"></span>${esc(d.title)}`;
        mpMets.innerHTML = `
          <div><b>${d.km == null ? '—' : d.km}</b> km<span>车程</span></div>
          <div><b>${hmOr(d.min) || esc(d.dur.split('（')[0])}</b><span>纯驾驶</span></div>
          <div><b>${'★'.repeat(d.energy)}</b><span>体力</span></div>`;
        mpBody.innerHTML = d.segments.map((s, i) => {
          const mt = s.mode === 'drive'
            ? (s.km ? `${s.km < 1 ? Math.round(s.km * 1000) + 'm' : s.km.toFixed(0) + 'km'} / ${s.min >= 60 ? Math.floor(s.min / 60) + 'h' + String(s.min % 60).padStart(2, '0') : s.min + 'min'}` : '···')
            : '步行';
          return `
          <div class="seg ${s.mode}" data-day="${d.id}" data-seg="${i}">
            <div class="ic">${s.mode === 'drive' ? '🚗' : '·'}</div>
            <div>
              <div class="nm">${esc(s.label)}</div>
              <div class="nt">${esc(s.note)}</div>
            </div>
            <div class="mt">${mt}</div>
          </div>`;
        }).join('');
      }
      $$('#dayTabs .dtab').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    },
    /* 高德返回真实里程后回填（当前面板可见时立即刷新） */
    metric(dayId, segIdx, km, min) {
      if (this.day !== dayId) return;
      this.render(dayId);
    }
  };
  window.PanelAPI = Panel;

  /* ---------------- DAY TABS ---------------- */
  $('#dayTabs').innerHTML =
    `<button class="dtab on" data-id="all"><span class="code">ALL</span>全程</button>` +
    T.days.map(d => `<button class="dtab" data-id="${d.id}">
        <span class="dot" style="background:${d.color}"></span>
        <span class="code">${d.code}</span>${d.date}</button>`).join('');

  function selectDay(id) {
    const panel = document.getElementById('mapPanel');
    if (panel && window.innerWidth < 860 && !panel.classList.contains('min')) {
      panel.classList.add('min');
      document.body.classList.add('panel-min');
    }
    Panel.render(id);
    if (window.MapCtl) window.MapCtl.focusDay(id);
  }
  window.selectDay = selectDay;

  document.addEventListener('click', e => {
    const tab = e.target.closest('#dayTabs .dtab');
    if (tab) { selectDay(tab.dataset.id); return; }

    const seg = e.target.closest('.mp-body .seg');
    if (seg) {
      const dayId = seg.dataset.day;
      if (seg.dataset.seg === undefined) { selectDay(dayId); return; }
      $$('.mp-body .seg').forEach(s => s.classList.remove('on'));
      seg.classList.add('on');
      if (window.MapCtl) window.MapCtl.focusSegment(dayId, +seg.dataset.seg);
      return;
    }

    const jump = e.target.closest('[data-goto]');
    if (jump) { selectDay(jump.dataset.goto); }
  });

  Panel.render('all');

  /* 真实里程回来后刷新数字 */
  window.addEventListener('routes:ready', () => {
    const km = T.meta.driveKm;
    const sk = document.getElementById('statKm');
    if (sk && km) { sk.dataset.fixed = '1'; sk.innerHTML = fmt(km) + '<small>km</small>'; }
    $$('[data-daykm]').forEach(el => {
      const d = T.days.find(x => x.id === el.dataset.daykm);
      if (d && d.km != null) el.innerHTML = d.km + '<small>km</small>';
    });
    $$('[data-minkm]').forEach(el => {
      const d = T.days.find(x => x.id === el.dataset.minkm);
      if (d && d.min) el.textContent = hmOr(d.min);
    });
    const bk = document.getElementById('budgetKm');
    if (bk && km) bk.textContent = km + ' km';
    Panel.render(Panel.day);
  });

  /* ---------------- 滚动：进度 / 导航 / 揭示 ---------------- */
  const nav = $('#nav'), bar = $('#progress');
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('solid', y > 40);
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const secs = ['map', 'days', 'stays', 'budget', 'notes'].map(id => document.getElementById(id)).filter(Boolean);
  const spy = new IntersectionObserver(es => {
    es.forEach(en => {
      if (!en.isIntersecting) return;
      $$('.nav-links a').forEach(a =>
        a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => spy.observe(s));

  const rev = new IntersectionObserver(es => {
    es.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); rev.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .06 });
  $$('.rv').forEach(el => rev.observe(el));

  const heroIO = new IntersectionObserver(es => {
    es.forEach(en => {
      if (!en.isIntersecting) return;
      heroIO.disconnect();
      $$('#heroStats .v').forEach((el, i) => setTimeout(() => countUp(el), i * 90));
    });
  }, { threshold: .3 });
  heroIO.observe($('#heroStats'));

  /* 预算条 / 计数：进入视口再动 */
  const budIO = new IntersectionObserver(es => {
    es.forEach(en => {
      if (!en.isIntersecting) return;
      $$('.bar-fill').forEach((el, i) => setTimeout(() => { el.style.width = el.dataset.w + '%'; }, i * 70));
      const big = $('#totBig');
      if (!reduce) {
        const t0 = performance.now(), dur = 1200;
        (function step(t) {
          const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          big.textContent = '¥' + fmt(Math.round(total * e));
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      } else { big.textContent = '¥' + fmt(total); }
      budIO.disconnect();
    });
  }, { threshold: .25 });
  budIO.observe($('#barList'));

  /* ---------------- 落叶 ---------------- */
  (function leaves() {
    if (reduce) return;
    const cv = $('#leaves');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const COLORS = ['#D4503A', '#E08D3C', '#C9A232', '#A8452F', '#8FA86B'];
    let W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    let parts = [], running = true;

    function size() {
      const r = cv.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function make(init) {
      return {
        x: Math.random() * W,
        y: init ? Math.random() * H : -40,
        s: 5 + Math.random() * 13,
        vy: .22 + Math.random() * .55,
        vx: -.25 + Math.random() * .5,
        rot: Math.random() * Math.PI * 2,
        vr: (-.006 + Math.random() * .012),
        sw: Math.random() * Math.PI * 2,
        sws: .004 + Math.random() * .01,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        a: .07 + Math.random() * .16
      };
    }

    function path(s) {
      ctx.beginPath();
      ctx.moveTo(0, s * .95);
      ctx.bezierCurveTo(-s * .12, s * .45, -s * .2, s * .22, -s * .52, s * .12);
      ctx.lineTo(-s * .28, -s * .04);
      ctx.lineTo(-s * .72, -s * .32);
      ctx.lineTo(-s * .33, -s * .33);
      ctx.lineTo(-s * .5, -s * .82);
      ctx.lineTo(-s * .11, -s * .52);
      ctx.lineTo(0, -s * .92);
      ctx.lineTo(s * .11, -s * .52);
      ctx.lineTo(s * .5, -s * .82);
      ctx.lineTo(s * .33, -s * .33);
      ctx.lineTo(s * .72, -s * .32);
      ctx.lineTo(s * .28, -s * .04);
      ctx.lineTo(s * .52, s * .12);
      ctx.bezierCurveTo(s * .2, s * .22, s * .12, s * .45, 0, s * .95);
      ctx.closePath();
    }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      parts.forEach(p => {
        p.y += p.vy; p.sw += p.sws; p.x += p.vx + Math.sin(p.sw) * .5; p.rot += p.vr;
        if (p.y > H + 60 || p.x < -80 || p.x > W + 80) Object.assign(p, make(false));
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
        path(p.s); ctx.fill();
        ctx.restore();
      });
      requestAnimationFrame(frame);
    }

    function boot() {
      size();
      parts = Array.from({ length: Math.max(12, Math.round(W / 80)) }, () => make(true));
      frame();
    }

    window.addEventListener('resize', () => { size(); });
    new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting && !running) { running = true; frame(); }
        else if (!e.isIntersecting) { running = false; }
      });
    }, { threshold: 0 }).observe(cv);

    boot();
  })();
})();
