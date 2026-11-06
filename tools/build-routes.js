/* 一次性构建：用高德 Driving 把所有路段算出来，写入 assets/js/routes.js */
const { chromium } = require('playwright-core');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',
    args: ['--host-resolver-rules=MAP trip-hz.fycheung.site 127.0.0.1']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('http://trip-hz.fycheung.site/tools/build/collect.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.AMap === 'object' && window.AMap.Driving, null, { timeout: 30000 });

  const jobs = await page.evaluate(() => {
    const out = [];
    window.TRIP.days.forEach(d => d.segments.forEach((s, i) => {
      if (s.mode !== 'drive') return;
      out.push({
        key: d.id + '-' + i,
        o: window.TRIP.points[s.from].gcj,
        t: window.TRIP.points[s.to].gcj
      });
    }));
    return out;
  });

  const result = {};
  for (const job of jobs) {
    let ok = null;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      ok = await page.evaluate(({ o, t }) => new Promise(res => {
        const dr = new AMap.Driving({ policy: AMap.DrivingPolicy.LEAST_TIME, map: null });
        let done = false;
        const guard = setTimeout(() => { if (!done) { done = true; res(null); } }, 25000);
        dr.search(new AMap.LngLat(o[0], o[1]), new AMap.LngLat(t[0], t[1]), (st, rs) => {
          if (done) return;
          done = true; clearTimeout(guard);
          if (st !== 'complete' || !rs.routes || !rs.routes.length) return res(null);
          const r = rs.routes[0];
          const path = [];
          (r.steps || []).forEach(s => (s.path || []).forEach(pt => {
            const a = [+pt.lng.toFixed(5), +pt.lat.toFixed(5)];
            const l = path[path.length - 1];
            if (!l || l[0] !== a[0] || l[1] !== a[1]) path.push(a);
          }));
          res({ path, km: +(r.distance / 1000).toFixed(1), min: Math.round(r.time / 60) });
        });
      }), job);
      if (!ok) { console.log('  retry', job.key); await page.waitForTimeout(1200); }
    }
    if (ok) { result[job.key] = ok; console.log('OK  ', job.key, ok.km + 'km', ok.min + 'min', 'pts=' + ok.path.length); }
    else console.log('FAIL', job.key);
  }

  const js = 'window.ROUTE_LINES = ' + JSON.stringify(result) + ';\n';
  fs.writeFileSync('assets/js/routes.js', js);
  console.log('\nwritten assets/js/routes.js', (js.length / 1024).toFixed(1) + ' KB');
  await browser.close();
})();
