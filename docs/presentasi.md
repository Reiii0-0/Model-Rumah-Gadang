# Draf presentasi proyek akhir Grafika Komputer: Rumah Gadang 3D Interaktif

Dokumen ini menyusun materi presentasi kelompok untuk pengumpulan minggu 10 dan demonstrasi akhir minggu 16 pada mata kuliah Grafika Komputer.

## Tempat tautan video presentasi dan demonstrasi kelompok

Isi bagian berikut setelah kelompok selesai merekam presentasi dan demonstrasi aplikasi:

- **Tautan aplikasi langsung (Firebase Hosting):** <https://rumah-gadang-pdikm.web.app>
- **Tautan video demonstrasi (YouTube / Google Drive / OneDrive ITS):** `[TEMPEL_TAUTAN_VIDEO_KELOMPOK_DI_SINI]`
- **Durasi video:** `[ISI_DURASI_MENIT_DETIK]`
- **Tanggal perekaman:** `[ISI_TANGGAL_REKAMAN]`
- **Anggota kelompok dan pembagian peran:**
  1. `[Nama Anggota 1 - NRP]` : Pemodelan geometri prosedural atap gonjong dan badan bangunan
  2. `[Nama Anggota 2 - NRP]` : Material kanvas prosedural, tekstur bump, dan sistem pencahayaan
  3. `[Nama Anggota 3 - NRP]` : Interaktivitas kamera, pemilihan komponen (raycasting), dan animasi
  4. `[Nama Anggota 4 - NRP]` : Antarmuka responsif, pengujian peramban, dan dokumentasi referensi

## Susunan salindia (slide) presentasi

### Salindia 1: Judul dan identitas objek
- **Judul:** Rekonstruksi 3D Interaktif Rumah Gadang PDIKM Padang Panjang dengan Three.js
- **Objek kajian:** Bangunan utama Pusat Dokumentasi dan Informasi Kebudayaan Minangkabau (PDIKM), Kelurahan Silaing Bawah, Kota Padang Panjang, Sumatera Barat.
- **Teknologi:** Three.js `0.187.0`, TypeScript `7.0.2`, dan Vite `8.3.5`.
- **Poin pembicara:** Jelaskan alasan memilih bangunan utama Rumah Gadang PDIKM karena memiliki siluet enam gonjong utama ditambah satu puncak serambi tengah, struktur panggung bertiang, serta bidang ukiran fasad yang terstruktur jelas untuk pemodelan prosedural.

### Salindia 2: Foto referensi dan lisensi sumber
- **Sumber utama:** Enam foto asli bangunan PDIKM yang sama dari Wikimedia Commons (diakses 3 November 2026):
  1. `references/photos/pdikm-official.jpg` : Tampak depan simetris (Kementerian Pendidikan dan Kebudayaan RI, domain publik `PD-IDGov`).
  2. `references/photos/pdikm-center.jpg` : Sudut dekat fasad, sambungan atap, dan panel ukiran (Detlef Langer, `CC BY-SA 3.0`).
  3. `references/photos/pdikm-view-2.jpg` : Sudut tiga perempat dari halaman depan (Pemerintah Kota Padang Panjang, domain publik `PD-IDGov`).
  4. `references/photos/pdikm-view-3.jpg` : Serambi depan, tangga masuk, dan sayap kanan (Pemerintah Kota Padang Panjang, domain publik `PD-IDGov`).
  5. `references/photos/pdikm-carving.jpg` : Detail ukiran dinding, kusen jendela, dan lengkungan kolong (Pemerintah Kota Padang Panjang, domain publik `PD-IDGov`).
  6. `references/photos/pdikm-interior.jpg` : Ruang pamer dan perpustakaan di dalam gedung PDIKM (`SpartacksCompatriot`, `CC BY-SA 3.0`).
- **Catatan kejujuran akademik:** Seluruh foto adalah dokumentasi nyata dari satu bangunan yang sama (bukan citra hasil AI dan bukan campuran gedung berbeda). Foto berasal dari sumber daring terbuka; untuk kewajiban pemotretan mandiri minggu 10, kelompok perlu mengonfirmasi persetujuan objek kepada dosen pengampu.

### Salindia 3: Dekomposisi komponen bangunan (8 kelompok semantik)
- Model dipecah menjadi delapan grup `THREE.Group` di dalam `src/model/house.ts`, `src/model/interior.ts`, dan `src/model/parts.ts`:
  1. `roof` (**Atap & gonjong**): Tiga pasang cangkang atap pelana melengkung (enam gonjong utama), atap serambi berujung gonjong ketujuh, lis tepi perak, dan mahkota puncak (*finial*).
  2. `body` (**Badan rumah**): Lantai panggung yang diangkat, dinding fasad berpanel merah tua, sayap ujung (*anjuang*) yang ditinggikan pada teluk terluar, serta penutup segitiga atap (*gable*).
  3. `pillars` (**Tiang & kolong**): Deretan 33 tiang kayu penopang pada grid $11 \times 3$, umpak batu di permukaan tanah, dan bidang penutup kolong hijau pucat.
  4. `stairs` (**Tangga masuk**): Sepuluh anak tangga batu pada sumbu tengah, landasan bawah, pipi tangga merah bata, tiang sandaran, dan pegangan tangan kayu.
  5. `doors` (**Pintu & serambi**): Pelataran serambi, tiang serambi, lengkungan ukir di bawah papan nama PDIKM, serta dua daun pintu berengsel (`doorLeft` dan `doorRight`).
  6. `windows` (**Jendela**): Bukaan kaca gelap berbingkai krem dan kisi tengah kayu yang berulang mengikuti ritme teluk dinding, dengan elevasi lebih tinggi pada teluk ujung (*anjuang*).
  7. `ornaments` (**Ornamen ukiran**): Panel ukiran vertikal dan horizontal, lengkungan kolong berukir, serta papan nama PDIKM di atas pintu masuk.
  8. `interior` (**Interior & ruang pamer**): Lantai tikar rotan, panggung *anjuang* bertangga, plafon miring anyaman bilik bambu beserta kasau dan balok tarik, dinding bilik bambu dengan bingkai foto sejarah dan lambang Garuda, tiga lampu gantung bercabang enam, prasasti peresmian PDIKM, meja penerima tamu mahoni, enam etalase kaca (*vitrine*), serta meja baca perpustakaan dengan delapan kursi.

### Salindia 4: Proses pemodelan geometri prosedural
- **Permukaan atap gonjong:** Dibangun menggunakan `THREE.BufferGeometry` parametrik ($96 \times 24$ segmen per sisi) dengan kurva punggung pangkat $u^{3,4}$ untuk menghasilkan lengkungan tanduk kerbau yang tajam di ujung dan melandai di tengah.
- **Lis tepi dan pegangan tangga:** Dibentuk dengan `THREE.TubeGeometry` di sepanjang kurva `THREE.CatmullRomCurve3` dan `THREE.CubicBezierCurve3`.
- **Bidang lengkung serambi dan kolong:** Dibentuk dari `THREE.Shape` kurva Bezier yang diekstrusi menggunakan `THREE.ExtrudeGeometry`.
- **Ruang dalam dan perabot museum (`src/model/interior.ts`):** Menggabungkan struktur rangka plafon miring (`ceilingGroup`) yang dapat dibuka/ditutup dengan susunan perabot modular (prasasti, meja penerima tamu, etalase kaca transparan `depthWrite: false`, dan meja baca).
- **Optimasi performa (*batching*):** Fungsi `mergeStaticPart` di `src/model/merge-static.ts` menggabungkan geometri statis yang berbagi material di dalam tiap komponen semantik dan sub-grup perabot, sehingga jumlah *draw calls* tetap rendah tanpa menghilangkan kemampuan pemilihan per komponen.

### Salindia 5: Material prosedural dan pencahayaan (*lighting*)
- **Material tanpa menempel foto:** `src/model/materials.ts` menggambar tekstur warna (`SRGBColorSpace`) dan peta tinggi (`bumpMap`) secara prosedural pada `HTMLCanvasElement` untuk sirap atap gelap, serat kayu tiang, kayu mahoni mengilap, anyaman bilik bambu plafon, tikar rotan lantai, pola sulur ukiran Minangkabau, papan nama PDIKM, serta prasasti peresmian.
- **Konfigurasi lampu (`src/main.ts`):**
  - `THREE.HemisphereLight` (`#fcf1dc` langit ke `#777b63` tanah) untuk pencahayaan lingkungan alami.
  - `THREE.AmbientLight` (`#d9e2df`) untuk mengisi bayangan kolong dan sudut ruang pamer agar detail tiang tetap terbaca.
  - `THREE.DirectionalLight` (`#fff0d0`, posisi $(-18, 26, 22)$) sebagai cahaya matahari terarah dengan peta bayangan `PCFShadowMap` beresolusi $2048 \times 2048$.
  - `THREE.PointLight` (`#ffb66d`) yang menyala hangat di serambi saat mode malam dan menerangi ruang tengah saat pengguna masuk ke tampilan ruang dalam atau membuka atap.
- **Tone mapping:** Menggunakan `THREE.ACESFilmicToneMapping` dengan penggeser *exposure* interaktif ($0,50$ sampai $1,80$, bawaan $1,10$).

### Salindia 6: Interaktivitas kamera, mode buka atap, dan pemilihan bagian
- **Navigasi kamera (`OrbitControls`):**
  - Putar $360^\circ$ dengan geser klik kiri mouse atau satu jari pada layar sentuh.
  - Zoom dengan *scroll wheel*, cubit dua jari (*pinch*), atau tombol UI `+` dan `-`.
  - Geser (*pan*) dengan geser klik kanan mouse atau geser dua jari.
  - Lima prasetel sudut pandang (`Perspektif 3/4`, `Depan`, `Samping`, `Belakang`, `Dalam`) serta tombol `Buka atap` (`C`) untuk mengamati interior dari atas (*cutaway*) dan tombol `Reset` (`R`).
- **Pemilihan bagian (*raycasting* dan daftar UI):**
  - Klik/ketuk langsung pada model 3D melalui `THREE.Raycaster` atau klik salah satu dari 8 tombol bagian pada panel samping.
  - Bagian terpilih disorot menggunakan warna emisif keemasan (`#b88a33`) dan kartu detail menampilkan deskripsi fungsi beserta catatan bukti foto lawan asumsi.

### Salindia 7: Animasi waktu nyata (*real-time animation*)
- **Animasi daun pintu berengsel:** Tombol `Buka pintu` (atau tombol papan ketik `D`) memutar grup pivot `doorLeft` dan `doorRight` sebesar $\pm 0,48\pi$ radian ($\approx 86,4^\circ$) terhadap sumbu engsel tepi luar masing-masing menggunakan interpolasi eksponensial berbasis selang waktu nyata.
- **Transisi siang dan malam:** Tombol `Siang/Malam` (atau tombol `N`) menginterpolasi warna latar dan kabut (`#e9e7de` ke `#172932`), warna matahari (`#fff0d0` ke `#9ebfff`), intensitas cahaya langit/matahari, serta menyalakan lampu serambi (`PointLight`).
- **Tur kamera otomatis:** Tombol `Tur kamera` (atau tombol `T`) memutar kamera mengelilingi bangunan secara halus dan otomatis berhenti begitu pengguna menyentuh atau menggeser kamera secara manual.

### Salindia 8: Perbandingan hasil akhir terhadap foto referensi
- **Tangkapan layar hasil pengujian (`evidence/final/`):**
  - Tampak depan: `evidence/final/front.png` dibandingkan dengan `references/photos/pdikm-official.jpg`.
  - Sudut tiga perempat: `evidence/final/perspective.png` dibandingkan dengan `references/photos/pdikm-view-2.jpg` dan `pdikm-view-3.jpg`.
  - Ruang dalam: `evidence/final/interior.png` dan `evidence/final/cutaway.png` dibandingkan dengan `references/photos/pdikm-interior.jpg`.
  - Tampak samping dan belakang: `evidence/final/side.png` dan `evidence/final/back.png`.
- **Kesesuaian utama:** Siluet enam gonjong utama dan puncak serambi tengah, peningkatan elevasi pada teluk ujung (*anjuang*), lengkungan ukir serambi di bawah papan nama hijau PDIKM, pipi tangga depan, proporsi kolong berlengkungan, serta suasana ruang pamer berplafon bilik bambu dan berlantai tikar rotan.

### Salindia 9: Asumsi rekonstruksi dan keterbatasan model
- **Bagian berbasis bukti foto:** Siluet atap depan, jumlah teluk fasad depan (10 teluk jendela mengapit 1 teluk pintu tengah), kenaikan lantai teluk ujung (*anjuang*), lengkungan serambi, papan nama PDIKM, ritme lengkungan kolong depan, serta elemen utama ruang pamer dalam (`pdikm-interior.jpg`).
- **Bagian berbasis asumsi (ditandai jelas di UI):**
  - Fasad belakang (`back`) dan samping murni (`side`) disusun secara simetris mengikuti sistem modul fasad depan karena ketiadaan foto dokumentasi sisi belakang gedung.
  - Penataan simetris etalase dan panggung *anjuang* di sudut ruang dalam yang tidak tertangkap kamera disusun mengikuti pola ruang tengah pada foto referensi.
  - Dimensi metrik menggunakan perkiraan proporsi visual ($1\text{ unit} \approx 1\text{ meter}$), bukan hasil pengukuran lapangan.
  - Motif ukiran, anyaman bambu, tikar rotan, dan prasasti pada tekstur kanvas adalah penyederhanaan prosedural, bukan salinan piksel per piksel dari foto asli.

### Salindia 10: Pengujian lintas perangkat dan penutup
- **Bukti pengujian terotomasi (`evidence/test-results.json`):**
  - Seluruh 20 skenario uji peramban Chromium melalui Playwright lulus tanpa galat konsol atau kegagalan jaringan.
  - Diuji pada ukuran layar desktop ($1440 \times 960$), laptop ($1366 \times 768$), tablet ($768 \times 1024$), ponsel potret ($390 \times 844$ dan $360 \times 740$), serta ponsel lanskap ($844 \times 390$).
- **Demonstrasi langsung:** Jalankan `npm run dev` dan tunjukkan interaksi mouse/sentuh, pemilihan 8 bagian, tampilan ruang dalam (`Dalam`), mode potong atap (`Buka atap`), pembukaan pintu, mode malam, pengaturan *exposure*, dan dialog referensi.
