# Panduan Pasang Kelola PAUD & TK

Waktu: sekitar 30-45 menit. Kerjakan di laptop.

## A. Backend (Google Apps Script)
1. Buka https://script.google.com lalu klik **Project baru**. Beri nama `Kelola PAUD TK`.
2. Ganti isi berkas `Kode.gs` dengan isi berkas **Kode.gs** yang saya serahkan (salin semua, tempel).
3. Di bagian pilih fungsi, pilih `setupAppEnvironment`, klik **Jalankan**, dan setujui izin akses.
4. Buka **Log eksekusi**. **Catat sekarang** (hanya tampil sekali):
   - `LOGIN ADMIN AWAL` : email + PIN untuk masuk pertama.
   - `AKSES DARURAT` : pengguna `darurat` + sandi (cadangan jika PIN lupa; reset lewat fungsi `resetAksesDarurat`).
5. Klik **Terapkan > Deployment baru > Aplikasi web**. Isi: *Jalankan sebagai* **Saya**, *Yang memiliki akses* **Siapa saja**. Salin **URL /exec**.
6. Tes: buka URL /exec di browser. Harus muncul `{"success":true`.

Setup otomatis membuat: spreadsheet database, folder Drive, 3 pemicu (antrean notifikasi tiap 1 menit, pemanasan cache tiap 5 menit, SPP otomatis tiap tanggal 1), dan rahasia sesi. Semua ID dan rahasia tersimpan di **Script Properties** (Setelan Proyek), bukan di kode. Jangan menambah editor proyek sembarangan dan jangan membagikan spreadsheet database.

## B. Frontend (GitHub Pages)
1. Ekstrak ZIP. Folder hasil ekstraksi (`kelola-paud-tk`, yang langsung berisi `index.html`) adalah folder yang di-`git init`.
2. Buka `js/config.js`, ganti `GANTI_DENGAN_ID_DEPLOYMENT` dengan URL /exec dari langkah A5 (satu-satunya yang diisi).
3. Di terminal, masuk ke folder itu, pastikan `dir` / `ls` menampilkan `index.html`, lalu:
```
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```
4. Di GitHub: repo (harus **Public**) > Settings > Pages > Branch `main`, folder `/ (root)` > Save. Situs aktif 1-2 menit.
5. Jika push diminta password: gunakan **Personal Access Token** (scope `repo`). Saat mengetik, layar memang tidak menampilkan apa pun.

## C. Masuk pertama dan setelan awal
1. Buka situs, masuk dengan email + PIN dari log. Menu **Lainnya**: tambah pengguna bendahara, guru (isi ID guru), wali (isi ID siswa).
2. Tambah data **Guru** dan **Siswa** (isi HP wali format 08xx untuk WhatsApp).
3. **Keuangan > SPP > Buat SPP bulan ini**.
4. Notifikasi WhatsApp: daftar di fonnte.com, sambungkan nomor, lalu tempel token di **Lainnya > WhatsApp (Fonnte)**. Token tersimpan di Script Properties dan hanya tampil tersamar.
5. Pembaruan kode backend: **Terapkan > Kelola deployment > Edit > Versi baru** (URL tetap).

## Jika ada masalah
- Layar "Konfigurasi belum lengkap": `GAS_URL` di `js/config.js` belum diisi.
- Halaman 404 di GitHub Pages: `index.html` tidak di root repo (git init di folder yang salah).
- "Sesi berakhir": masuk ulang. Salah PIN 5 kali terkunci 15 menit.
- Pesan WA tidak terkirim: cek token Fonnte dan lihat sheet `AntrianNotif` kolom `status` dan `respon`.
- Pindah database: jalankan `migrasiDariSpreadsheet('ID_SHEET_LAMA', true)` untuk pindai dulu, lalu tanpa `true` untuk menyalin (aman diulang).
