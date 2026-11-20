/* Kelola PAUD & TK — frontend statis. Data di-cache lokal (tampil instan), sinkron di latar, tulis optimistik. */
const API = (window.APP_CONFIG || {}).GAS_URL || '';
const $ = s => document.querySelector(s);
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rp = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const hari = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const S = { token: null, me: null, d: null, rh: null, tab: 'home', sub: 'tagihan', bulan: hari().slice(0, 7), kls: '' };
const KLS = 'PAUD,TK A,TK B';
const F = {
  Guru: [['nama', 'Nama lengkap'], ['jabatan', 'Jabatan', 'sel:Kepala Sekolah,Guru Kelas,Guru Pendamping,Staf'], ['kelas', 'Kelas', 'sel:' + KLS + ',Semua'], ['hp', 'No. HP', 'tel'], ['email', 'Email', 'email'], ['gaji_pokok', 'Gaji pokok (Rp)', 'number'], ['tunjangan', 'Tunjangan (Rp)', 'number'], ['status', 'Status', 'sel:aktif,nonaktif']],
  Siswa: [['nama', 'Nama anak'], ['kelas', 'Kelas', 'sel:' + KLS], ['nama_wali', 'Nama wali'], ['hp_wali', 'HP wali (WhatsApp)', 'tel'], ['email_wali', 'Email wali', 'email'], ['spp_bulanan', 'SPP per bulan (Rp)', 'number'], ['status', 'Status', 'sel:aktif,nonaktif']],
  Transaksi: [['tgl', 'Tanggal', 'date'], ['jenis', 'Jenis', 'sel:masuk,keluar'], ['kategori', 'Kategori'], ['jumlah', 'Jumlah (Rp)', 'number'], ['ket', 'Catatan']],
  Tagihan: [['id_siswa', 'Siswa', 'siswa'], ['periode', 'Periode', 'month'], ['jenis', 'Jenis', 'sel:SPP,Uang pangkal,Kegiatan,Seragam'], ['nominal', 'Nominal (Rp)', 'number']],
  Pengguna: [['nama', 'Nama'], ['email', 'Email', 'email'], ['peran', 'Peran', 'sel:admin,bendahara,guru,wali'], ['id_ref', 'ID guru / ID siswa (guru & wali)'], ['pin', 'PIN (min. 6, kosongkan jika tidak diubah)', 'password'], ['aktif', 'Aktif', 'sel:ya,tidak']]
};
// ---------- Penyimpanan lokal & API ----------
function load() { try { S.token = localStorage.getItem('kp_t'); S.me = JSON.parse(localStorage.getItem('kp_me') || 'null'); S.d = JSON.parse(localStorage.getItem('kp_d') || 'null'); S.rh = JSON.parse(localStorage.getItem('kp_rh') || 'null'); } catch (e) { } }
function persist() { try { localStorage.setItem('kp_d', JSON.stringify(S.d)); localStorage.setItem('kp_rh', JSON.stringify(S.rh)); } catch (e) { } }
function keluar() { try { ['kp_t', 'kp_me', 'kp_d', 'kp_rh'].forEach(k => localStorage.removeItem(k)); } catch (e) { } S.token = S.me = S.d = null; render(); api('demoInfo').then(j => { S.demo = j.data.demo; render(); }).catch(() => { }); }
async function api(action, data) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: S.token, data }) });
  const j = await r.json(); if (!j.success) { if (j.code === 'AUTH') keluar(); throw new Error(j.message); } return j;
}
let _sync = null;
function sync(quiet) {
  if (_sync) return _sync;
  _sync = api('boot').then(j => { S.d = j.data.data; S.rh = j.data.rahasia; persist(); if (!document.querySelector('dialog[open]')) render(); }).catch(e => { if (!quiet) toast(e.message); }).finally(() => { _sync = null; });
  return _sync;
}
function toast(m) { const t = $('#ts'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2400); }
// ---------- Tulis optimistik ----------
async function simpan(sheet, row) {
  const list = S.d[sheet], snap = JSON.stringify(list), tmp = !row.id; if (tmp) row.id = 'TMP-' + Date.now();
  const i = list.findIndex(x => x.id === row.id); if (i > -1) list[i] = Object.assign({}, list[i], row); else list.push(Object.assign({}, row)); render();
  try { const j = await api('simpan', { sheet, row: tmp ? Object.assign({}, row, { id: undefined }) : row }); const k = list.findIndex(x => x.id === row.id); if (k > -1) list[k] = j.data; persist(); render(); }
  catch (e) { S.d[sheet] = JSON.parse(snap); render(); toast(e.message); }
}
async function aksi(nama, data, lokal, pesan) {
  const snap = JSON.stringify(S.d); if (lokal) { lokal(); render(); }
  try { const j = await api(nama, data); toast(pesan || j.message || 'Berhasil'); await sync(true); }
  catch (e) { S.d = JSON.parse(snap); render(); toast(e.message); }
}
// ---------- Form modal ----------
function form(sheet, row, judul) {
  row = row || {}; const fs = F[sheet];
  $('#fm').innerHTML = '<h3>' + esc(judul) + '</h3>' + fs.map(([k, l, t]) => {
    t = t || 'text'; const v = row[k] != null ? row[k] : (k === 'tgl' ? hari() : k === 'periode' ? S.bulan : k === 'status' ? 'aktif' : k === 'aktif' ? 'ya' : '');
    if (t.indexOf('sel:') === 0) return '<label>' + l + '</label><select name="' + k + '">' + t.slice(4).split(',').map(o => '<option' + (o === v ? ' selected' : '') + '>' + o + '</option>').join('') + '</select>';
    if (t === 'siswa') return '<label>' + l + '</label><select name="' + k + '">' + S.d.Siswa.filter(s => s.status !== 'nonaktif').map(s => '<option value="' + s.id + '"' + (s.id === v ? ' selected' : '') + '>' + esc(s.nama) + ' (' + s.kelas + ')</option>').join('') + '</select>';
    return '<label>' + l + '</label><input name="' + k + '" type="' + t + '" value="' + esc(v) + '"' + (k === 'nama' || k === 'jumlah' ? ' required' : '') + ' autocomplete="off">';
  }).join('') + '<div class="acts"><button type="button" class="btn sec" id="cx">Batal</button><button class="btn">Simpan</button></div>';
  const dg = $('#dg'); dg.showModal(); $('#cx').onclick = () => dg.close();
  $('#fm').onsubmit = e => { e.preventDefault(); const o = Object.assign({}, row); new FormData($('#fm')).forEach((v, k) => { o[k] = v; }); dg.close(); simpan(sheet, o); };
}
// ---------- Hitungan ----------
const nm = (list, id) => (list.find(x => x.id === id) || {}).nama || '-';
function ring() {
  const d = S.d, t = d.Transaksi.filter(x => x.tgl.slice(0, 7) === S.bulan), sum = (a, j) => a.filter(x => x.jenis === j).reduce((s, x) => s + (+x.jumlah || 0), 0);
  const tg = d.Tagihan.filter(x => x.status !== 'lunas' && x.periode <= S.bulan);
  const pres = { hadir: 0, izin: 0, sakit: 0, alpa: 0 }; d.Absensi_Guru.filter(a => a.tgl === hari()).forEach(a => { if (pres[a.status] != null) pres[a.status]++; });
  const bln = [...Array(6)].map((_, i) => { const x = new Date(S.bulan + '-01'); x.setMonth(x.getMonth() - 5 + i); return x.toISOString().slice(0, 7); });
  const grafik = bln.map(b => { const z = d.Transaksi.filter(x => x.tgl.slice(0, 7) === b); return { b, m: sum(z, 'masuk'), k: sum(z, 'keluar') }; });
  return { masuk: sum(t, 'masuk'), keluar: sum(t, 'keluar'), tg, tgSum: tg.reduce((s, x) => s + (+x.nominal || 0), 0), pres, grafik, aktif: d.Guru.filter(g => g.status !== 'nonaktif').length };
}
// ---------- Tampilan ----------
function render() {
  const a = $('#app'); if (!API || /GANTI|XXXX/.test(API)) { a.innerHTML = '<div class="card login"><h2>Konfigurasi belum lengkap</h2><p>Isi <code>GAS_URL</code> di <code>js/config.js</code> lalu unggah ulang.</p></div>'; return; }
  if (!S.token) { a.innerHTML = '<div class="card login"><h1>Kelola PAUD &amp; TK</h1><p class="top">' + (S.demo ? 'Mode demo: pilih peran untuk mencoba, tanpa PIN.' : 'Masuk dengan email dan PIN dari sekolah.') + '</p>' + (S.demo ? '<div class="grid">' + [['admin', 'Kepala Sekolah'], ['bendahara', 'Bendahara'], ['guru', 'Guru'], ['wali', 'Wali Murid']].map(x => '<button class="btn" data-demo="' + x[0] + '">' + x[1] + '</button>').join('') + '</div><p class="top"><small>Atau masuk dengan PIN:</small></p>' : '') + '<form id="lg"><label>Email</label><input name="email" type="text" autocomplete="username" required><label>PIN</label><input name="pin" type="password" autocomplete="current-password" required><div class="acts"><button class="btn" id="lb">Masuk</button></div></form></div>'; $('#lg').onsubmit = login; return; }
  if (!S.d) { a.innerHTML = '<div class="empty">Memuat data…</div>'; return; }
  const r = S.me.role, tabs = r === 'admin' || r === 'bendahara' ? [['home', '🏠', 'Beranda'], ['guru', '🧑‍🏫', 'Guru'], ['siswa', '🧒', 'Siswa'], ['keu', '💰', 'Keuangan'], ['lain', '⚙️', 'Lainnya']] : [['home', '🏠', 'Beranda'], ['lain', '⚙️', 'Lainnya']];
  if (!tabs.some(t => t[0] === S.tab)) S.tab = 'home';
  const v = { home: vHome, guru: vGuru, siswa: vSiswa, keu: vKeu, lain: vLain }[S.tab]();
  a.innerHTML = '<div class="top"><div><h2>' + esc(set('NAMA_SEKOLAH', 'Kelola PAUD & TK')) + '</h2><small>' + esc(S.me.nama) + ' · ' + esc(S.me.role) + '</small>' + (S.me.email.indexOf('demo-') === 0 ? ' <span class="tag wt">Demo</span>' : '') + '</div></div>' + v + '<nav>' + tabs.map(t => '<button data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '"><span>' + t[1] + '</span>' + t[2] + '</button>').join('') + '</nav>';
}
const set = (k, d) => { const x = (S.d.Pengaturan || []).find(y => y.id === k); return x && x.nilai ? x.nilai : d; };
const chip = s => '<span class="tag ' + (s === 'lunas' || s === 'dibayar' ? 'ok' : s === 'belum' ? 'no' : 'wt') + '">' + s + '</span>';
const bulanIn = () => '<input type="month" id="mb" value="' + S.bulan + '" style="width:auto" aria-label="Bulan">';
function vHome() {
  const r = S.me.role, d = S.d;
  if (r === 'guru') return '<div class="card"><h3>Slip gaji saya</h3>' + (d.Penggajian.map(p => '<div class="item"><div><b>' + p.periode + '</b><small>Pokok ' + rp(p.gaji_pokok) + ' · potongan ' + rp(p.potongan) + '</small></div><b class="in">' + rp(p.total) + '</b></div>').join('') || '<div class="empty">Belum ada slip yang dibayarkan.</div>') + '</div><div class="card"><h3>Kehadiran saya</h3>' + (d.Absensi_Guru.slice(-10).reverse().map(a => '<div class="item"><span>' + a.tgl + '</span>' + chip(a.status) + '</div>').join('') || '<div class="empty">Belum ada data.</div>') + '</div>';
  if (r === 'wali') return '<div class="card"><h3>Tagihan anak</h3>' + (d.Tagihan.map(t => '<div class="item"><div><b>' + esc(nm(d.Siswa, t.id_siswa)) + '</b><small>' + t.jenis + ' · ' + t.periode + '</small></div><div>' + rp(t.nominal) + ' ' + chip(t.status) + '</div></div>').join('') || '<div class="empty">Belum ada tagihan.</div>') + '</div>';
  const R = ring(), tot = R.pres.hadir + R.pres.izin + R.pres.sakit + R.pres.alpa, mx = Math.max(1, ...R.grafik.map(g => Math.max(g.m, g.k)));
  const kl = KLS.split(',').map(k => { const ts = d.Tagihan.filter(t => t.periode === S.bulan && t.jenis === 'SPP' && (d.Siswa.find(s => s.id === t.id_siswa) || {}).kelas === k), l = ts.filter(t => t.status === 'lunas').length; return '<div style="margin:8px 0"><div class="row sp"><b>' + k + '</b><small>' + l + '/' + ts.length + ' lunas</small></div><div class="bar"><i style="width:' + (ts.length ? l * 100 / ts.length : 0) + '%"></i></div></div>'; }).join('');
  return '<div class="card hero"><small>Saldo bulan ini</small><div class="big">' + rp(R.masuk - R.keluar) + '</div><div class="row sp" style="margin-top:6px">' + bulanIn() + '<small>' + R.aktif + ' guru aktif</small></div></div>'
    + '<div class="qa"><button data-go="guru"><span>✅</span>Presensi</button><button data-form="Transaksi"><span>🧾</span>Catat kas</button><button data-go="keu"><span>🎓</span>SPP</button><button data-act="ingatkan"><span>📣</span>Pengingat</button></div><div style="height:12px"></div>'
    + '<div class="grid"><div class="card"><small>Pemasukan</small><div class="big in">' + rp(R.masuk) + '</div></div><div class="card"><small>Pengeluaran</small><div class="big out">' + rp(R.keluar) + '</div></div></div>'
    + (R.tg.length ? '<div class="card" style="border-color:var(--out)"><b class="out">Tunggakan ' + rp(R.tgSum) + '</b><div class="row sp"><small>' + R.tg.length + ' tagihan belum lunas</small><button class="btn sm warn" data-act="ingatkan">Ingatkan wali</button></div></div>' : '')
    + '<div class="card"><h3>Presensi guru hari ini</h3><div class="grid" style="grid-template-columns:repeat(4,1fr);margin-top:8px"><div><b class="big in">' + R.pres.hadir + '</b><br><small>Hadir</small></div><div><b class="big">' + R.pres.izin + '</b><br><small>Izin</small></div><div><b class="big">' + R.pres.sakit + '</b><br><small>Sakit</small></div><div><b class="big out">' + R.pres.alpa + '</b><br><small>Alpa</small></div></div><small>' + (tot ? Math.round(R.pres.hadir * 100 / tot) + '% kehadiran' : 'Belum ada presensi hari ini') + '</small></div>'
    + '<div class="card"><h3>Pemasukan vs pengeluaran</h3><div class="chart">' + R.grafik.map(g => '<div><p><i style="height:' + Math.max(3, g.m * 100 / mx) + '%;background:var(--pc)"></i><i style="height:' + Math.max(3, g.k * 100 / mx) + '%;background:var(--out)"></i></p>' + g.b.slice(5) + '</div>').join('') + '</div><small>Biru: masuk · Merah: keluar</small></div>'
    + '<div class="card"><h3>Progres SPP ' + S.bulan + '</h3>' + kl + '</div>'
    + '<div class="card"><h3>Kas terbaru</h3>' + (d.Transaksi.slice().sort((a, b) => b.tgl.localeCompare(a.tgl)).slice(0, 4).map(trxRow).join('') || '<div class="empty">Belum ada transaksi.</div>') + '</div>';
}
const trxRow = x => '<div class="item"><div><b>' + esc(x.kategori) + '</b><small>' + x.tgl + ' · ' + esc(x.ket) + '</small></div><b class="' + (x.jenis === 'masuk' ? 'in' : 'out') + '">' + (x.jenis === 'masuk' ? '+' : '-') + rp(x.jumlah) + '</b></div>';
function vGuru() {
  const d = S.d, adm = S.me.role === 'admin', st = ['hadir', 'izin', 'sakit', 'alpa'];
  return '<div class="row sp" style="margin-bottom:10px"><h3>Guru &amp; presensi hari ini</h3>' + (adm ? '<button class="btn sm" data-form="Guru">Tambah</button>' : '') + '</div><div class="card">'
    + (d.Guru.map(g => { const a = d.Absensi_Guru.find(x => x.id === 'ABS-' + hari() + '-' + g.id); return '<div class="item"><div class="grow"><b>' + esc(g.nama) + '</b><small>' + esc(g.jabatan) + ' · ' + esc(g.kelas) + (g.status === 'nonaktif' ? ' · nonaktif' : '') + '</small></div><div class="pres">' + st.map(s => '<button data-pres="' + g.id + '|' + s + '" class="' + (a && a.status === s ? 'on' : '') + '" title="' + s + '" aria-label="' + s + ' ' + esc(g.nama) + '">' + s[0].toUpperCase() + '</button>').join('') + '</div>' + (adm ? '<button class="btn sm sec" data-edit="Guru|' + g.id + '">Ubah</button>' : '') + '</div>'; }).join('') || '<div class="empty">Belum ada guru.</div>') + '</div>';
}
function vSiswa() {
  const d = S.d, l = d.Siswa.filter(s => !S.kls || s.kelas === S.kls);
  return '<div class="row sp" style="margin-bottom:10px"><h3>Siswa</h3><button class="btn sm" data-form="Siswa">Tambah</button></div><div class="seg">' + ['', ...KLS.split(',')].map(k => '<button data-kls="' + k + '" class="' + (S.kls === k ? 'on' : '') + '">' + (k || 'Semua') + '</button>').join('') + '</div><div class="card">'
    + (l.map(s => '<div class="item"><div class="grow"><b>' + esc(s.nama) + '</b><small>' + s.kelas + ' · wali ' + esc(s.nama_wali) + ' · SPP ' + rp(s.spp_bulanan) + '</small></div><button class="btn sm sec" data-edit="Siswa|' + s.id + '">Ubah</button></div>').join('') || '<div class="empty">Belum ada siswa.</div>') + '</div>';
}
function vKeu() {
  const d = S.d, adm = S.me.role === 'admin'; let b = '';
  if (S.sub === 'tagihan') {
    const l = d.Tagihan.filter(t => t.periode === S.bulan);
    b = '<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="tagihanBulanan">Buat SPP bulan ini</button><button class="btn sm sec" data-form="Tagihan">Tagihan lain</button></div><div class="card">' + (l.map(t => '<div class="item"><div class="grow"><b>' + esc(nm(d.Siswa, t.id_siswa)) + '</b><small>' + t.jenis + ' · ' + rp(t.nominal) + '</small></div>' + chip(t.status) + (t.status !== 'lunas' ? '<button class="btn sm" data-bayar="' + t.id + '">Lunas</button>' : '') + '</div>').join('') || '<div class="empty">Belum ada tagihan bulan ini.</div>') + '</div>';
  } else if (S.sub === 'kas') {
    b = '<div class="row" style="margin-bottom:10px"><button class="btn sm" data-form="Transaksi">Catat transaksi</button></div><div class="card">' + (d.Transaksi.filter(x => x.tgl.slice(0, 7) === S.bulan).sort((a, c) => c.tgl.localeCompare(a.tgl)).map(x => trxRow(x).replace('</b></div>', '</b></div>')).join('') || '<div class="empty">Belum ada transaksi.</div>') + '</div>';
  } else {
    const l = d.Penggajian.filter(p => p.periode === S.bulan);
    b = '<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="buatGaji">Buat draf gaji</button></div><div class="card">' + (l.map(p => '<div class="item"><div class="grow"><b>' + esc(nm(d.Guru, p.id_guru)) + '</b><small>Potongan ' + rp(p.potongan) + ' · ' + rp(p.total) + '</small></div>' + chip(p.status) + (p.status === 'draf' && adm ? '<button class="btn sm" data-gaji="setujuiGaji|' + p.id + '">Setujui</button>' : '') + (p.status === 'disetujui' ? '<button class="btn sm" data-gaji="bayarGaji|' + p.id + '">Bayar</button>' : '') + '</div>').join('') || '<div class="empty">Belum ada draf gaji bulan ini.</div>') + '</div>';
  }
  return '<div class="row sp" style="margin-bottom:10px"><h3>Keuangan</h3>' + bulanIn() + '</div><div class="seg">' + [['tagihan', 'SPP'], ['kas', 'Kas'], ['gaji', 'Gaji']].map(x => '<button data-sub="' + x[0] + '" class="' + (S.sub === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' + b;
}
function vLain() {
  const adm = S.me.role === 'admin', rh = S.rh || {};
  return (adm ? '<div class="card"><h3>WhatsApp (Fonnte)</h3><small>Token ' + (rh.fonnteAda ? 'tersimpan: ' + esc(rh.fonnteSamar) : 'belum diisi') + '</small><label>Token baru</label><input id="tk" type="password" autocomplete="off" placeholder="Tempel token Fonnte"><div class="acts"><button class="btn sm" data-act="tokenSimpan">Simpan token</button></div></div>'
    + '<div class="card"><div class="row sp"><h3>Pengguna</h3><button class="btn sm" data-form="Pengguna">Tambah</button></div>' + (S.d.Pengguna.map(u => '<div class="item"><div class="grow"><b>' + esc(u.nama) + '</b><small>' + esc(u.email) + ' · ' + u.peran + '</small></div><button class="btn sm sec" data-edit="Pengguna|' + u.id + '">Ubah</button></div>').join('') || '<div class="empty">Belum ada pengguna.</div>') + '</div>' : '')
    + '<div class="card"><button class="btn warn" data-act="keluar">Keluar</button></div>';
}
async function login(e) {
  e.preventDefault(); const f = new FormData(e.target), b = $('#lb'); b.disabled = true; b.textContent = 'Memeriksa…';
  try { const j = await api('login', { email: f.get('email'), pin: f.get('pin') }); S.token = j.data.token; S.me = j.data.me; localStorage.setItem('kp_t', S.token); localStorage.setItem('kp_me', JSON.stringify(S.me)); S.d = null; render(); await sync(); }
  catch (er) { toast(er.message); b.disabled = false; b.textContent = 'Masuk'; }
}
async function masukDemo(p) {
  try { const j = await api('loginDemo', { peran: p }); S.token = j.data.token; S.me = j.data.me; localStorage.setItem('kp_t', S.token); localStorage.setItem('kp_me', JSON.stringify(S.me)); S.d = null; render(); await sync(); } catch (er) { toast(er.message); }
}
// ---------- Event (delegasi, tanpa render ulang berat) ----------
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const D = b.dataset;
  if (D.tab) { S.tab = D.tab; render(); scrollTo(0, 0); }
  else if (D.demo) masukDemo(D.demo);
  else if (D.go) { S.tab = D.go; render(); }
  else if (D.sub) { S.sub = D.sub; render(); }
  else if (D.kls !== undefined) { S.kls = D.kls; render(); }
  else if (D.form) form(D.form, null, 'Tambah ' + D.form.toLowerCase());
  else if (D.edit) { const [s, id] = D.edit.split('|'); form(s, S.d[s].find(x => x.id === id), 'Ubah data'); }
  else if (D.pres) { const [id, st] = D.pres.split('|'); simpan('Absensi_Guru', { id: 'ABS-' + hari() + '-' + id, tgl: hari(), id_guru: id, status: st }); }
  else if (D.bayar) aksi('bayarTagihan', { id: D.bayar, metode: 'Tunai' }, () => { const t = S.d.Tagihan.find(x => x.id === D.bayar); if (t) { t.status = 'lunas'; t.tgl_bayar = hari(); } }, 'Pembayaran dicatat');
  else if (D.gaji) { const [a, id] = D.gaji.split('|'); aksi(a, { id }); }
  else if (D.act === 'tagihanBulanan') aksi('tagihanBulanan', { periode: S.bulan });
  else if (D.act === 'buatGaji') aksi('buatGaji', { periode: S.bulan });
  else if (D.act === 'ingatkan') aksi('ingatkan', { ids: ring().tg.map(t => t.id) });
  else if (D.act === 'tokenSimpan') { const v = $('#tk').value.trim(); if (!v) return toast('Isi token dulu'); api('rahasia', { kunci: 'FONNTE_TOKEN', nilai: v }).then(j => { S.rh = { fonnteAda: j.data.ada, fonnteSamar: j.data.samar }; $('#tk').value = ''; persist(); render(); toast('Token tersimpan'); }).catch(er => toast(er.message)); }
  else if (D.act === 'keluar') keluar();
});
document.addEventListener('change', e => { if (e.target.id === 'mb' && e.target.value) { S.bulan = e.target.value; render(); } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.token) sync(true); });
setInterval(() => { if (document.visibilityState === 'visible' && S.token && !document.querySelector('dialog[open]')) sync(true); }, 45000);
load(); render(); if (S.token) sync(true); else api('demoInfo').then(j => { S.demo = j.data.demo; render(); }).catch(() => { });
