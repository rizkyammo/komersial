-- =============================================
-- QUERY MONITORING DATA ERP AMMO NUSANTARA
-- =============================================

-- 1. QUERY DASAR UNTUK MELIHAT SEMUA DATA
-- =============================================

-- Melihat semua transaksi dengan detail
SELECT 
    t.id,
    t.tanggal,
    t.perusahaan,
    c.alamat,
    t.biaya_logistik,
    jsonb_array_elements(t.bahan_ledak) as bahan_detail,
    t.created_at
FROM transactions t
LEFT JOIN customers c ON t.perusahaan_id = c.id
ORDER BY t.tanggal DESC, t.id DESC;

-- Melihat ringkasan transaksi per hari
SELECT 
    tanggal,
    COUNT(*) as jumlah_transaksi,
    SUM(biaya_logistik) as total_logistik,
    SUM(
        (SELECT SUM(CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL)) 
         FROM jsonb_array_elements(bahan_ledak) b)
    ) as total_penjualan
FROM transactions
GROUP BY tanggal
ORDER BY tanggal DESC;

-- 2. QUERY UNTUK DATA MASTER
-- =============================================

-- Melihat semua bahan peledak
SELECT * FROM bahan_peledak ORDER BY id;

-- Melihat semua customers/site
SELECT * FROM customers ORDER BY id;

-- Melihat semua SIK Kemhan
SELECT 
    id,
    nomor,
    tanggal_mulai,
    tanggal_berakhir,
    keterangan,
    created_at
FROM sik_kemhan 
ORDER BY tanggal_berakhir DESC;

-- 3. QUERY UNTUK DASHBOARD
-- =============================================

-- Statistik harian
SELECT 
    COUNT(*) as total_transaksi_hari_ini,
    SUM(biaya_logistik) as total_logistik_hari_ini,
    (
        SELECT SUM(CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL))
        FROM transactions t2, jsonb_array_elements(t2.bahan_ledak) b
        WHERE t2.tanggal = CURRENT_DATE
    ) as total_penjualan_hari_ini
FROM transactions
WHERE tanggal = CURRENT_DATE;

-- Statistik bulan ini
SELECT 
    COUNT(*) as total_transaksi_bulan_ini,
    SUM(biaya_logistik) as total_logistik_bulan_ini,
    (
        SELECT SUM(CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL))
        FROM transactions t2, jsonb_array_elements(t2.bahan_ledak) b
        WHERE EXTRACT(YEAR FROM t2.tanggal) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND EXTRACT(MONTH FROM t2.tanggal) = EXTRACT(MONTH FROM CURRENT_DATE)
    ) as total_penjualan_bulan_ini
FROM transactions
WHERE EXTRACT(YEAR FROM tanggal) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM tanggal) = EXTRACT(MONTH FROM CURRENT_DATE);

-- 4. QUERY UNTUK LAPORAN PENJUALAN
-- =============================================

-- Laporan penjualan per bahan
SELECT 
    bp.nama as bahan_peledak,
    COUNT(*) as jumlah_transaksi,
    SUM(CAST(b->>'quantity' AS DECIMAL)) as total_kuantitas,
    SUM(CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL)) as total_nilai
FROM transactions t,
     jsonb_array_elements(t.bahan_ledak) b
JOIN bahan_peledak bp ON CAST(b->>'bahanId' AS INTEGER) = bp.id
GROUP BY bp.nama
ORDER BY total_nilai DESC;

-- Laporan penjualan per customer
SELECT 
    t.perusahaan,
    COUNT(*) as jumlah_transaksi,
    SUM(CAST((SELECT SUM(CAST(b2->>'quantity' AS DECIMAL)) FROM jsonb_array_elements(t.bahan_ledak) b2) AS DECIMAL)) as total_kuantitas,
    SUM(CAST((SELECT SUM(CAST(b2->>'quantity' AS DECIMAL) * CAST(b2->>'harga' AS DECIMAL)) FROM jsonb_array_elements(t.bahan_ledak) b2) AS DECIMAL)) as total_nilai,
    AVG(t.biaya_logistik) as rata_rata_logistik
FROM transactions t
GROUP BY t.perusahaan
ORDER BY total_nilai DESC;

-- 5. QUERY UNTUK SIK KEMHAN
-- =============================================

-- Melihat detail kuota SIK
SELECT 
    sk.nomor,
    sk.tanggal_mulai,
    sk.tanggal_berakhir,
    bp.nama as bahan_peledak,
    CAST(b->>'kuota' AS INTEGER) as kuota,
    CAST(b->>'terpakai' AS INTEGER) as terpakai,
    (CAST(b->>'kuota' AS INTEGER) - CAST(b->>'terpakai' AS INTEGER)) as sisa_kuota,
    ROUND(
        (CAST(b->>'terpakai' AS DECIMAL) * 100.0 / NULLIF(CAST(b->>'kuota' AS DECIMAL), 0)), 
        2
    ) as persentase_terpakai,
    CASE 
        WHEN CURRENT_DATE BETWEEN sk.tanggal_mulai AND sk.tanggal_berakhir THEN 'AKTIF'
        WHEN CURRENT_DATE > sk.tanggal_berakhir THEN 'KADALUARSA'
        ELSE 'BELUM BERLAKU'
    END as status_sik
FROM sik_kemhan sk,
     jsonb_array_elements(sk.bahan) b
JOIN bahan_peledak bp ON CAST(b->>'bahanId' AS INTEGER) = bp.id
ORDER BY sk.tanggal_berakhir DESC, bp.nama;

-- SIK yang akan kadaluarsa dalam 30 hari
SELECT 
    nomor,
    tanggal_berakhir,
    (tanggal_berakhir - CURRENT_DATE) as hari_menuju_kadaluarsa
FROM sik_kemhan
WHERE tanggal_berakhir BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY tanggal_berakhir;

-- 6. QUERY UNTUK ANALISIS TREN
-- =============================================

-- Tren penjualan bulanan
SELECT 
    TO_CHAR(tanggal, 'YYYY-MM') as bulan,
    COUNT(*) as jumlah_transaksi,
    SUM(biaya_logistik) as total_logistik,
    SUM(
        CAST((SELECT SUM(CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL)) 
         FROM jsonb_array_elements(bahan_ledak) b) AS DECIMAL)
    ) as total_penjualan
FROM transactions
GROUP BY TO_CHAR(tanggal, 'YYYY-MM')
ORDER BY bulan DESC;

-- Tren penjualan per kuartal
SELECT 
    EXTRACT(YEAR FROM tanggal) as tahun,
    EXTRACT(QUARTER FROM tanggal) as kuartal,
    COUNT(*) as jumlah_transaksi,
    SUM(
        CAST((SELECT SUM(CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL)) 
         FROM jsonb_array_elements(bahan_ledak) b) AS DECIMAL)
    ) as total_penjualan
FROM transactions
GROUP BY EXTRACT(YEAR FROM tanggal), EXTRACT(QUARTER FROM tanggal)
ORDER BY tahun DESC, kuartal DESC;

-- 7. QUERY UNTUK MONITORING PERFORMANCE
-- =============================================

-- Customer teratas berdasarkan nilai pembelian
SELECT 
    perusahaan,
    COUNT(*) as frekuensi_pembelian,
    SUM(
        CAST((SELECT SUM(CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL)) 
         FROM jsonb_array_elements(bahan_ledak) b) AS DECIMAL)
    ) as total_pembelian,
    AVG(
        CAST((SELECT SUM(CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL)) 
         FROM jsonb_array_elements(bahan_ledak) b) AS DECIMAL)
    ) as rata_rata_transaksi
FROM transactions
GROUP BY perusahaan
ORDER BY total_pembelian DESC
LIMIT 10;

-- Bahan peledak terpopuler
SELECT 
    bp.nama as bahan_peledak,
    COUNT(*) as jumlah_transaksi,
    SUM(CAST(b->>'quantity' AS DECIMAL)) as total_terjual,
    SUM(CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL)) as total_nilai
FROM transactions t,
     jsonb_array_elements(t.bahan_ledak) b
JOIN bahan_peledak bp ON CAST(b->>'bahanId' AS INTEGER) = bp.id
GROUP BY bp.nama
ORDER BY total_terjual DESC;

-- 8. QUERY UNTUK VALIDASI DATA
-- =============================================

-- Transaksi dengan bahan yang tidak ada di master
SELECT 
    t.id,
    t.tanggal,
    t.perusahaan,
    b->>'jenis' as bahan_tidak_terdaftar
FROM transactions t,
     jsonb_array_elements(t.bahan_ledak) b
WHERE NOT EXISTS (
    SELECT 1 FROM bahan_peledak bp 
    WHERE bp.nama = b->>'jenis'
);

-- Customer tanpa transaksi
SELECT 
    c.id,
    c.nama,
    c.alamat
FROM customers c
LEFT JOIN transactions t ON c.id = t.perusahaan_id
WHERE t.id IS NULL;

-- 9. QUERY UNTUK BACKUP MONITORING
-- =============================================

-- Ringkasan data untuk backup
SELECT 
    'bahan_peledak' as tabel,
    COUNT(*) as jumlah_record,
    MAX(created_at) as update_terakhir
FROM bahan_peledak
UNION ALL
SELECT 
    'customers',
    COUNT(*),
    MAX(created_at)
FROM customers
UNION ALL
SELECT 
    'sik_kemhan',
    COUNT(*),
    MAX(created_at)
FROM sik_kemhan
UNION ALL
SELECT 
    'transactions',
    COUNT(*),
    MAX(created_at)
FROM transactions;

-- 10. QUERY REAL-TIME DASHBOARD
-- =============================================

-- Data real-time untuk dashboard
WITH stats AS (
    SELECT 
        COUNT(*) as total_transaksi,
        SUM(biaya_logistik) as total_logistik,
        SUM(
            CAST((SELECT SUM(CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL)) 
             FROM jsonb_array_elements(bahan_ledak) b) AS DECIMAL)
        ) as total_penjualan,
        COUNT(DISTINCT perusahaan) as total_customer_aktif
    FROM transactions
    WHERE tanggal >= CURRENT_DATE - INTERVAL '30 days'
),
sik_stats AS (
    SELECT 
        COUNT(*) as total_sik_aktif,
        SUM(CAST(b->>'kuota' AS INTEGER) - CAST(b->>'terpakai' AS INTEGER)) as total_sisa_kuota
    FROM sik_kemhan sk,
         jsonb_array_elements(sk.bahan) b
    WHERE CURRENT_DATE BETWEEN sk.tanggal_mulai AND sk.tanggal_berakhir
)
SELECT 
    s.total_transaksi,
    s.total_penjualan,
    s.total_logistik,
    s.total_customer_aktif,
    sik.total_sik_aktif,
    sik.total_sisa_kuota,
    (SELECT COUNT(*) FROM bahan_peledak) as total_bahan
FROM stats s, sik_stats sik;

-- 11. QUERY UNTUK EXPORT DATA
-- =============================================

-- Format data untuk export Excel
SELECT 
    t.id as "ID Transaksi",
    t.tanggal as "Tanggal",
    t.perusahaan as "Perusahaan",
    c.alamat as "Alamat",
    b->>'jenis' as "Bahan Peledak",
    CAST(b->>'quantity' AS DECIMAL) as "Kuantitas",
    b->>'satuan' as "Satuan",
    CAST(b->>'harga' AS DECIMAL) as "Harga Satuan",
    (CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL)) as "Subtotal",
    t.biaya_logistik as "Biaya Logistik",
    (CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL) - t.biaya_logistik) as "PT DAN",
    ((CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL) - t.biaya_logistik) * 1.1) as "DAN Inc Tax",
    CASE WHEN t.berita_acara IS NOT NULL THEN 'Ya' ELSE 'Tidak' END as "Ada Berita Acara"
FROM transactions t
LEFT JOIN customers c ON t.perusahaan_id = c.id,
     jsonb_array_elements(t.bahan_ledak) b
ORDER BY t.tanggal DESC, t.id DESC;