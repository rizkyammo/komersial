<?php
require_once 'config.php';

// Enable error reporting untuk debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set header JSON
header('Content-Type: application/json');

// CORS headers untuk development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Cek apakah request adalah POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Ambil data dari request
        $input = file_get_contents('php://input');
        
        if (empty($input)) {
            throw new Exception('Data input kosong');
        }
        
        $data = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('JSON decode error: ' . json_last_error_msg());
        }
        
        // Validasi data
        if (!$data) {
            throw new Exception('Data tidak valid');
        }
        
        if (!isset($data['transactions']) || !isset($data['bahanPeledak']) || 
            !isset($data['customers']) || !isset($data['sikKemhan'])) {
            throw new Exception('Struktur data tidak lengkap');
        }

        $conn = getDBConnection();
        $conn->beginTransaction();
        
        // 1. Hapus semua data lama (dengan urutan yang aman untuk foreign key)
        $conn->exec("DELETE FROM transactions");
        $conn->exec("DELETE FROM sik_kemhan");
        $conn->exec("DELETE FROM bahan_peledak");
        $conn->exec("DELETE FROM customers");
        
        // 2. Reset sequence untuk PostgreSQL
        $conn->exec("ALTER SEQUENCE transactions_id_seq RESTART WITH 1");
        $conn->exec("ALTER SEQUENCE bahan_peledak_id_seq RESTART WITH 1");
        $conn->exec("ALTER SEQUENCE customers_id_seq RESTART WITH 1");
        $conn->exec("ALTER SEQUENCE sik_kemhan_id_seq RESTART WITH 1");
        
        // 3. Simpan customers
        $stmtCustomer = $conn->prepare("
            INSERT INTO customers (nama, alamat, lat, lng) 
            VALUES (?, ?, ?, ?)
        ");
        
        foreach ($data['customers'] as $customer) {
            $stmtCustomer->execute([
                $customer['nama'],
                $customer['alamat'],
                $customer['koordinat']['lat'],
                $customer['koordinat']['lng']
            ]);
        }
        
        // 4. Simpan bahan_peledak
        $stmtBahan = $conn->prepare("
            INSERT INTO bahan_peledak (nama, satuan) 
            VALUES (?, ?)
        ");
        
        foreach ($data['bahanPeledak'] as $bahan) {
            $stmtBahan->execute([
                $bahan['nama'],
                $bahan['satuan']
            ]);
        }
        
        // 5. Simpan sik_kemhan
        $stmtSIK = $conn->prepare("
            INSERT INTO sik_kemhan (nomor, tanggal_mulai, tanggal_berakhir, bahan, keterangan) 
            VALUES (?, ?, ?, ?::jsonb, ?)
        ");
        
        foreach ($data['sikKemhan'] as $sik) {
            $stmtSIK->execute([
                $sik['nomor'],
                $sik['tanggalMulai'],
                $sik['tanggalBerakhir'],
                json_encode($sik['bahan']),
                $sik['keterangan'] ?? null
            ]);
        }
        
        // 6. Simpan transactions
        $stmtTransaction = $conn->prepare("
            INSERT INTO transactions (perusahaan, perusahaan_id, bahan_ledak, biaya_logistik, berita_acara, nama_file, tanggal) 
            VALUES (?, ?, ?::jsonb, ?, ?, ?, ?)
        ");
        
        foreach ($data['transactions'] as $transaction) {
            $stmtTransaction->execute([
                $transaction['perusahaan'],
                $transaction['perusahaanId'],
                json_encode($transaction['bahanLedak']),
                $transaction['biayaLogistik'],
                $transaction['beritaAcara'] ?? null,
                $transaction['namaFile'] ?? null,
                $transaction['tanggal']
            ]);
        }
        
        $conn->commit();
        
        // Kirim response sukses
        echo json_encode([
            'status' => 'success', 
            'message' => 'Data berhasil disimpan ke database',
            'counts' => [
                'transactions' => count($data['transactions']),
                'bahanPeledak' => count($data['bahanPeledak']),
                'customers' => count($data['customers']),
                'sikKemhan' => count($data['sikKemhan'])
            ]
        ]);
        
    } catch (Exception $e) {
        if (isset($conn) && $conn->inTransaction()) {
            $conn->rollBack();
        }
        
        error_log("Error in save_data.php: " . $e->getMessage());
        
        http_response_code(500);
        echo json_encode([
            'status' => 'error', 
            'message' => 'Gagal menyimpan data: ' . $e->getMessage(),
            'debug' => [
                'input_length' => strlen($input ?? ''),
                'json_error' => json_last_error_msg()
            ]
        ]);
    }
} else {
    // Kirim response error untuk method tidak diizinkan
    http_response_code(405);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Method tidak diizinkan. Hanya POST yang diperbolehkan.'
    ]);
}
?>