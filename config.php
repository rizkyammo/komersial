<?php
// Konfigurasi database PostgreSQL
define('DB_HOST', 'localhost');
define('DB_PORT', '5432');
define('DB_NAME', 'erp_ammo_nusantara');
define('DB_USER', 'postgres');
define('DB_PASS', 'root');

function getDBConnection() {
    try {
        $conn = new PDO("pgsql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $conn;
    } catch (PDOException $e) {
        die("Koneksi database gagal: " . $e->getMessage());
    }
}

// Fungsi untuk inisialisasi tabel jika belum ada
function initDatabase() {
    $conn = getDBConnection();
    
    // Tabel transactions
    $conn->exec("
        CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            perusahaan VARCHAR(255) NOT NULL,
            perusahaan_id INTEGER NOT NULL,
            bahan_ledak JSONB NOT NULL,
            biaya_logistik DECIMAL(15,2) NOT NULL,
            berita_acara TEXT,
            nama_file VARCHAR(255),
            tanggal DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Tabel bahan_peledak
    $conn->exec("
        CREATE TABLE IF NOT EXISTS bahan_peledak (
            id SERIAL PRIMARY KEY,
            nama VARCHAR(255) NOT NULL,
            satuan VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Tabel customers
    $conn->exec("
        CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            nama VARCHAR(255) NOT NULL,
            alamat TEXT NOT NULL,
            lat DECIMAL(10,6) NOT NULL,
            lng DECIMAL(10,6) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Tabel sik_kemhan
    $conn->exec("
        CREATE TABLE IF NOT EXISTS sik_kemhan (
            id SERIAL PRIMARY KEY,
            nomor VARCHAR(255) NOT NULL,
            tanggal_mulai DATE NOT NULL,
            tanggal_berakhir DATE NOT NULL,
            bahan JSONB NOT NULL,
            keterangan TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
}

// Panggil inisialisasi database
initDatabase();
?>