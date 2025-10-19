-- =============================================
-- DATABASE: erp_ammo_nusantara
-- TABEL UNTUK SISTEM ERP PT DISTRIBUSI AMMO NUSANTARA
-- =============================================

-- Hapus tabel jika sudah ada (opsional, hati-hati di production)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS sik_kemhan CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS bahan_peledak CASCADE;

-- =============================================
-- TABEL: bahan_peledak
-- Untuk menyimpan master data bahan peledak
-- =============================================
CREATE TABLE bahan_peledak (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL UNIQUE,
    satuan VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE bahan_peledak IS 'Tabel master data bahan peledak';
COMMENT ON COLUMN bahan_peledak.id IS 'ID unik bahan peledak';
COMMENT ON COLUMN bahan_peledak.nama IS 'Nama bahan peledak (Dynamite, TNT, dll)';
COMMENT ON COLUMN bahan_peledak.satuan IS 'Satuan pengukuran (kg, box, unit)';

-- =============================================
-- TABEL: customers
-- Untuk menyimpan data perusahaan/site customer
-- =============================================
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL UNIQUE,
    alamat TEXT NOT NULL,
    lat DECIMAL(10,6) NOT NULL,
    lng DECIMAL(10,6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE customers IS 'Tabel master data customer/perusahaan';
COMMENT ON COLUMN customers.id IS 'ID unik customer';
COMMENT ON COLUMN customers.nama IS 'Nama perusahaan/customer';
COMMENT ON COLUMN customers.alamat IS 'Alamat lengkap customer';
COMMENT ON COLUMN customers.lat IS 'Koordinat latitude untuk peta';
COMMENT ON COLUMN customers.lng IS 'Koordinat longitude untuk peta';

-- =============================================
-- TABEL: sik_kemhan
-- Untuk menyimpan data Surat Izin Kementerian Pertahanan
-- =============================================
CREATE TABLE sik_kemhan (
    id SERIAL PRIMARY KEY,
    nomor VARCHAR(255) NOT NULL UNIQUE,
    tanggal_mulai DATE NOT NULL,
    tanggal_berakhir DATE NOT NULL,
    bahan JSONB NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sik_kemhan IS 'Tabel data Surat Izin Kementerian Pertahanan (SIK)';
COMMENT ON COLUMN sik_kemhan.id IS 'ID unik SIK';
COMMENT ON COLUMN sik_kemhan.nomor IS 'Nomor surat izin (contoh: SIK/123/IV/2023)';
COMMENT ON COLUMN sik_kemhan.tanggal_mulai IS 'Tanggal mulai berlaku SIK';
COMMENT ON COLUMN sik_kemhan.tanggal_berakhir IS 'Tanggal berakhir berlaku SIK';
COMMENT ON COLUMN sik_kemhan.bahan IS 'Data bahan dengan kuota dalam format JSONB';
COMMENT ON COLUMN sik_kemhan.keterangan IS 'Keterangan tambahan SIK';

-- =============================================
-- TABEL: transactions
-- Untuk menyimpan data transaksi penjualan
-- =============================================
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    perusahaan VARCHAR(255) NOT NULL,
    perusahaan_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    bahan_ledak JSONB NOT NULL,
    biaya_logistik DECIMAL(15,2) NOT NULL DEFAULT 0,
    berita_acara TEXT,
    nama_file VARCHAR(255),
    tanggal DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE transactions IS 'Tabel data transaksi penjualan';
COMMENT ON COLUMN transactions.id IS 'ID unik transaksi';
COMMENT ON COLUMN transactions.perusahaan IS 'Nama perusahaan pembeli';
COMMENT ON COLUMN transactions.perusahaan_id IS 'ID customer dari tabel customers';
COMMENT ON COLUMN transactions.bahan_ledak IS 'Data bahan peledak yang ditransaksikan (JSONB)';
COMMENT ON COLUMN transactions.biaya_logistik IS 'Biaya logistik transaksi';
COMMENT ON COLUMN transactions.berita_acara IS 'File berita acara dalam format base64';
COMMENT ON COLUMN transactions.nama_file IS 'Nama file berita acara';
COMMENT ON COLUMN transactions.tanggal IS 'Tanggal transaksi';

-- =============================================
-- INSERT DATA DEFAULT
-- =============================================

-- Data default bahan peledak
INSERT INTO bahan_peledak (nama, satuan) VALUES
('Dynamite', 'kg'),
('TNT', 'box'),
('C4', 'unit'),
('ANFO', 'kg'),
('Gelignite', 'unit');

-- Data default customers
INSERT INTO customers (nama, alamat, lat, lng) VALUES
('PT Tambang Emas Nusantara', 'Jl. Pertambangan No. 123, Kalimantan Tengah', -2.5489, 115.3238),
('PT Batu Bara Sejahtera', 'Komplek Pertambangan Batu Bara, Sumatera Selatan', -3.3199, 103.9144),
('PT Mineral Indonesia', 'Kawasan Industri Mineral, Jawa Timur', -7.5361, 112.2384);

-- Data default SIK Kemhan
INSERT INTO sik_kemhan (nomor, tanggal_mulai, tanggal_berakhir, bahan, keterangan) VALUES
('SIK/123/IV/2023', '2023-04-01', '2024-03-31', 
 '[{"bahanId": 1, "bahanNama": "Dynamite", "kuota": 5000, "terpakai": 0}, 
   {"bahanId": 2, "bahanNama": "TNT", "kuota": 3000, "terpakai": 0}, 
   {"bahanId": 3, "bahanNama": "C4", "kuota": 1000, "terpakai": 0}]', 
 'Surat Izin Tahunan'),

('SIK/456/V/2023', '2023-05-15', '2024-05-14', 
 '[{"bahanId": 4, "bahanNama": "ANFO", "kuota": 8000, "terpakai": 0}, 
   {"bahanId": 5, "bahanNama": "Gelignite", "kuota": 2000, "terpakai": 0}]', 
 'Surat Izin Tambahan'),

('SIK/789/VI/2022', '2022-06-01', '2023-05-31', 
 '[{"bahanId": 1, "bahanNama": "Dynamite", "kuota": 4000, "terpakai": 4000}, 
   {"bahanId": 2, "bahanNama": "TNT", "kuota": 2500, "terpakai": 2500}, 
   {"bahanId": 4, "bahanNama": "ANFO", "kuota": 6000, "terpakai": 6000}]', 
 'Surat Izin Tahun 2022');

-- =============================================
-- CREATE INDEXES UNTUK PERFORMANSI
-- =============================================

-- Index untuk transactions
CREATE INDEX idx_transactions_tanggal ON transactions(tanggal);
CREATE INDEX idx_transactions_perusahaan_id ON transactions(perusahaan_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Index untuk customers
CREATE INDEX idx_customers_nama ON customers(nama);

-- Index untuk bahan_peledak
CREATE INDEX idx_bahan_peledak_nama ON bahan_peledak(nama);

-- Index untuk sik_kemhan
CREATE INDEX idx_sik_kemhan_tanggal ON sik_kemhan(tanggal_mulai, tanggal_berakhir);
CREATE INDEX idx_sik_kemhan_nomor ON sik_kemhan(nomor);

-- Index untuk JSONB columns (PostgreSQL 12+)
CREATE INDEX idx_transactions_bahan_ledak ON transactions USING gin(bahan_ledak);
CREATE INDEX idx_sik_kemhan_bahan ON sik_kemhan USING gin(bahan);

-- =============================================
-- CREATE FUNCTIONS DAN TRIGGERS
-- =============================================

-- Function untuk update updated_at otomatis
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers untuk semua tabel
CREATE TRIGGER update_bahan_peledak_updated_at 
    BEFORE UPDATE ON bahan_peledak 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sik_kemhan_updated_at 
    BEFORE UPDATE ON sik_kemhan 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- CREATE VIEWS UNTUK LAPORAN
-- =============================================

-- View untuk melihat transaksi lengkap dengan detail bahan
CREATE OR REPLACE VIEW view_transaksi_lengkap AS
SELECT 
    t.id,
    t.tanggal,
    t.perusahaan,
    c.alamat,
    t.biaya_logistik,
    t.bahan_ledak,
    t.berita_acara,
    t.nama_file,
    t.created_at,
    jsonb_array_elements(t.bahan_ledak) AS bahan_detail
FROM transactions t
LEFT JOIN customers c ON t.perusahaan_id = c.id;

COMMENT ON VIEW view_transaksi_lengkap IS 'View untuk melihat detail lengkap transaksi dengan breakdown per bahan';

-- View untuk ringkasan penjualan per bahan
CREATE OR REPLACE VIEW view_ringkasan_bahan AS
SELECT 
    bahan->>'jenis' AS bahan_nama,
    COUNT(*) as total_transaksi,
    SUM(CAST(bahan->>'quantity' AS NUMERIC)) as total_kuantitas,
    SUM(CAST(bahan->>'quantity' AS NUMERIC) * CAST(bahan->>'harga' AS NUMERIC)) as total_nilai,
    MAX(bahan->>'satuan') as satuan
FROM transactions t,
     jsonb_array_elements(t.bahan_ledak) AS bahan
GROUP BY bahan->>'jenis';

COMMENT ON VIEW view_ringkasan_bahan IS 'View untuk ringkasan penjualan per jenis bahan peledak';

-- View untuk ringkasan penjualan per site/customer
CREATE OR REPLACE VIEW view_ringkasan_site AS
SELECT 
    t.perusahaan,
    c.alamat,
    COUNT(DISTINCT t.id) as total_transaksi,
    SUM(CAST(bahan->>'quantity' AS NUMERIC)) as total_kuantitas,
    SUM(CAST(bahan->>'quantity' AS NUMERIC) * CAST(bahan->>'harga' AS NUMERIC)) as total_nilai,
    SUM(t.biaya_logistik) as total_logistik
FROM transactions t
LEFT JOIN customers c ON t.perusahaan_id = c.id,
     jsonb_array_elements(t.bahan_ledak) AS bahan
GROUP BY t.perusahaan, c.alamat;

COMMENT ON VIEW view_ringkasan_site IS 'View untuk ringkasan penjualan per site/customer';

-- View untuk realisasi kuota SIK
CREATE OR REPLACE VIEW view_realisasi_kuota AS
SELECT 
    bp.nama as bahan_nama,
    bp.satuan,
    SUM(CAST(bahan->>'kuota' AS INTEGER)) as total_kuota,
    SUM(CAST(bahan->>'terpakai' AS INTEGER)) as total_terpakai,
    SUM(CAST(bahan->>'kuota' AS INTEGER) - CAST(bahan->>'terpakai' AS INTEGER)) as sisa_kuota,
    CASE 
        WHEN SUM(CAST(bahan->>'kuota' AS INTEGER)) > 0 THEN
            ROUND((SUM(CAST(bahan->>'terpakai' AS INTEGER)) * 100.0 / SUM(CAST(bahan->>'kuota' AS INTEGER))), 2)
        ELSE 0
    END as persentase_terpakai,
    CASE 
        WHEN SUM(CAST(bahan->>'kuota' AS INTEGER) - CAST(bahan->>'terpakai' AS INTEGER)) <= 0 THEN 'HABIS'
        WHEN (SUM(CAST(bahan->>'terpakai' AS INTEGER)) * 100.0 / SUM(CAST(bahan->>'kuota' AS INTEGER))) >= 90 THEN 'KRITIS'
        WHEN (SUM(CAST(bahan->>'terpakai' AS INTEGER)) * 100.0 / SUM(CAST(bahan->>'kuota' AS INTEGER))) >= 75 THEN 'WASPADA'
        ELSE 'AMAN'
    END as status_kuota
FROM sik_kemhan sk,
     jsonb_array_elements(sk.bahan) as bahan
JOIN bahan_peledak bp ON CAST(bahan->>'bahanId' AS INTEGER) = bp.id
WHERE CURRENT_DATE BETWEEN sk.tanggal_mulai AND sk.tanggal_berakhir
GROUP BY bp.nama, bp.satuan;

COMMENT ON VIEW view_realisasi_kuota IS 'View untuk melihat realisasi kuota SIK yang masih aktif';

-- View untuk SIK yang akan kadaluarsa
CREATE OR REPLACE VIEW view_sik_kadaluarsa AS
SELECT 
    id,
    nomor,
    tanggal_mulai,
    tanggal_berakhir,
    (tanggal_berakhir - CURRENT_DATE) as hari_menuju_kadaluarsa,
    keterangan
FROM sik_kemhan
WHERE tanggal_berakhir BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
ORDER BY tanggal_berakhir ASC;

COMMENT ON VIEW view_sik_kadaluarsa IS 'View untuk memantau SIK yang akan kadaluarsa dalam 30 hari';

-- =============================================
-- QUERY UNTUK MELIHAT DATA
-- =============================================

-- Query untuk melihat semua data
SELECT 'bahan_peledak' as table_name, COUNT(*) as row_count FROM bahan_peledak
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'sik_kemhan', COUNT(*) FROM sik_kemhan
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions;

-- Query contoh untuk melihat transaksi terbaru
SELECT 
    t.id,
    t.tanggal,
    t.perusahaan,
    COUNT(bahan) as jumlah_jenis_bahan,
    SUM(CAST(bahan->>'quantity' AS NUMERIC)) as total_kuantitas,
    SUM(CAST(bahan->>'quantity' AS NUMERIC) * CAST(bahan->>'harga' AS NUMERIC)) as total_nilai,
    t.biaya_logistik
FROM transactions t,
     jsonb_array_elements(t.bahan_ledak) AS bahan
GROUP BY t.id, t.tanggal, t.perusahaan, t.biaya_logistik
ORDER BY t.tanggal DESC
LIMIT 10;

-- Query untuk melihat kuota SIK per bahan
SELECT 
    bp.nama as bahan,
    bp.satuan,
    sk.nomor as no_sik,
    sk.tanggal_berakhir,
    bahan->>'kuota' as kuota,
    bahan->>'terpakai' as terpakai,
    (CAST(bahan->>'kuota' AS INTEGER) - CAST(bahan->>'terpakai' AS INTEGER)) as sisa
FROM sik_kemhan sk,
     jsonb_array_elements(sk.bahan) as bahan
JOIN bahan_peledak bp ON CAST(bahan->>'bahanId' AS INTEGER) = bp.id
WHERE CURRENT_DATE BETWEEN sk.tanggal_mulai AND sk.tanggal_berakhir
ORDER BY bp.nama, sk.tanggal_berakhir;

-- =============================================
-- GRANT PERMISSIONS (Sesuaikan dengan user aplikasi)
-- =============================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- =============================================
-- INFORMASI TABEL
-- =============================================
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;