-- Query untuk dashboard

-- 1. Total transaksi hari ini
SELECT COUNT(*) as total_transaksi_hari_ini
FROM transactions 
WHERE tanggal = CURRENT_DATE;

-- 2. Total penjualan bulan ini
SELECT 
    SUM(CAST((SELECT SUM(CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL)) 
        FROM jsonb_array_elements(bahan_ledak) b) AS DECIMAL)) as total_penjualan_bulan_ini
FROM transactions
WHERE EXTRACT(YEAR FROM tanggal) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM tanggal) = EXTRACT(MONTH FROM CURRENT_DATE);

-- 3. Top 5 bahan terlaris bulan ini
SELECT 
    bahan_detail->>'jenis' as bahan_nama,
    SUM(CAST(bahan_detail->>'quantity' AS DECIMAL)) as total_terjual
FROM transaksi_lengkap
WHERE EXTRACT(YEAR FROM tanggal) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM tanggal) = EXTRACT(MONTH FROM CURRENT_DATE)
GROUP BY bahan_detail->>'jenis'
ORDER BY total_terjual DESC
LIMIT 5;

-- 4. Sisa kuota SIK yang masih aktif
SELECT 
    bp.nama as bahan_nama,
    SUM(CAST(bahan->>'kuota' AS INTEGER) - CAST(bahan->>'terpakai' AS INTEGER)) as sisa_kuota
FROM sik_kemhan sk,
     jsonb_array_elements(sk.bahan) as bahan
JOIN bahan_peledak bp ON CAST(bahan->>'bahanId' AS INTEGER) = bp.id
WHERE CURRENT_DATE BETWEEN sk.tanggal_mulai AND sk.tanggal_berakhir
GROUP BY bp.nama
HAVING SUM(CAST(bahan->>'kuota' AS INTEGER) - CAST(bahan->>'terpakai' AS INTEGER)) > 0;

-- 5. Transaksi per bulan (untuk chart)
SELECT 
    TO_CHAR(tanggal, 'YYYY-MM') as bulan,
    COUNT(*) as jumlah_transaksi,
    SUM(CAST((SELECT SUM(CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL)) 
        FROM jsonb_array_elements(bahan_ledak) b) AS DECIMAL)) as total_penjualan
FROM transactions
WHERE tanggal >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY TO_CHAR(tanggal, 'YYYY-MM')
ORDER BY bulan;

-- 6. Customer dengan transaksi terbanyak
SELECT 
    perusahaan,
    COUNT(*) as jumlah_transaksi,
    SUM(CAST((SELECT SUM(CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL)) 
        FROM jsonb_array_elements(bahan_ledak) b) AS DECIMAL)) as total_pembelian
FROM transactions
GROUP BY perusahaan
ORDER BY total_pembelian DESC;

-- 7. Peringatan SIK yang akan kadaluarsa (30 hari lagi)
SELECT 
    nomor,
    tanggal_berakhir,
    AGE(tanggal_berakhir, CURRENT_DATE) as sisa_waktu
FROM sik_kemhan
WHERE tanggal_berakhir BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  AND tanggal_berakhir >= CURRENT_DATE;

-- 8. Realisasi vs Kuota per bahan
SELECT 
    bahan_nama,
    total_kuota,
    total_terpakai,
    (total_kuota - total_terpakai) as sisa_kuota,
    persentase_terpakai
FROM realisasi_kuota_sik
ORDER BY persentase_terpakai DESC;