-- Buat extension jika diperlukan (untuk UUID, dll)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabel: bahan_peledak
CREATE TABLE IF NOT EXISTS bahan_peledak (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    satuan VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel: customers
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    alamat TEXT NOT NULL,
    lat DECIMAL(10,6) NOT NULL,
    lng DECIMAL(10,6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel: sik_kemhan
CREATE TABLE IF NOT EXISTS sik_kemhan (
    id SERIAL PRIMARY KEY,
    nomor VARCHAR(255) NOT NULL UNIQUE,
    tanggal_mulai DATE NOT NULL,
    tanggal_berakhir DATE NOT NULL,
    bahan JSONB NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel: transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    perusahaan VARCHAR(255) NOT NULL,
    perusahaan_id INTEGER NOT NULL,
    bahan_ledak JSONB NOT NULL,
    biaya_logistik DECIMAL(15,2) NOT NULL DEFAULT 0,
    berita_acara TEXT,
    nama_file VARCHAR(255),
    tanggal DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaction_customer 
        FOREIGN KEY (perusahaan_id) 
        REFERENCES customers(id) 
        ON DELETE RESTRICT
);

-- Insert data default untuk bahan_peledak
INSERT INTO bahan_peledak (nama, satuan) VALUES
('Dynamite', 'kg'),
('TNT', 'box'),
('C4', 'unit'),
('ANFO', 'kg'),
('Gelignite', 'unit')
ON CONFLICT DO NOTHING;

-- Insert data default untuk customers
INSERT INTO customers (nama, alamat, lat, lng) VALUES
('PT Tambang Emas Nusantara', 'Jl. Pertambangan No. 123, Kalimantan Tengah', -2.5489, 115.3238),
('PT Batu Bara Sejahtera', 'Komplek Pertambangan Batu Bara, Sumatera Selatan', -3.3199, 103.9144),
('PT Mineral Indonesia', 'Kawasan Industri Mineral, Jawa Timur', -7.5361, 112.2384)
ON CONFLICT DO NOTHING;

-- Insert data default untuk sik_kemhan
INSERT INTO sik_kemhan (nomor, tanggal_mulai, tanggal_berakhir, bahan, keterangan) VALUES
('SIK/123/IV/2023', '2023-04-01', '2024-03-31', 
 '[{"bahanId": 1, "kuota": 5000, "terpakai": 0}, {"bahanId": 2, "kuota": 3000, "terpakai": 0}, {"bahanId": 3, "kuota": 1000, "terpakai": 0}]', 
 'Surat Izin Tahunan'),

('SIK/456/V/2023', '2023-05-15', '2024-05-14', 
 '[{"bahanId": 4, "kuota": 8000, "terpakai": 0}, {"bahanId": 5, "kuota": 2000, "terpakai": 0}]', 
 'Surat Izin Tambahan'),

('SIK/789/VI/2022', '2022-06-01', '2023-05-31', 
 '[{"bahanId": 1, "kuota": 4000, "terpakai": 4000}, {"bahanId": 2, "kuota": 2500, "terpakai": 2500}, {"bahanId": 4, "kuota": 6000, "terpakai": 6000}]', 
 'Surat Izin Tahun 2022')
ON CONFLICT DO NOTHING;

-- Buat indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_transactions_tanggal ON transactions(tanggal);
CREATE INDEX IF NOT EXISTS idx_transactions_perusahaan_id ON transactions(perusahaan_id);
CREATE INDEX IF NOT EXISTS idx_customers_nama ON customers(nama);
CREATE INDEX IF NOT EXISTS idx_bahan_peledak_nama ON bahan_peledak(nama);
CREATE INDEX IF NOT EXISTS idx_sik_kemhan_tanggal ON sik_kemhan(tanggal_mulai, tanggal_berakhir);

-- Buat function untuk update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Buat triggers untuk update updated_at
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

-- Buat view untuk laporan transaksi
CREATE OR REPLACE VIEW transaksi_lengkap AS
SELECT 
    t.id,
    t.tanggal,
    t.perusahaan,
    c.alamat,
    t.biaya_logistik,
    jsonb_array_elements(t.bahan_ledak) AS bahan_detail,
    t.created_at
FROM transactions t
LEFT JOIN customers c ON t.perusahaan_id = c.id;

-- Buat view untuk ringkasan penjualan per bahan
CREATE OR REPLACE VIEW ringkasan_penjualan_bahan AS
SELECT 
    (bahan_detail->>'jenis') AS bahan_nama,
    COUNT(*) as total_transaksi,
    SUM(CAST(bahan_detail->>'quantity' AS DECIMAL)) as total_kuantitas,
    SUM(CAST(bahan_detail->>'quantity' AS DECIMAL) * CAST(bahan_detail->>'harga' AS DECIMAL)) as total_nilai
FROM transaksi_lengkap
GROUP BY bahan_detail->>'jenis';

-- Buat view untuk ringkasan penjualan per site
CREATE OR REPLACE VIEW ringkasan_penjualan_site AS
SELECT 
    perusahaan as site_nama,
    COUNT(*) as total_transaksi,
    SUM(CAST((SELECT SUM(CAST(b->>'quantity' AS DECIMAL)) FROM jsonb_array_elements(bahan_ledak) b) AS DECIMAL)) as total_kuantitas,
    SUM(CAST((SELECT SUM(CAST(b->>'quantity' AS DECIMAL) * CAST(b->>'harga' AS DECIMAL)) FROM jsonb_array_elements(bahan_ledak) b) AS DECIMAL)) as total_nilai
FROM transactions
GROUP BY perusahaan;

-- Buat view untuk realisasi kuota SIK
CREATE OR REPLACE VIEW realisasi_kuota_sik AS
SELECT 
    bp.nama as bahan_nama,
    SUM(CAST(bahan->>'kuota' AS INTEGER)) as total_kuota,
    SUM(CAST(bahan->>'terpakai' AS INTEGER)) as total_terpakai,
    CASE 
        WHEN SUM(CAST(bahan->>'kuota' AS INTEGER)) > 0 THEN
            ROUND((SUM(CAST(bahan->>'terpakai' AS INTEGER)) * 100.0 / SUM(CAST(bahan->>'kuota' AS INTEGER))), 2)
        ELSE 0
    END as persentase_terpakai
FROM sik_kemhan sk,
     jsonb_array_elements(sk.bahan) as bahan
JOIN bahan_peledak bp ON CAST(bahan->>'bahanId' AS INTEGER) = bp.id
GROUP BY bp.nama;

-- Grant permissions (sesuaikan dengan user aplikasi)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Tampilkan informasi tentang tabel yang dibuat
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;