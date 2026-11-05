export type Lang = 'id' | 'min';

export interface PartTranslation {
  title: string;
  subtitle: string;
  category: string;
  description: string;
  evidence: string;
}

export interface PartEntry {
  tag: string;
  id: PartTranslation;
  min: PartTranslation;
}

export const partInfo = {
  roof: {
    tag: 'ATOK',
    id: {
      title: 'Atap & Gonjong',
      subtitle: 'Atok Ijuak Bagonjong',
      category: 'STRUKTUR ATAP · GONJONG ENAM',
      description:
        'Tiga pasang gonjong menjulang menyerupai tanduk kerbau dengan bubungan melengkung tajam dari ijuk hitam. Puncak ketujuh menaungi serambi masuk tepat pada sumbu tangga depan.',
      evidence:
        'Berdasarkan foto fasad depan PDIKM. Lengkung parabolik dan ketebalan ijuk disusun secara prosedural dari proporsi tampak depan.',
    },
    min: {
      title: 'Atok & Gonjong',
      subtitle: 'Atok Ijuak Bagonjong Anam',
      category: 'RANGKO ATOK · GONJONG ANAM',
      description:
        'Tigo pasang gonjong manjulang sarupo tanduak kabau jo bubuangan malangkuang tajam dari ijuak itam. Puncak katujuah manaungi surambi masuak tapek di sumbu janjang muko.',
      evidence:
        'Manuruik foto muko PDIKM. Langkuang atok jo taba ijuak disusun sacaro prosedural dari ukuran tampak muko.',
    },
  },
  body: {
    tag: 'BADAN',
    id: {
      title: 'Badan & Anjuang',
      subtitle: 'Badan Rumah Baanjuang',
      category: 'KONSTRUKSI UTAMA · KELARASAN KOTO PILIANG',
      description:
        'Badan rumah memanjang sembilan ruang dengan sayap anjuang yang ditinggikan di ujung kiri dan kanan. Dinding papan miring keluar mengikuti kaidah sambungan pasak kayu tanpa paku besi.',
      evidence:
        'Fasad depan mengikuti foto referensi PDIKM. Susunan panel dinding belakang menggunakan pendekatan simetris.',
    },
    min: {
      title: 'Badan & Anjuang',
      subtitle: 'Badan Rumah Gadang Baanjuang',
      category: 'BADAN UTAMO · LAREH KOTO PILIANG',
      description:
        'Badan rumah mamanjang sambilan ruang jo anjuang nan ditinggikan di ujuang kida jo suok. Dindiang papan miriang kalua manuruik adat sambuangan pasak kayu tanpo paku basi.',
      evidence:
        'Fasad muko manuruik foto referensi PDIKM. Susunan papan dindiang balakang mamakai pandakatan simetris.',
    },
  },
  pillars: {
    tag: 'TONGGAK',
    id: {
      title: 'Tiang & Kolong',
      subtitle: 'Tonggak Tuo & Kolong',
      category: 'FONDASI PANGGUNG · UMPAK BATU SANDI',
      description:
        'Tiga puluh tiang kayu juha menopang lantai panggung di atas batu sandi agar tahan guncangan gempa. Bagian kolong ditutup kisi bambu diagonal dengan lengkungan ukir di sepanjang tepi bawah.',
      evidence:
        'Barisan tiang luar dan tonggak ruang dalam merujuk foto eksterior serta ruang pamer PDIKM.',
    },
    min: {
      title: 'Tonggak & Kolong',
      subtitle: 'Tonggak Tuo & Sandi Batu',
      category: 'TONGGAK PANGGUANG · BATU SANDI',
      description:
        'Tigo puluah tonggak kayu manopang lantai pangguang di ateh batu sandi supayo tahan guncangan gampo. Bagian kolong ditutuik kisi bambu basilang jo langkuang ukia di tapi bawah.',
      evidence:
        'Barisan tonggak lua jo tonggak ruang dalam marujuak foto lua sarato ruang pamer PDIKM.',
    },
  },
  stairs: {
    tag: 'JANJANG',
    id: {
      title: 'Tangga Masuk',
      subtitle: 'Janjang Naiak Surambi',
      category: 'SIRKULASI MASUK · SUMBU TENGAH',
      description:
        'Tangga batu berlapis ubin terakota menghubungkan pelataran halaman dengan pintu serambi. Pipi tangga berundak tegas mengarahkan langkah pengunjung naik menuju ruang pamer.',
      evidence:
        'Posisi sumbu tengah merujuk foto resmi Kemdikbud. Jumlah anak tangga dan kemiringan merupakan pendekatan proporsional.',
    },
    min: {
      title: 'Janjang Naiak',
      subtitle: 'Janjang Batu Surambi Muko',
      category: 'JALAN NAIK · SUMBU TANGAH',
      description:
        'Janjang batu balapih ubin merah mahubuangkan halaman muko jo pintu surambi. Pipi janjang baundak tageh manuntun langkah tamu naiak ka ruang pamer.',
      evidence:
        'Posisi sumbu tangah marujuak foto rasmi Kemdikbud. Jumlah anak janjang jo kamiriangan adolah pandakatan ukuran.',
    },
  },
  doors: {
    tag: 'SURAMBI',
    id: {
      title: 'Pintu & Serambi',
      subtitle: 'Pintu Gadang & Surambi Muko',
      category: 'BUKAAN UTAMA · ENGSEL INTERAKTIF',
      description:
        'Daun pintu ganda berukir ditempatkan di balik lengkungan serambi depan. Tekan tombol Buka Pintu atau tombol D pada keyboard untuk memutar kedua daun pintu ke arah ruang dalam.',
      evidence:
        'Bukaan serambi terlihat pada foto referensi. Titik putar engsel dan sudut ayun 86 derajat dirancang untuk simulasi interaktif.',
    },
    min: {
      title: 'Pintu & Surambi',
      subtitle: 'Pintu Gadang & Surambi Muko',
      category: 'PINTU UTAMO · ENGSEL INTERAKTIF',
      description:
        'Daun pintu duo baukia dipasang di baliak langkuang surambi muko. Takan tombol Bukak Pintu atau huruf D di keyboard untuak mamuta kaduo daun pintu ka arah ruang dalam.',
      evidence:
        'Bukaan surambi nampak di foto referensi. Titiak putar engsel jo suduik bukak 86 darajat dirancang untuak simulasi.',
    },
  },
  windows: {
    tag: 'JANDELA',
    id: {
      title: 'Jendela Fasad',
      subtitle: 'Jandela Angin & Anjuang',
      category: 'VENTILASI ALAMI · RITME DELAPAN BUKAAN',
      description:
        'Delapan jendela berbingkai emas dan krem berjajar mengikuti petak ruang di sepanjang dinding depan, ditambah jendela sudut pada kedua sayap anjuang untuk mengalirkan udara pegunungan Padang Panjang.',
      evidence:
        'Jumlah dan ritme jendela depan mengikuti foto referensi. Jendela samping dan belakang disusun mengikuti modul kolom.',
    },
    min: {
      title: 'Jandela Rumah',
      subtitle: 'Jandela Angin & Anjuang',
      category: 'LUBANG ANGIN · SALAPAN BUKAAN',
      description:
        'Salapan jandela babingkai ameh jo kuniang gadiang bajaja manuruik ruang di dindiang muko, ditambah jandela suduik di kaduo anjuang untuak maalirkan angin sajuak Padang Panjang.',
      evidence:
        'Jumlah jo jarak jandela muko manuruik foto referensi. Jandela sampiang jo balakang disusun manuruik modul tonggak.',
    },
  },
  ornaments: {
    tag: 'UKIRAN',
    id: {
      title: 'Ukiran Minang',
      subtitle: 'Aka Cino & Pucuak Rabuang',
      category: 'RAGAM HIAS · MARAWA TIGA WARNA',
      description:
        'Bidang papan dihiasi motif sulur Aka Cino, Pucuak Rabuang, dan Itiak Pulang Patang dengan perpaduan warna merah kesumba, kuning kunyit keemasan, dan hitam sirih, dilengkapi papan nama PDIKM.',
      evidence:
        'Merujuk foto Rumitnya Ukiran Minang. Pola relief direkonstruksi secara prosedural dengan tekstur kanvas resolusi tinggi.',
    },
    min: {
      title: 'Ukiran Minang',
      subtitle: 'Aka Cino & Pucuak Rabuang',
      category: 'RAGAM UKIA · WARNA MARAWA',
      description:
        'Bidang papan dihiasi ukiran Aka Cino, Pucuak Rabuang, jo Itiak Pulang Patang dalam paduan warna sirah kasumbo, kuniang kunyik ameh, jo itam siriah, langkok jo papan namo PDIKM.',
      evidence:
        'Marujuak foto Rumitnya Ukiran Minang. Pola ukia disusun sacaro prosedural jo tekstur kanvas.',
    },
  },
  interior: {
    tag: 'PUSTAKA',
    id: {
      title: 'Ruang Dalam PDIKM',
      subtitle: 'Galeri & Pustaka Budaya',
      category: 'INTERIOR DOKUMENTASI · TIKAR ROTAN & PLAFON BAMBU',
      description:
        'Aula pamer berlantai tikar rotan dan berplafon anyaman bambu miring, memuat balok pengikat tiang berukir, meja buku tamu, prasasti peresmian, etalase manuskrip kaca, rak pustaka, dan lampu gantung antik.',
      evidence:
        'Merujuk foto Inside the PDIKM.JPG (CC BY-SA 3.0). Perabot di luar cakupan lensa kamera disusun secara simetris.',
    },
    min: {
      title: 'Ruang Dalam PDIKM',
      subtitle: 'Ruang Pamer & Pustaka Adat',
      category: 'RUANG DALAM · LAPIK ROTAN & LOTENG BAMBU',
      description:
        'Ruang pamer balantai lapik rotan jo loteng anyaman bambu miriang, mamuek balok pangikek tonggak baukia, meja buku tamu, prasasti parasmian, lamari kaco naskah kuno, rak buku, jo lampu gantuang.',
      evidence:
        'Marujuak foto Inside the PDIKM.JPG (CC BY-SA 3.0). Susunan parabot di lua jangkauan foto disusun sacaro simetris.',
    },
  },
} as const satisfies Record<string, PartEntry>;

export type PartId = keyof typeof partInfo;

export const uiText = {
  id: {
    brandSub: 'PUSAT DOKUMENTASI MINANGKABAU',
    langLabel: 'Baso Minang',
    referencesBtn: 'Sumber Foto',
    helpBtn: 'Panduan',
    kickerSub: 'ARSITEKTUR BAANJUANG · KOTO PILIANG',
    location: 'Padang Panjang · Sumatera Barat',
    introCopy:
      'Amati konstruksi atap gonjong, ragam ukiran kayu, serta tata ruang dalam Pusat Dokumentasi dan Informasi Kebudayaan Minangkabau.',
    partsHeading: 'Komponen Arsitektur',
    partsCount: '8 Elemen',
    defaultCategory: 'KAJIAN STRUKTUR & RUANG',
    defaultTitle: 'Pilih komponen pada model atau daftar di atas.',
    defaultDescription:
      'Setiap bagian menampilkan fungsi konstruksi, tata ruang adat, serta batas antara rujukan foto asli dan rekonstruksi prosedural.',
    defaultEvidence:
      'Rekonstruksi mengacu pada enam foto dokumentasi terbuka PDIKM Padang Panjang.',
    clearSelection: 'Lepas sorotan komponen',
    proverbTitle: 'Alam Takambang Jadi Guru',
    proverbSub: 'Falsafah rancang bangun Minangkabau',
    sceneStatusReady: 'MODEL 3D AKTIF',
    sceneStatusLoading: 'MENYUSUN GEOMETRI',
    views: {
      perspective: 'Perspektif ¾',
      front: 'Tampak Depan',
      side: 'Tampak Samping',
      back: 'Tampak Belakang · Asumsi',
      interior: 'Ruang Dalam · Galeri PDIKM',
    },
    viewButtons: {
      perspective: '¾',
      front: 'Depan',
      side: 'Samping',
      back: 'Belakang',
      interior: 'Dalam',
    },
    captionLeft: 'REKONSTRUKSI PROSEDURAL THREE.JS',
    assumptions: {
      default: 'Fasad dan proporsi mengacu pada foto dokumentasi PDIKM',
      back: 'Sisi belakang disusun simetris karena ketiadaan foto pembanding',
      interior: 'Ruang dalam mengacu pada foto Inside the PDIKM.JPG (CC BY-SA 3.0)',
    },
    dayLabel: 'Siang',
    nightLabel: 'Malam',
    doorOpenLabel: 'Buka pintu',
    doorCloseLabel: 'Tutup pintu',
    cutawayOpenLabel: 'Buka atap',
    cutawayCloseLabel: 'Tutup atap',
    tourStartLabel: 'Tur kamera',
    tourStopLabel: 'Hentikan tur',
    resetLabel: 'Reset',
    exposureLabel: 'Eksposur',
    gestureHint:
      'Geser untuk memutar kamera · Gulir untuk zoom · Klik bagian rumah untuk membaca detail · Tekan L untuk Baso Minang',
    helpCategory: 'NAVIGASI & KONTROL INTERAKTIF',
    helpTitle: 'Panduan Pengamatan Model 3D',
    helpItems: [
      ['Putar Kamera 360°', 'Geser dengan tombol kiri mouse atau satu jari pada layar sentuh.'],
      ['Perbesar & Perkecil', 'Gunakan roda gulir mouse, cubit dua jari, atau tombol + dan −.'],
      ['Geser Sumbu Pandang', 'Geser dengan tombol kanan mouse atau dua jari secara bersamaan.'],
      [
        'Eksplorasi Komponen & Interior',
        'Klik langsung bagian bangunan pada kanvas 3D atau pilih dari daftar kiri. Gunakan tombol Dalam atau Buka atap untuk meninjau ruang pamer PDIKM.',
      ],
      [
        'Pintasan Papan Ketik',
        'R: reset kamera · D: buka/tutup pintu · C: buka/tutup atap · I: kamera ruang dalam · N: siang/malam · T: tur otomatis · L: ganti bahasa ID/MIN · Esc: tutup dialog.',
      ],
    ],
    helpFooter:
      'Interaksi kamera manual akan menghentikan tur otomatis. Penggeser Eksposur mengatur kecerahan tone mapping ACES Filmic.',
    refCategory: 'DOKUMENTASI OBJEK TUNGGAL · SUMBER TERBUKA',
    refTitle: 'Rujukan Visual Rumah Gadang PDIKM',
    refIntro:
      'Seluruh geometri mengacu pada satu bangunan fisik yang sama: Rumah Gadang Pusat Dokumentasi dan Informasi Kebudayaan Minangkabau (PDIKM) di Kelurahan Silaing Bawah, Padang Panjang.',
    refDisclosure:
      'Siluet atap gonjong, fasad depan, ukiran serambi, dan ruang pamer dalam mengacu langsung pada keenam foto di atas. Ukuran metrik presisi, fasad belakang, serta mekanisme ayun engsel pintu merupakan pendekatan prosedural.',
    refLink: 'Lihat dokumen atribusi dan lisensi lengkap (sources.md) ↗',
    refSourceLink: 'Wikimedia Commons ↗',
  },
  min: {
    brandSub: 'PUSTAKA BUDAYA MINANGKABAU',
    langLabel: 'Bahasa Indonesia',
    referencesBtn: 'Rujuakan Foto',
    helpBtn: 'Patunjuak',
    kickerSub: 'ARSITEKTUR BAANJUANG · LAREH KOTO PILIANG',
    location: 'Padang Panjang · Sumatera Barat',
    introCopy:
      'Caliak bantuak atok gonjong, ragam ukiran kayu, sarato susunan ruang dalam Pusek Dokumentasi jo Informasi Kabudayaan Minangkabau.',
    partsHeading: 'Bagian Bangunan Adat',
    partsCount: '8 Bagian',
    defaultCategory: 'KAJIAN BANTUAK & RUANG ADAT',
    defaultTitle: 'Piliahlah bagian rumah pado model atau daftar di ateh.',
    defaultDescription:
      'Tiok bagian manunjuakkan guno rangko bangunan, susunan ruang adat, sarato bateh antaro rujuakan foto asli jo rekonstruksi prosedural.',
    defaultEvidence:
      'Rekonstruksi marujuak pado anam foto dokumentasi tabukak PDIKM Padang Panjang.',
    clearSelection: 'Hapuih sorotan bagian',
    proverbTitle: 'Alam Takambang Jadi Guru',
    proverbSub: 'Pituah adaik rancang bangun Minangkabau',
    sceneStatusReady: 'MODEL 3D AKTIF',
    sceneStatusLoading: 'MANYUSUN RANGKO',
    views: {
      perspective: 'Suduik Pandang ¾',
      front: 'Tampak Muko',
      side: 'Tampak Sampiang',
      back: 'Tampak Balakang · Asumsi',
      interior: 'Ruang Dalam · Pustaka PDIKM',
    },
    viewButtons: {
      perspective: '¾',
      front: 'Muko',
      side: 'Sampiang',
      back: 'Balakang',
      interior: 'Dalam',
    },
    captionLeft: 'REKONSTRUKSI PROSEDURAL THREE.JS',
    assumptions: {
      default: 'Fasad muko jo ukuran marujuak foto dokumentasi PDIKM',
      back: 'Sisi balakang disusun simetris karano alun ado foto pamandiang',
      interior: 'Ruang dalam marujuak foto Inside the PDIKM.JPG (CC BY-SA 3.0)',
    },
    dayLabel: 'Siang',
    nightLabel: 'Malam',
    doorOpenLabel: 'Bukak pintu',
    doorCloseLabel: 'Tutuik pintu',
    cutawayOpenLabel: 'Bukak atok',
    cutawayCloseLabel: 'Tutuik atok',
    tourStartLabel: 'Putar kamera',
    tourStopLabel: 'Hentikan putaran',
    resetLabel: 'Reset',
    exposureLabel: 'Cahayo',
    gestureHint:
      'Gesa untuak mamuta kamera · Gulia untuak zoom · Klik bagian rumah untuak mambaco keterangan · Takan L untuak Bahasa Indonesia',
    helpCategory: 'PATUNJUAK KONTROL & KAMERA',
    helpTitle: 'Caro Maninjau Model 3D Rumah Gadang',
    helpItems: [
      ['Puta Kamera 360°', 'Gesa jo tombol kida mouse atau satu jari di laya sentuah.'],
      ['Pagadang & Pakaciak', 'Gunokan roda gulia mouse, cubik duo jari, atau tombol + jo −.'],
      ['Gesa Arah Pandang', 'Gesa jo tombol suok mouse atau duo jari samo-samo.'],
      [
        'Pilia Bagian & Ruang Dalam',
        'Klik lansuang bagian rumah di kanvas 3D atau piliah dari daftar kida. Gunokan tombol Dalam atau Bukak atok untuak mancaliak ruang pamer PDIKM.',
      ],
      [
        'Tombol Papan Ketik',
        'R: reset kamera · D: bukak/tutuik pintu · C: bukak/tutuik atok · I: kamera ruang dalam · N: siang/malam · T: putar otomatis · L: ganti bahaso ID/MIN · Esc: tutuik jandela.',
      ],
    ],
    helpFooter:
      'Garak kamera manual akan maantikan putaran otomatis. Panggeser Cahayo maatuakan tarang tone mapping ACES Filmic.',
    refCategory: 'DOKUMENTASI SATU BANGUNAN · SUMBER TABUKAK',
    refTitle: 'Rujuakan Foto Rumah Gadang PDIKM',
    refIntro:
      'Sadonyo bantuak 3D marujuak pado satu bangunan fisik nan samo: Rumah Gadang Pusek Dokumentasi jo Informasi Kabudayaan Minangkabau (PDIKM) di Silaing Bawah, Padang Panjang.',
    refDisclosure:
      'Siluet atok gonjong, fasad muko, ukiran surambi, jo ruang pamer dalam manuruik kaanam foto di ateh. Ukuran metrik, dindiang balakang, sarato engsel pintu adolah pandakatan prosedural.',
    refLink: 'Caliak dokumen sumber jo lisensi langkok (sources.md) ↗',
    refSourceLink: 'Wikimedia Commons ↗',
  },
} as const;
