<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/1d9e4c55-b39c-46f4-8ed9-8d5a2f29fd37" />

# Sistem Informasi Pelayanan & Logistik Kargo Kapal Laut
 
Sistem Informasi Pelayanan & Logistik Kargo Kapal Laut adalah aplikasi berbasis web yang dirancang sebagai studi kasus sistem informasi logistik kargo kapal laut. Aplikasi ini menampilkan dan mengelola jadwal pengiriman kargo kapal laut secara terstruktur, mulai dari perencanaan tahapan operasional, penyusunan jadwal timeline, hingga pelacakan status manifes kargo dari pelabuhan asal hingga tujuan.
 
Aplikasi ini memodelkan rute operasional kapal laut **Gorontalo → Surabaya** dengan periode operasional **01–30 November 2025**, serta menyediakan antarmuka yang interaktif untuk memantau progres pekerjaan dan status kontainer kargo secara real-time di browser.
 
---
 
## Fitur Utama
 
- **Dashboard Jadwal Interaktif** — Menampilkan ringkasan statistik proyek beserta timeline pengiriman (Cargo Schedule Chart) yang memungkinkan pengguna melihat urutan tahapan operasional dan detil masing-masing tahapan.
- **Perbarui Progres Tugas & Status Tahapan** — Pengguna dapat memperbarui persentase progres (% Completed) dan mengubah status tugas (**Belum Dimulai**, **Berjalan**, **Selesai**) secara interaktif. Status yang dipilih akan disinkronkan dengan persentase progres dan langsung tersimpan di browser.
- **Analisis CPM & Jalur Kritis** — Menghitung jadwal proyek menggunakan metode Critical Path Method (CPM) berbasis kalender hari kerja, termasuk forward pass, backward pass, dan penentuan jalur kritis.
- **Resource Chart & Deteksi Konflik Penugasan** — Menampilkan beban kerja setiap personel secara visual serta mendeteksi adanya konflik penugasan (personel yang ditugaskan pada lebih dari satu tahapan di hari kerja yang sama).
- **Manajemen Manifes Kargo dengan Status Interaktif** — Tabel manifes kargo menyediakan dropdown status kontainer yang interaktif, sehingga pengguna dapat mengubah status kontainer langsung dari antarmuka dan nilainya tersimpan di browser (pilihan status: Terdaftar, Diperiksa, Dimuat, Dalam Perjalanan, Tiba, Serah Terima).
- **Diagram Jaringan (PERT)** — Menampilkan alur kerja berupa diagram jaringan node-tahapan dan panah-dependensi untuk mem visualisasi hubungan antar tahapan.
- **Simulasi Dampak Keterlambatan (What-If Analysis)** — Pengguna dapat menguji dampak hipotetis keterlambatan satu tahapan terhadap jadwal keberangkatan kapal dan penyelesaian proyek secara langsung.
- **Ekspor & Cetak Laporan** — Data jadwal dan manifes dapat diekspor ke format CSV dan JSON, serta dicetak sebagai laporan.
 
---
 
## Teknologi yang Digunakan
 
Aplikasi ini dibangun secara *client-side* (hanya berjalan di browser) dengan teknologi berikut:
 
| Teknologi | Keterangan |
| --- | --- |
| **HTML5** | Struktur halaman, formulir, tabel, dan elemen antarmuka pengguna |
| **CSS3** | Penataan tata letak, tema, komponen kartu, tabel, dan progress bar |
| **JavaScript (Vanilla)** | Logika aplikasi secara penuh: perhitungan CPM, render tabel, manajemen event, persistensi data, dan ekspor data |
 
**Catatan teknis:** Aplikasi ini bersifat *single-page* dan tidak memerlukan server atau backend. Data yang dimasukkan dan diubah tersimpan di browser melalui **LocalStorage**. Autentikasi bersifat **simulasi** untuk keperluan studi kasus (hanya terdapat mode Admin dan Staf).
 
---
 
## Cara Menjalankan Proyek
 
1. **Salin (clone) atau unduh** seluruh file proyek ke folder di komputer Anda. Pastikan file berikut ada di satu folder yang sama:
   - `index.html`
   - `app.js`
   - `style.css`
   - `README.md`
 
2. **Buka melalui Live Server (disarankan)**  
   Jika menggunakan editor seperti **VS Code**, buka folder proyek, lalu klik kanan pada `index.html` dan pilih **Open with Live Server**.  
   Alternatif lain:
   - Instal ekstensi Live Server jika belum tersedia.
   - Live Server menghidupkan server lokal dan membuka aplikasi di browser secara otomatis.
 
3. **Buka langsung dari file** (tidak disarankan untuk cara ini hanya bila Live Server tidak tersedia)  
   - Klik dua kali pada file `index.html`, atau
   - Drag file `index.html` ke jendela browser, atau
   - Jalankan `file:///.../index.html` melalui alamat browser.
 
   > Catatan: Jika dibuka langsung dari `file://`, beberapa fitur berbasis `fetch` atau dependensi eksternal mungkin terbatas; untuk studi kasus ini aplikasi masih berjalan karena seluruh logika terdapat di dalam satu file JavaScript.
 
4. **Login (sesi simulasi)**  
   - Tekan tombol **Login** di kanan atas.
   - Gunakan akun simulasi:
     - **Admin / Project Manager** → username `fahri`, password `admin123`
     - **Staf Operasional** → username `dewi`, password `staf123`
   - Status login disimpan di browser sehingga pengguna tidak perlu login kembali saat halaman dibuka ulang (kecuali data LocalStorage dibersihkan).
 
5. **Gunakan fitur** sesuai hak akses:
   - **Admin**: mengelola tugas, dependensi, kalender libur, anggota tim, manifes, dan ekspor data.
   - **Staf**: melihat diagram dan jadwal (read-only) serta memperbarui progres tugas dan status kontainer yang menjadi hak tugasnya.
 
---
 
## Struktur File Proyek
 

.
├── index.html      # Struktur halaman dan antarmuka
├── app.js          # Logika JavaScript (CPM, render, event, persistensi)
├── style.css       # Tema dan tata letak
└── README.md       # Dokumentasi proyek (file ini)

 
---
 
## Identitas Mahasiswa
 
| Informasi | Isi |
| --- | --- |
| **Nama** | Muh. Fahri B. Samsudin |
| **NIM**  | 531424071 |
| **Kelas** | D / Sistem Informasi |
 
> Silakan lengkapi kolom di atas sesuai identitas Anda sebelum mendokumentasikan atau mengumpulkan tugas.
 
---
 
*Catatan: Aplikasi ini merupakan studi kasus sistem informasi dan bersifat simulasi. Data, pengguna, dan sesi login semuanya berada di sisi klien (browser) untuk keperluan demonstrasi dan pembelajaran.*
