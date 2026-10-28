/* scalewithluv demo: a client's Google Sheet, faked inside the browser.
   It runs the REAL Register script (Code.gs) over made-up data, so the dashboard, the manager app and the console
   behave exactly like a live client. Requests to https://script.google.com/macros/s/DEMOn/exec never leave the page;
   every change is kept in this browser only (localStorage) and is shared by the three apps on this site.
   Google sign-in is replaced by a "Continue as … (demo)" button. Built by tools/build.sh; nothing private inside. */
(function () {
  'use strict';
  const CODE = /*__CODE_GS__*/'';
  const SEED = /*__SEED__*/{base: '2026-01-15', tabs: {}};
  const PAGE = (window.SWL_DEMO || {}).page || 'dashboard';
  const OWNER = {email: 'owner@pinewood.demo', name: 'Riya Sharma'}, LUV = {email: 'you@scalewithluv.demo', name: 'You (demo)'};
  const CID = 'demo-cid', CKEY = 'demo-console-key', BOT = 'demo-bot-key', MGR = {login: 'asha', password: 'pinewood123'};
  const CLIENTS = {   // DEMO1 is the full showcase (dashboard + manager app); 2 and 3 only fill the console's client list
    DEMO1: {name: 'Pinewood Stays Register', stays: null},
    DEMO2: {name: 'Parvati Valley Homes Register', stays: ['P07', 'P08', 'P09', 'P10', 'P11']},
    DEMO3: {name: 'Ridge & Pine Shimla Register', stays: ['P12', 'P13', 'P14', 'P15', 'P16']}};
  const VERSION = 1;   // bump to make every visitor start again from fresh demo data

  /* ---------- bytes, hashes (Apps Script hands bytes around as signed arrays) ---------- */
  const enc = new TextEncoder();
  const toBytes = x => typeof x === 'string' ? Array.from(enc.encode(x)) : Array.from(x, b => b & 255);
  const signed = a => a.map(b => (b > 127 ? b - 256 : b));
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
    0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
    0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70,
    0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function sha256(bytes) {
    const l = bytes.length, m = bytes.concat([0x80]);
    while (m.length % 64 !== 56) m.push(0);
    const bits = l * 8;
    for (let i = 7; i >= 0; i--) m.push(i > 3 ? 0 : (bits >>> (i * 8)) & 255);
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64);
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < m.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = (m[o + i * 4] << 24) | (m[o + i * 4 + 1] << 16) | (m[o + i * 4 + 2] << 8) | m[o + i * 4 + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
    }
    const out = [];
    H.forEach(v => out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255));
    return out;
  }
  function hmac(msg, key) {
    let k = key.length > 64 ? sha256(key) : key.slice();
    while (k.length < 64) k.push(0);
    return sha256(k.map(b => b ^ 0x5c).concat(sha256(k.map(b => b ^ 0x36).concat(msg))));
  }
  const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.slice(i, i + 8192).map(b => b & 255)); return btoa(s); };
  const unb64 = s => { const t = atob(String(s)); const a = new Array(t.length); for (let i = 0; i < t.length; i++) a[i] = t.charCodeAt(i); return a; };
  const jwt = u => 'demo.' + btoa(JSON.stringify({email: u.email, name: u.name, aud: CID, exp: Math.floor(Date.now() / 1000) + 3600})).replace(/=+$/, '') + '.demo';

  /* ---------- dates: the seed was written around SEED.base; move it so base = today ---------- */
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const TODAY = ymd(new Date());
  const SHIFT = Math.round((new Date(TODAY + 'T12:00:00Z') - new Date(SEED.base + 'T12:00:00Z')) / 864e5);
  const shift = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)
    ? ymd(new Date(new Date(v.slice(0, 10) + 'T12:00:00').getTime() + SHIFT * 864e5)) + v.slice(10) : v;

  /* ---------- one fake spreadsheet per demo client, kept in localStorage ---------- */
  const SKEY = cid => `swl_demo_${cid}_v${VERSION}`;
  const pack = st => JSON.stringify(st, (k, v) => (v instanceof Date ? {__d: v.toISOString()} : v));
  const unpack = s => JSON.parse(s, (k, v) => (v && typeof v === 'object' && v.__d ? new Date(v.__d) : v));
  const engines = {};

  function engine(cid) {
    if (engines[cid]) return engines[cid];
    let ST = null, stamp = null;
    try { const s = localStorage.getItem(SKEY(cid)); if (s) { ST = unpack(s); stamp = ST.stamp; } } catch (e) { ST = null; }
    const fresh = !ST;
    if (fresh) ST = {stamp: 0, sheets: {}, fmts: {}, props: {}, cache: {}, files: [], folders: {}, triggers: []};
    const save = () => { ST.stamp = Date.now() + Math.random(); stamp = ST.stamp;
      try { localStorage.setItem(SKEY(cid), pack(ST)); } catch (e) { console.warn('[demo] browser storage full: changes kept until you reload', e); } };
    const sync = () => { try { const s = localStorage.getItem(SKEY(cid)); if (s) { const o = unpack(s); if (o.stamp !== stamp) { Object.assign(ST, o); stamp = o.stamp; } } } catch (e) {} };

    function sheet(name) {
      const rows = () => ST.sheets[name] || (ST.sheets[name] = []);
      const range = (r, c, nr = 1, nc = 1) => ({
        getValues: () => Array.from({length: nr}, (_, i) => Array.from({length: nc}, (_, j) => ((rows()[r - 1 + i] || [])[c - 1 + j] ?? ''))),
        setValues: v => v.forEach((row, i) => row.forEach((x, j) => { const R = rows(); (R[r - 1 + i] = R[r - 1 + i] || [])[c - 1 + j] = x; })),
        setValue: x => { const R = rows(); (R[r - 1] = R[r - 1] || [])[c - 1] = x; },
        clearContent: () => { const R = rows(); for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (R[r - 1 + i]) R[r - 1 + i][c - 1 + j] = ''; },
        setNumberFormat: f => { ST.fmts[name + '!' + r + ':' + c] = f; },
        getNumberFormat: () => ST.fmts[name + '!' + r + ':' + c] || 'General'});
      return {getName: () => name, getDataRange: () => ({getValues: () => rows().length ? rows().map(x => x.slice()) : [[]]}), getRange: range,
        getLastRow: () => rows().length, getLastColumn: () => Math.max(0, ...rows().map(x => x.length)), appendRow: x => { rows().push(x.slice()); },
        deleteRow: i => { rows().splice(i - 1, 1); }, clear: () => { rows().splice(0); }, setName: n => { ST.sheets[n] = rows(); delete ST.sheets[name]; },
        copyTo: () => ({setName: () => {}})};
    }
    const ss = {getId: () => 'SS-' + cid, getName: () => CLIENTS[cid].name, getUrl: () => '#', getSpreadsheetTimeZone: () => 'Asia/Kolkata',
      getSheetByName: n => (ST.sheets[n] ? sheet(n) : null), insertSheet: n => { ST.sheets[n] = []; return sheet(n); }};
    const ics = u => {   // made-up OTA calendars: two reserved spells per link; holidays for the holiday calendar
      const day = n => ymd(new Date(Date.now() + n * 864e5)).replace(/-/g, ''), NL = '\r\n';
      const ev = (a, b, s, id) => ['BEGIN:VEVENT', 'DTSTART;VALUE=DATE:' + day(a), 'DTEND;VALUE=DATE:' + day(b), 'UID:' + id, 'SUMMARY:' + s, 'END:VEVENT'].join(NL);
      const evs = /holiday/.test(u) ? [ev(20, 21, 'Republic Day', 'h1'), ev(48, 49, 'Holi', 'h2')] : [ev(6, 8, 'Reserved', 'a' + u.length), ev(21, 23, 'Reserved', 'b' + u.length)];
      return ['BEGIN:VCALENDAR', 'VERSION:2.0'].concat(evs, ['END:VCALENDAR']).join(NL) + NL;
    };
    const ctx = {
      SpreadsheetApp: {getActive: () => ss, openById: () => ss},
      PropertiesService: {getScriptProperties: () => ({getProperty: k => (k in ST.props ? ST.props[k] : null), setProperty: (k, v) => { ST.props[k] = String(v); },
        deleteProperty: k => { delete ST.props[k]; }, getProperties: () => ({...ST.props}), getKeys: () => Object.keys(ST.props)})},
      LockService: {getScriptLock: () => ({waitLock: () => {}, tryLock: () => true, releaseLock: () => {}, hasLock: () => true})},
      CacheService: {getScriptCache: () => ({get: k => (k in ST.cache ? ST.cache[k] : null), put: (k, v) => { ST.cache[k] = String(v); },
        getAll: ks => Object.fromEntries(ks.filter(k => k in ST.cache).map(k => [k, ST.cache[k]])), putAll: o => Object.assign(ST.cache, o),
        remove: k => { delete ST.cache[k]; }, removeAll: ks => ks.forEach(k => delete ST.cache[k])})},
      ContentService: {createTextOutput: t => ({_t: t, setMimeType() { return this; }, getContent: () => t}), MimeType: {JSON: 'json', TEXT: 'text'}},
      UrlFetchApp: {
        fetch(u) { u = String(u);
          const ok = (t, bytes) => ({getResponseCode: () => 200, getContentText: () => t, getContent: () => bytes || toBytes(t), getBlob: () => ({getBytes: () => bytes || toBytes(t)})});
          if (/tokeninfo/.test(u)) {   // Google's sign-in check: the demo token says who it is
            try { const p = JSON.parse(atob(decodeURIComponent(u.split('id_token=')[1]).split('.')[1]));
              return ok(JSON.stringify({aud: CID, iss: 'https://accounts.google.com', email: p.email, email_verified: 'true', exp: String(p.exp)})); }
            catch (e) { return {getResponseCode: () => 400, getContentText: () => '{}'}; } }
          if (/\.ics|holiday|calendar/.test(u)) return ok(ics(u));
          if (/export\?format=xlsx/.test(u)) return ok('', toBytes('PK demo workbook'));
          return ok('{}'); },
        fetchAll(rs) { return rs.map(r => this.fetch(r.url || r)); }},
      Maps: {newGeocoder: () => ({reverseGeocode: (la, lo) => ({results: [{formatted_address: `Near ${(+la).toFixed(3)}, ${(+lo).toFixed(3)}, Himachal Pradesh`}]})})},
      Utilities: {getUuid: () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()), DigestAlgorithm: {SHA_256: 'sha256', MD5: 'md5'},
        base64Decode: s => signed(unb64(s)), base64Encode: b => b64(toBytes(b)), sleep: () => {},
        newBlob: (bytes, mime, name) => ({mime, name, getBytes: () => signed(toBytes(bytes || '')), getName: () => name, setName(n) { this.name = n; return this; }}),
        zip: (blobs, name) => ({name, getName: () => name}),
        computeHmacSha256Signature: (v, k) => signed(hmac(toBytes(v), toBytes(k))),
        computeDigest: (_, t) => signed(sha256(toBytes(t))),
        formatDate: (d, tz, f) => { const p = new Date(new Date(d).getTime() + 330 * 60000).toISOString();
          return String(f).replace(/'T'/g, 'T').replace('yyyy', p.slice(0, 4)).replace('MM', p.slice(5, 7)).replace('dd', p.slice(8, 10))
            .replace('HH', p.slice(11, 13)).replace('mm', p.slice(14, 16)).replace('ss', p.slice(17, 19)); }},
      Session: {getScriptTimeZone: () => 'Asia/Kolkata', getActiveUser: () => ({getEmail: () => ''})},
      Logger: {log: () => {}},
      DriveApp: {Access: {ANYONE_WITH_LINK: 'anyone'}, Permission: {VIEW: 'view'},
        _file(f) { return Object.assign(f, {getId: () => f.id, getName: () => f.name, getUrl: () => '#', setSharing() {}, addViewer(e) { f.viewers.push(e); },
          setTrashed(v) { f.trashed = v; }, isTrashed: () => !!f.trashed, getDateCreated: () => new Date(f.at), getSize: () => 2048}); },
        _folder(id) { const D = this, F = ST.folders[id];
          const list = pred => { const hits = ST.files.filter(x => x.folder === id && !x.trashed && pred(x)).map(x => D._file(x)); let i = 0; return {hasNext: () => i < hits.length, next: () => hits[i++]}; };
          return {getId: () => id, getName: () => F.name, getUrl: () => '#',
            createFile: b => { const f = {id: 'D' + ST.files.length + '-' + cid, name: (b && (b.name || (b.getName && b.getName()))) || 'file', folder: id, viewers: [], at: Date.now()};
              ST.files.push(f); return D._file(f); },
            getFilesByName: n => list(x => x.name === n), getFiles: () => list(() => true)}; },
        getFolderById(id) { if (!ST.folders[id]) throw new Error('no folder'); return this._folder(id); },
        createFolder(name) { const id = 'F' + Object.keys(ST.folders).length + '-' + cid; ST.folders[id] = {name}; return this._folder(id); },
        getRootFolder() { return {}; },
        getFileById() { const D = this; return {makeCopy(name, folder) { const f = folder.createFile({name}); return f; }, getName: () => 'copy', setTrashed() {}}; }},
      ScriptApp: {getProjectTriggers: () => ST.triggers.map(t => ({getHandlerFunction: () => t})), deleteTrigger: t => { ST.triggers = ST.triggers.filter(x => x !== t.getHandlerFunction()); },
        newTrigger: fn => { const b = {timeBased: () => b, everyDays: () => b, everyHours: () => b, everyMinutes: () => b, atHour: () => b, nearMinute: () => b, create: () => { ST.triggers.push(fn); return {getHandlerFunction: () => fn}; }}; return b; },
        getOAuthToken: () => 'demo'},
      MailApp: {sendEmail: () => {}, getRemainingDailyQuota: () => 100},
    };
    const names = Object.keys(ctx);
    const gs = new Function(...names, CODE + '\n;return {doPost: doPost, doGet: doGet};')(...names.map(n => ctx[n]));
    const text = r => (r && typeof r === 'object' && '_t' in r ? r._t : String(r));
    const post = body => text(gs.doPost({postData: {contents: body}, parameter: {}}));
    const E = {post: body => { sync(); const out = post(body); save(); return out; },
      get: q => { sync(); const out = text(gs.doGet({parameter: q})); save(); return out; }};

    if (fresh) {   // first visit: build the sheet from the showcase seed, then sign the demo people in
      const want = CLIENTS[cid].stays;
      Object.entries(SEED.tabs).forEach(([name, rows]) => {
        rows = rows.filter(r => !want || !r.property_id || r.property_id === '*' || want.includes(r.property_id));
        const head = [];
        rows.forEach(r => Object.keys(r).forEach(k => { if (!head.includes(k)) head.push(k); }));
        ST.sheets[name] = [head, ...rows.map(r => head.map(h => { const v = shift(r[h]);
          return v == null ? '' : Array.isArray(v) ? (['amenities', 'includes', 'tags'].includes(h) ? v.join(', ') : JSON.stringify(v)) : typeof v === 'object' ? JSON.stringify(v) : v; }))];
      });
      Object.assign(ST.props, {BOT_KEY: BOT, CONSOLE_KEY: CKEY, CONSOLE_OWNER: LUV.email, CONSOLE_GOOGLE_CLIENT_ID: CID, DASHBOARD_KEY: 'demo-dashboard-key'});
      const J = s => JSON.parse(post(JSON.stringify(s)));
      const owner = J({action: 'login', id_token: jwt(OWNER), device: 'Demo setup'}).session;
      if (owner) {
        J({key: owner, action: 'staff_password', match: {login: MGR.login}, password: MGR.password});
        J({key: owner, action: 'staff_password', match: {login: 'karan'}, password: MGR.password});
        if (cid === 'DEMO1') enrich(J, owner);
      }
      save();
    } else stamp = ST.stamp;
    return (engines[cid] = E);
  }

  /* extra life for the showcase: an AI insights run, a revenue goal, a manager's claim, issue and review follow-up */
  function enrich(J, owner) {
    const k = TODAY.slice(0, 7), nk = (() => { const d = new Date(TODAY + 'T12:00:00'); d.setMonth(d.getMonth() + 1); return ymd(d).slice(0, 7); })();
    J({key: owner, action: 'append', tab: 'settings', row: {key: 'ops.revenue_goals', value: JSON.stringify({[k]: 1450000})}});
    J({key: owner, action: 'append', tab: 'settings', row: {key: 'ai.context', value: 'Demo business: all numbers are made up.'}});
    const item = (id, city, wd, we, sw, se, lvl) => ({stay_id: id, stay: id, city, month: k, listed: {wd, we}, suggested: {wd: sw, we: se}, level: lvl,
      booked_now_pct: 58, nights_left: 13, last_year_occ: 84, paid_last_year: {wd: wd * .82, we: we * .85}, paid_last_90_days: {wd: wd * .86, we: we * .9},
      market: {wd: {low: wd * .88, mid: wd * 1.03, high: wd * 1.2, n: 5}, we: {low: we * .92, mid: we * 1.1, high: we * 1.25, n: 4}, comps: 5},
      vs_market_pct: {wd: -3, we: -9}, festivals: []});
    J({key: BOT, action: 'insights_save', run_id: 'RDEMO1', rows: [
      {section: '_meta', data: JSON.stringify({generated_at: TODAY + 'T06:00:00', model: 'claude-haiku-5-5', cost_inr: 0.24, status: 'done', batch: true})},
      {section: '_ai', data: JSON.stringify({moves: [
        {id: 'M-oak-weekends', status: 'new', title: 'Raise Oak House weekends by 10%', why: 'Weekends ran 93% full last month', action: '+10% on Fri-Sat for the next 6 weeks', gain_inr: 18500, stay_id: 'P01'},
        {id: 'M-katagla-weekdays', status: 'still_true', title: 'Fill weekday gaps at Katagla Studio', why: 'Weekdays only 41% full', action: '3-night weekday offer, 10% off', gain_inr: 7200, stay_id: 'P10'},
        {id: 'M-ridge-direct', status: 'new', title: 'Push direct bookings for Ridge View', why: '38% of its stays came back as repeat guests', action: 'Send past guests the 5% direct offer on WhatsApp', gain_inr: 9400, stay_id: 'P12'}],
        dropped: [{id: 'M-monsoon', title: 'Monsoon long-stay offer', reason: 'Season is over'}],
        pricing: [{stay_id: 'P01', month: k, headline: 'Weekends ₹9,900, up from ₹8,970', why: ['84% full this month last year', 'Similar stays ask ₹8,800-11,200 on weekends', 'Already 58% booked with 13 nights left'], risk: 'If under 60% booked by the 20th, go back to ₹8,970.'},
                  {stay_id: 'P12', month: k, headline: 'Prices look right', why: [], risk: ''}],
        underpriced: {summary: 'Two stays ran 85%+ full at a flat price.', items: []}, festivals: {summary: 'Long weekends book 3 weeks out.', items: []},
        weekday: {summary: 'Weekdays lag weekends by 30 points.', suggestion: 'Offer 3-night weekday stays.'}, price_changes: {summary: 'Last price rises held up.'},
        gaps: {summary: 'Few single-night gaps.', suggestion: 'Allow 1-night fills 3 days out.'}, groups: {summary: 'Groups above base size are common.', suggestion: 'Charge the extra-guest fee.'},
        lean: {summary: 'Late February is the lean spell.', items: []}, scorecard: []})},
      {section: 'pricing', data: JSON.stringify([item('P01', 'Manali', 7800, 8970, 7800, 9900, 'raise'), item('P12', 'Shimla', 5200, 5980, 5200, 5980, 'hold')])},
      {section: 'stays', data: JSON.stringify([{stay_id: 'P01', stay: 'Oak House'}, {stay_id: 'P12', stay: 'Ridge View Apartment'}])},
      {section: 'notes', data: JSON.stringify(['Demo analysis: made-up numbers.'])}]});
    J({key: owner, action: 'bulk_append', tab: 'market', batch_id: 'MKDEMO01', rows: [['Snow Nest', 5, 8600], ['Snow Nest', 6, 10200], ['Deodar Den', 7, 7900], ['Deodar Den', 8, 9800], ['Orchard Nook', 9, 8300]]
      .map(([c, d, p], i) => ({obs_id: 'MKD' + i, property_id: 'P01', comp_name: c, platform: 'Airbnb', night: k + '-' + String(d + 10), price: p, observed_on: TODAY}))});
    J({key: owner, action: 'append', tab: 'ideas', row: {idea_id: 'IDDEMO1', title: 'Weekday offer at Katagla Studio', status: 'Implemented', implemented_on: TODAY, property_id: 'P10', insight_key: 'M-old', created_at: TODAY + 'T09:00', category: 'move'}});
    const mgr = J({action: 'login_pw', login: MGR.login, password: MGR.password, device: 'Demo setup'}).session;
    if (mgr) {
      J({key: mgr, action: 'append', tab: 'claims', row: {claim_id: 'CLDEMO1', property_id: 'P03', date: TODAY, category: 'Repairs', amount: 850, note: 'Plumber visit, tap washer', submitted_at: TODAY + 'T09:00'}});
      J({key: mgr, action: 'append', tab: 'maintenance', row: {ticket_id: 'MRDEMO1', property_id: 'P04', issue: 'Ceiling fan noisy in bedroom 2', priority: 'Medium', reported_on: TODAY}});
      J({key: mgr, action: 'logout'});
    }
    nk;   // (next month kept for future pricing rows)
  }

  /* ---------- the page's requests to a demo sheet are answered here ---------- */
  const realFetch = window.fetch.bind(window), RX = /^https:\/\/script\.google\.com\/macros\/s\/(DEMO\d)\/exec/;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let consoleReady = null;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input && input.url, m = RX.exec(String(url || ''));
    if (!m) return realFetch(input, init);
    if (consoleReady) await consoleReady;
    await wait(120 + Math.random() * 260);   // feels like a real sheet, just quicker
    const E = engine(m[1]), method = String(init && init.method || 'GET').toUpperCase();
    let out;
    try {
      if (method === 'POST') {
        let body = String(init.body || '{}');
        out = E.post(body);
        const req = JSON.parse(body);
        if (req.action === 'upload' && req.data) {   // photos stay in this browser: hand back a data link instead of Drive
          const j = JSON.parse(out); if (j.ok) { j.url = j.thumb = `data:${req.mime};base64,${req.data}`; out = JSON.stringify(j); } }
      } else out = E.get(Object.fromEntries(new URL(url).searchParams));
    } catch (e) { console.error('[demo sheet]', e); out = JSON.stringify({error: 'demo: ' + e.message}); }
    return new Response(out, {status: 200, headers: {'Content-Type': 'application/json'}});
  };

  /* ---------- Google sign-in stand-in ---------- */
  const who = PAGE === 'console' ? LUV : OWNER;
  if (!window.google) window.google = {accounts: {id: {_cb: null,
    initialize(o) { this._cb = o && o.callback; },
    renderButton(el) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn primary';
      b.textContent = `Continue as ${who.name} (demo)`; b.style.cssText = 'padding:10px 18px;border-radius:999px;font:600 15px Inter,system-ui,sans-serif;cursor:pointer';
      b.onclick = () => this._cb && this._cb({credential: jwt(who)}); el.replaceChildren(b); },
    prompt() { setTimeout(() => this._cb && this._cb({credential: jwt(who)}), 60); },
    disableAutoSelect() {}, cancel() {}, revoke(e, cb) { cb && cb(); }}}};

  /* ---------- first visit to a page: already signed in, so the demo opens straight away ---------- */
  const once = k => { try { if (localStorage.getItem(k)) return false; localStorage.setItem(k, '1'); return true; } catch (e) { return false; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  try {
    if (PAGE === 'dashboard' && once(`swl_demo_in_dash_v${VERSION}`)) {
      const j = JSON.parse(engine('DEMO1').post(JSON.stringify({action: 'login', id_token: jwt(OWNER), device: 'Demo · dashboard'})));
      if (j.session) { put('jg_session', j.session); put('jg_me', j.user); }
    }
    if (PAGE === 'manager' && once(`swl_demo_in_mgr_v${VERSION}`)) {
      const j = JSON.parse(engine('DEMO1').post(JSON.stringify({action: 'login_pw', login: MGR.login, password: MGR.password, device: 'Demo · phone'})));
      if (j.session) { put('mg_session', j.session); put('mg_me', j.user); }
    }
    if (PAGE === 'console' && once(`swl_demo_in_con_v${VERSION}`)) consoleSetup();
  } catch (e) { console.error('[demo]', e); }

  /* the console opens with all three clients connected, each on a plan (Pro, Growth, Base) and one payment overdue */
  function consoleSetup() {
    const PLANS = {DEMO1: ['pro', ['geotag', 'campaigns'], 'active', 25], DEMO2: ['growth', [], 'active', 10], DEMO3: ['base', [], 'grace', -3]};
    const sessions = {};
    Object.keys(CLIENTS).forEach(c => {
      const id = 'demo-' + c.slice(4), j = JSON.parse(engine(c).post(JSON.stringify({action: 'console_login', key: CKEY, id_token: jwt(LUV), device: 'Demo console'})));
      put('swl_key_' + id, CKEY);
      if (j.session) { sessions[c] = j.session; put('swl_sess_' + id, {s: j.session, exp: Date.now() + (j.hours || 720) * 3600e3 - 60e3}); }
    });
    let done;
    consoleReady = new Promise(r => { done = r; });
    addEventListener('DOMContentLoaded', () => {   // tiers.js has loaded: write the plan rows the way the console would
      try {
        Object.entries(PLANS).forEach(([c, [tier, addons, status, dueIn]]) => {
          if (!sessions[c] || !window.SWL) return;
          const cp = SWL.compose(tier, addons), due = ymd(new Date(Date.now() + dueIn * 864e5)), paid = ymd(new Date(Date.now() + (dueIn - 30) * 864e5));
          const rows = [['console.tier', tier], ...Object.entries(cp.features).map(([k, v]) => ['console.feature.' + k, v]),
            ...Object.entries(cp.limits).map(([k, v]) => ['console.limit.' + k, v]), ...Object.entries(cp.models).map(([k, v]) => ['console.model.' + k, v]),
            ['console.billing.amount', cp.price], ['console.addons', JSON.stringify(addons)], ['console.billing.due', due],
            ['console.billing.last_paid', paid], ['console.billing.status', status], ['console.billing.auto', 'automatic']];
          rows.forEach(([name, value]) => engine(c).post(JSON.stringify({key: sessions[c], action: 'console_set', name, value: String(value)})));
          engine(c).post(JSON.stringify({key: sessions[c], action: 'console_daily', on: true}));
          engine(c).post(JSON.stringify({key: sessions[c], action: 'console_backup'}));
        });
      } catch (e) { console.error('[demo console]', e); }
      done();
    });
  }

  /* ---------- a small "demo" tag with a reset ---------- */
  function reset() {
    try { Object.keys(localStorage).filter(k => /^(swl_|jg_|mg_)/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    try { indexedDB.deleteDatabase('mg_outbox'); } catch (e) {}
    location.reload();
  }
  window.SWL_DEMO_RESET = reset;
  addEventListener('DOMContentLoaded', () => {
    const t = document.createElement('div');
    t.setAttribute('role', 'note');
    const low = PAGE === 'manager' ? 84 : 10;   // the manager app has its tab bar along the bottom
    t.style.cssText = `position:fixed;left:10px;bottom:calc(${low}px + env(safe-area-inset-bottom));z-index:2147483000;display:flex;gap:8px;align-items:center;` +
      'padding:6px 8px 6px 12px;border-radius:999px;background:rgba(20,22,28,.86);color:#fff;font:600 12px/1.2 Inter,system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.25);backdrop-filter:blur(8px)';
    const msg = PAGE === 'manager' ? `Demo · ${MGR.login} / ${MGR.password}` : 'Demo · made-up data';
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = 'Reset';
    b.style.cssText = 'border:0;border-radius:999px;padding:5px 10px;background:#fff;color:#111;font:600 12px Inter,system-ui,sans-serif;cursor:pointer';
    b.onclick = () => { if (confirm('Start the demo again with fresh data? Your changes in this browser are cleared.')) reset(); };
    const a = document.createElement('a');
    a.href = PAGE === 'manager' ? '../../' : '../'; a.textContent = 'All demos'; a.style.cssText = 'color:#fff;opacity:.8;text-decoration:underline';
    t.append(document.createTextNode(msg), a, b);
    document.body.append(t);
  });
})();
