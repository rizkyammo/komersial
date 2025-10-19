    // Variabel global
    let transactionToDelete = null;
    let transactionToEdit = null;
    let currentReportData = null;
    let currentDashboardFilters = {
        customer: '',
        bahan: ''
    };
    let currentSummaryMode = 'bahan';
    let currentChartType = 'bar';
    let summaryChart = null;
    let sikToEdit = null;
    let activeFilter = null;
    let selectedMasterItem = null;
    let sikChart = null;
    let selectedSIK = null;
    let map = null;

// Fungsi untuk menyimpan data ke server (PostgreSQL)
function saveDataToServer() {
    const data = {
        transactions: transactions,
        bahanPeledak: bahanPeledak,
        customers: customers,
        sikKemhan: sikKemhanList
    };
    
    return fetch('save_data.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(result => {
        if (result.status === 'success') {
            console.log('Data berhasil disimpan ke server');
            return true;
        } else {
            throw new Error(result.message);
        }
    })
    .catch(error => {
        console.error('Error saving data to server:', error);
        throw error;
    });
}

    // Fungsi untuk menyimpan transaksi ke database
    function saveTransactionToDB(transactionData, isEdit = false) {
        const formData = new FormData();
        formData.append('action', 'save_transaction');
        formData.append('transaction_data', JSON.stringify(transactionData));
        
        if (isEdit && transactionToEdit) {
            formData.append('edit_id', transactionToEdit.id);
        }
        
        return fetch('index.php', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                // Refresh data dari database
                return refreshAllData();
            }
            throw new Error('Gagal menyimpan transaksi');
        });
    }

    // Fungsi untuk menghapus transaksi dari database
    function deleteTransactionFromDB(id) {
        const formData = new FormData();
        formData.append('action', 'delete_transaction');
        formData.append('id', id);
        
        return fetch('index.php', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                return refreshAllData();
            }
            throw new Error('Gagal menghapus transaksi');
        });
    }

    // Fungsi untuk refresh semua data dari database
    function refreshAllData() {
        return fetch('index.php')
            .then(response => response.text())
            .then(html => {
                // Parse HTML untuk mendapatkan data terbaru
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const scriptTags = doc.querySelectorAll('script');
                
                // Cari script yang berisi data
                scriptTags.forEach(script => {
                    if (script.textContent.includes('let transactions = ')) {
                        // Extract data dari script
                        const transactionsMatch = script.textContent.match(/let transactions = (\[.*?\]);/s);
                        const bahanMatch = script.textContent.match(/let bahanPeledak = (\[.*?\]);/s);
                        const customersMatch = script.textContent.match(/let customers = (\[.*?\]);/s);
                        const sikMatch = script.textContent.match(/let sikKemhanList = (\[.*?\]);/s);
                        
                        if (transactionsMatch) {
                            transactions = JSON.parse(transactionsMatch[1]);
                        }
                        if (bahanMatch) {
                            bahanPeledak = JSON.parse(bahanMatch[1]);
                        }
                        if (customersMatch) {
                            customers = JSON.parse(customersMatch[1]);
                        }
                        if (sikMatch) {
                            sikKemhanList = JSON.parse(sikMatch[1]);
                        }
                    }
                });
                
                // Update tampilan
                tampilkanRiwayatTransaksi();
                updateStats();
                updateDashboard();
                tampilkanDaftarBahan();
                tampilkanDaftarCustomer();
                tampilkanDaftarSIK();
                updateSIKSummary();
                updateSIKChart();
                
                return true;
            });
    }

    // Fungsi untuk mengupdate tanggal
    function updateCurrentDate() {
        const now = new Date();
        document.getElementById('currentDate').textContent = 
            now.toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
    }
    
    // Fungsi untuk mengisi dropdown perusahaan
    function isiDropdownPerusahaan() {
        const select = document.getElementById('perusahaan');
        select.innerHTML = '<option value="">Pilih Perusahaan</option>';
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.nama;
            select.appendChild(option);
        });
    }
    
    // Fungsi untuk mengisi filter customer di dashboard
    function isiFilterCustomerDashboard() {
        const select = document.getElementById('filter-customer');
        select.innerHTML = '<option value="">Semua Site</option>';
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.nama;
            select.appendChild(option);
        });
    }
    
    // Fungsi untuk mengisi filter bahan di dashboard
    function isiFilterBahanDashboard() {
        const select = document.getElementById('filter-bahan');
        select.innerHTML = '<option value="">Semua Bahan</option>';
        
        bahanPeledak.forEach(bahan => {
            const option = document.createElement('option');
            option.value = bahan.id;
            option.textContent = bahan.nama;
            select.appendChild(option);
        });
    }
    
    // Fungsi untuk mengisi filter customer di laporan
    function isiFilterCustomer() {
        const select = document.getElementById('customer-filter');
        select.innerHTML = '<option value="">Semua Customer</option>';
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.nama;
            select.appendChild(option);
        });
    }
    
    // Fungsi untuk mengisi filter bahan di laporan
    function isiFilterBahanLaporan() {
        const select = document.getElementById('bahan-filter');
        select.innerHTML = '<option value="">Semua Bahan</option>';
        
        bahanPeledak.forEach(bahan => {
            const option = document.createElement('option');
            option.value = bahan.id;
            option.textContent = bahan.nama;
            select.appendChild(option);
        });
    }
    
    // Fungsi untuk mengisi dropdown bahan
    function isiDropdownBahan() {
        const selects = document.querySelectorAll('.jenis-bahan, .bahan-sik');
        
        selects.forEach(select => {
            // Simpan nilai yang dipilih sebelumnya
            const selectedValue = select.value;
            
            // Kosongkan dropdown
            select.innerHTML = '<option value="">Pilih Jenis Bahan</option>';
            
            // Isi dengan data bahan
            bahanPeledak.forEach(bahan => {
                const option = document.createElement('option');
                option.value = bahan.id;
                option.textContent = bahan.nama;
                option.setAttribute('data-satuan', bahan.satuan);
                select.appendChild(option);
            });
            
            // Kembalikan nilai yang dipilih sebelumnya jika ada
            if (selectedValue) {
                select.value = selectedValue;
                
                // Update satuan
                const selectedId = select.value;
                let satuanField;
                
                if (select.classList.contains('jenis-bahan')) {
                    satuanField = select.closest('.bahan-item').querySelector('.satuan');
                } else if (select.classList.contains('bahan-sik')) {
                    satuanField = select.closest('.sik-bahan-row').querySelector('.satuan-sik');
                }
                
                if (selectedId && satuanField) {
                    const bahan = bahanPeledak.find(b => b.id == selectedId);
                    satuanField.value = bahan.satuan;
                }
            }
        });
        
        // Tambahkan event listener untuk perubahan bahan
        document.querySelectorAll('.jenis-bahan, .bahan-sik').forEach(select => {
            select.addEventListener('change', function() {
                const selectedId = this.value;
                let satuanField;
                
                if (this.classList.contains('jenis-bahan')) {
                    satuanField = this.closest('.bahan-item').querySelector('.satuan');
                } else if (this.classList.contains('bahan-sik')) {
                    satuanField = this.closest('.sik-bahan-row').querySelector('.satuan-sik');
                }
                
                if (selectedId && satuanField) {
                    const bahan = bahanPeledak.find(b => b.id == selectedId);
                    satuanField.value = bahan.satuan;
                } else if (satuanField) {
                    satuanField.value = '';
                }
            });
        });
    }
    
    // Fungsi untuk menambah input bahan
    function tambahBahan() {
        const container = document.getElementById('bahan-container');
        const newRow = document.createElement('div');
        newRow.className = 'bahan-item';
        newRow.innerHTML = `
            <select class="form-control jenis-bahan" required>
                <option value="">Pilih Jenis Bahan</option>
            </select>
            <input type="text" class="form-control quantity" placeholder="Qty" 
                   pattern="[0-9]+([\.,][0-9]*)?" 
                   title="Masukkan angka (desimal dipisah koma/titik)" required>
            <input type="text" class="form-control satuan" placeholder="Satuan" readonly>
            <input type="text" class="form-control harga" placeholder="Harga" 
                   pattern="[0-9]+([\.,][0-9]*)?" 
                   title="Masukkan angka (desimal dipisah koma/titik)" required>
            <button type="button" class="btn btn-danger btn-sm btn-icon remove-bahan"><i class="fas fa-times"></i></button>
        `;
        container.appendChild(newRow);
        
        // Isi dropdown bahan untuk baris baru
        isiDropdownBahan();
        
        // Tambah event listener untuk tombol hapus
        newRow.querySelector('.remove-bahan').addEventListener('click', function() {
            container.removeChild(newRow);
        });
    }

    // Fungsi untuk mengonversi string ke float dengan dukungan koma desimal
    function parseDecimal(value) {
        // Ganti koma dengan titik untuk format Indonesia
        const cleanValue = value.replace(',', '.');
        const floatValue = parseFloat(cleanValue);
        
        // Validasi jika input tidak valid
        if (isNaN(floatValue)) {
            throw new Error('Format angka tidak valid');
        }
        
        return floatValue;
    }

    // Fungsi untuk menyimpan transaksi
    function simpanTransaksi(e) {
        e.preventDefault();
        
        const perusahaanId = document.getElementById('perusahaan').value;
        const perusahaan = customers.find(c => c.id == perusahaanId).nama;
        const tanggal = document.getElementById('tanggal').value;
        const fileInput = document.getElementById('berita-acara');
        const file = fileInput.files[0];
        const biayaLogistik = parseFloat(document.getElementById('logistics').value) || 0;
        const editId = document.getElementById('edit-id').value;
        
        // Kumpulkan data bahan peledak
        const bahanItems = document.querySelectorAll('.bahan-item');
        const bahanLedak = [];
        
        bahanItems.forEach(item => {
            const bahanId = item.querySelector('.jenis-bahan').value;
            const bahan = bahanPeledak.find(b => b.id == bahanId);
            
            try {
                const quantity = parseDecimal(item.querySelector('.quantity').value);
                const harga = parseDecimal(item.querySelector('.harga').value);
                
                bahanLedak.push({
                    jenis: bahan.nama,
                    bahanId: bahanId,
                    satuan: bahan.satuan,
                    quantity: quantity,
                    harga: harga
                });
            } catch (error) {
                alert(`Kesalahan input: ${error.message}`);
                return;
            }
        });
        
        const saveTransaction = (beritaAcara = null, namaFile = null) => {
            const transactionData = {
                perusahaan: perusahaan,
                perusahaanId: perusahaanId,
                bahanLedak: bahanLedak,
                biayaLogistik: biayaLogistik,
                beritaAcara: beritaAcara,
                namaFile: namaFile,
                tanggal: tanggal
            };
            
            // Jika edit, kembalikan dulu kuota transaksi lama
            if (editId) {
                const oldTransaction = transactions.find(t => t.id == editId);
                if (oldTransaction) {
                    tambahKuotaSIK(oldTransaction.bahanLedak);
                }
            }
            
            // Simpan ke database
            saveTransactionToDB(transactionData, !!editId)
                .then(() => {
                    // Kurangi kuota SIK Kemhan
                    kurangiKuotaSIK(bahanLedak, tanggal);
                    
                    // Reset form
                    document.getElementById('transactionForm').reset();
                    document.getElementById('bahan-container').innerHTML = '';
                    document.getElementById('edit-id').value = '';
                    document.getElementById('cancel-edit').style.display = 'none';
                    tambahBahan();
                    document.getElementById('file-name').textContent = 'Belum ada file dipilih';
                    document.getElementById('tanggal').valueAsDate = new Date();
                    
                    alert(`Transaksi ${editId ? 'diperbarui' : 'disimpan'}!`);
                })
                .catch(error => {
                    alert('Gagal menyimpan transaksi: ' + error.message);
                });
        };
        
        if (file) {
            const namaFile = file.name;
            const reader = new FileReader();
            reader.onload = function(e) {
                saveTransaction(e.target.result, namaFile);
            };
            reader.readAsDataURL(file);
        } else {
            saveTransaction();
        }
    }

    // Fungsi untuk menambah kembali kuota SIK (saat edit transaksi)
    function tambahKuotaSIK(bahanLedak) {
        // Untuk setiap bahan dalam transaksi lama
        bahanLedak.forEach(bahanTrans => {
            if (bahanTrans.sikId && bahanTrans.penggunaanKuota) {
                const sik = sikKemhanList.find(s => s.id == bahanTrans.sikId);
                if (sik) {
                    const bahanSIK = sik.bahan.find(b => b.bahanId == bahanTrans.bahanId);
                    if (bahanSIK) {
                        bahanSIK.terpakai -= bahanTrans.penggunaanKuota;
                        if (bahanSIK.terpakai < 0) {
                            bahanSIK.terpakai = 0;
                        }
                    }
                }
            }
        });
        
        // Simpan perubahan ke server
        saveDataToServer();
    }

    // Fungsi untuk mengurangi kuota SIK Kemhan
    function kurangiKuotaSIK(bahanLedak, tanggalTransaksi) {
        const transDate = new Date(tanggalTransaksi);
        
        // Cari SIK Kemhan yang masih berlaku
        const activeSIK = sikKemhanList.filter(sik => {
            const startDate = new Date(sik.tanggalMulai);
            const endDate = new Date(sik.tanggalBerakhir);
            return transDate >= startDate && transDate <= endDate;
        });
        
        if (activeSIK.length === 0) {
            alert('Peringatan: Tidak ada SIK Kemhan yang berlaku untuk tanggal transaksi ini!');
            return;
        }
        
        // Untuk setiap bahan dalam transaksi
        bahanLedak.forEach(bahanTrans => {
            let qtyToReduce = bahanTrans.quantity;
            
            // Coba kurangi kuota dari SIK yang aktif
            for (const sik of activeSIK) {
                if (qtyToReduce <= 0) break;
                
                const bahanSIK = sik.bahan.find(b => b.bahanId == bahanTrans.bahanId);
                if (bahanSIK) {
                    const sisaKuota = bahanSIK.kuota - bahanSIK.terpakai;
                    if (sisaKuota > 0) {
                        const pengurangan = Math.min(qtyToReduce, sisaKuota);
                        bahanSIK.terpakai += pengurangan;
                        qtyToReduce -= pengurangan;
                        
                        // Catat penggunaan kuota
                        bahanTrans.sikId = sik.id;
                        bahanTrans.penggunaanKuota = pengurangan;
                        
                        // Simpan perubahan ke server
                        saveDataToServer();
                    }
                }
            }
            
            if (qtyToReduce > 0) {
                alert(`Peringatan: Kuota SIK Kemhan tidak mencukupi untuk bahan ${bahanTrans.jenis}! Sisa ${qtyToReduce} tidak bisa diproses.`);
            }
        });
    }
    
    // Fungsi untuk menampilkan riwayat transaksi
    function tampilkanRiwayatTransaksi() {
        const tbody = document.getElementById('transaction-history');
        tbody.innerHTML = '';
        
        // Urutkan transaksi dari yang terbaru
        const sortedTransactions = [...transactions].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        
        if (sortedTransactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Tidak ada data transaksi</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        sortedTransactions.forEach(trans => {
            // Format tanggal
            const tanggal = new Date(trans.tanggal);
            const formattedDate = tanggal.toLocaleDateString('id-ID');
            
            // Tampilkan semua bahan dalam satu transaksi
            trans.bahanLedak.forEach((bahan, index) => {
                const row = document.createElement('tr');
                
                // Hanya tampilkan tanggal, perusahaan, dan logistik di baris pertama
                if (index === 0) {
                    row.innerHTML = `
                        <td rowspan="${trans.bahanLedak.length}">${formattedDate}</td>
                        <td rowspan="${trans.bahanLedak.length}">${trans.perusahaan}</td>
                        <td>${bahan.jenis} <span class="satuan-badge">${bahan.satuan}</span></td>
                        <td>${bahan.quantity}</td>
                        <td>Rp${bahan.harga.toLocaleString('id-ID')}</td>
                        <td rowspan="${trans.bahanLedak.length}">Rp${trans.biayaLogistik.toLocaleString('id-ID')}</td>
                        <td rowspan="${trans.bahanLedak.length}" class="action-group">
                            <button class="action-btn btn-edit" data-id="${trans.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn btn-delete" data-id="${trans.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                            ${trans.beritaAcara ? 
                                `<button class="action-btn btn-download" data-id="${trans.id}">
                                    <i class="fas fa-file-download"></i>
                                </button>` : 
                                ''}
                        </td>
                    `;
                } else {
                    row.innerHTML = `
                        <td>${bahan.jenis} <span class="satuan-badge">${bahan.satuan}</span></td>
                        <td>${bahan.quantity}</td>
                        <td>Rp${bahan.harga.toLocaleString('id-ID')}</td>
                    `;
                }
                
                tbody.appendChild(row);
            });
        });
        
        // Tambah event listener untuk tombol aksi
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                editTransaction(id);
            });
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                showDeleteModal(id);
            });
        });
        
        document.querySelectorAll('.btn-download').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                downloadBeritaAcara(id);
            });
        });
    }
    
    // Fungsi untuk mengedit transaksi
    function editTransaction(id) {
        const transaksi = transactions.find(t => t.id === id);
        if (!transaksi) return;
        
        transactionToEdit = transaksi;
        
        // Isi form dengan data transaksi
        document.getElementById('perusahaan').value = transaksi.perusahaanId;
        document.getElementById('logistics').value = transaksi.biayaLogistik;
        document.getElementById('tanggal').value = transaksi.tanggal;
        document.getElementById('edit-id').value = transaksi.id;
        document.getElementById('cancel-edit').style.display = 'inline-block';
        
        // Kosongkan container bahan
        const container = document.getElementById('bahan-container');
        container.innerHTML = '';
        
        // Tambahkan baris bahan sesuai transaksi
        transaksi.bahanLedak.forEach(bahan => {
            const newRow = document.createElement('div');
            newRow.className = 'bahan-item';
            newRow.innerHTML = `
                <select class="form-control jenis-bahan" required>
                    <option value="">Pilih Jenis Bahan</option>
                </select>
                <input type="text" class="form-control quantity" placeholder="Qty" min="1" required>
                <input type="text" class="form-control satuan" placeholder="Satuan" readonly>
                <input type="text" class="form-control harga" placeholder="Harga" min="0" required>
                <button type="button" class="btn btn-danger btn-sm btn-icon remove-bahan"><i class="fas fa-times"></i></button>
            `;
            container.appendChild(newRow);
            
            // Format quantity dengan koma untuk desimal
            newRow.querySelector('.quantity').value = bahan.quantity.toString().replace('.', ',');

            // Format harga dengan koma untuk desimal
            newRow.querySelector('.harga').value = bahan.harga.toString().replace('.', ',');

            // Isi dropdown bahan
            isiDropdownBahan();
            
            // Set nilai
            newRow.querySelector('.jenis-bahan').value = bahan.bahanId;
            newRow.querySelector('.quantity').value = bahan.quantity;
            newRow.querySelector('.harga').value = bahan.harga;
            
            // Set satuan
            const bahanData = bahanPeledak.find(b => b.id == bahan.bahanId);
            if (bahanData) {
                newRow.querySelector('.satuan').value = bahanData.satuan;
            }
            
            // Tambah event listener untuk tombol hapus
            newRow.querySelector('.remove-bahan').addEventListener('click', function() {
                container.removeChild(newRow);
            });
        });
        
        // Set nama file jika ada
        if (transaksi.namaFile) {
            document.getElementById('file-name').textContent = transaksi.namaFile;
        }
        
        // Scroll ke form
        document.getElementById('transactionForm').scrollIntoView({ behavior: 'smooth' });
    }
    
    // Fungsi untuk membatalkan edit
    function cancelEdit() {
        document.getElementById('transactionForm').reset();
        document.getElementById('bahan-container').innerHTML = '';
        document.getElementById('edit-id').value = '';
        document.getElementById('cancel-edit').style.display = 'none';
        document.getElementById('file-name').textContent = 'Belum ada file dipilih';
        document.getElementById('tanggal').valueAsDate = new Date();
        tambahBahan();
    }
    
    // Fungsi untuk menampilkan modal hapus
    function showDeleteModal(id) {
        transactionToDelete = id;
        document.getElementById('deleteModal').style.display = 'flex';
    }
    
    // Fungsi untuk menutup modal
    function closeModal() {
        document.getElementById('deleteModal').style.display = 'none';
        transactionToDelete = null;
    }
    
    // Fungsi untuk menghapus transaksi
    function deleteTransaction() {
        if (transactionToDelete) {
            // Kembalikan kuota dari transaksi yang dihapus
            const transToDelete = transactions.find(t => t.id === transactionToDelete);
            if (transToDelete) {
                tambahKuotaSIK(transToDelete.bahanLedak);
            }
            
            // Hapus dari database
            deleteTransactionFromDB(transactionToDelete)
                .then(() => {
                    closeModal();
                    alert('Transaksi berhasil dihapus!');
                })
                .catch(error => {
                    alert('Gagal menghapus transaksi: ' + error.message);
                });
        }
    }
    
    // Fungsi untuk download berita acara
    function downloadBeritaAcara(id) {
        const transaksi = transactions.find(t => t.id === id);
        
        if (transaksi && transaksi.beritaAcara) {
            const a = document.createElement('a');
            a.href = transaksi.beritaAcara;
            a.download = transaksi.namaFile || 'berita_acara';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            alert('Berita acara tidak tersedia untuk transaksi ini');
        }
    }
    
    // Fungsi untuk download backup data
    function downloadBackup() {
        const data = {
            transactions: transactions,
            bahanPeledak: bahanPeledak,
            customers: customers,
            sikKemhan: sikKemhanList
        };
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "backup_data_erp.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
        
        alert('Backup data berhasil didownload!');
    }
    
// Fungsi untuk restore data
function restoreData() {
    const fileInput = document.getElementById('restore-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Pilih file backup terlebih dahulu');
        return;
    }
    
    // Tampilkan loading indicator
    const originalText = document.getElementById('restoreData').innerHTML;
    document.getElementById('restoreData').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    document.getElementById('restoreData').disabled = true;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            console.log('Data dari file:', data);
            
            // Validasi struktur data
            if (!data.transactions || !data.bahanPeledak || !data.customers || !data.sikKemhan) {
                throw new Error('Format file backup tidak valid. Pastikan file backup berasal dari sistem ini.');
            }
            
            // Tampilkan konfirmasi
            if (!confirm(
                `Apakah Anda yakin ingin memulihkan data?\n\n` +
                `Data yang akan dipulihkan:\n` +
                `- ${data.transactions.length} transaksi\n` +
                `- ${data.bahanPeledak.length} bahan peledak\n` +
                `- ${data.customers.length} customer\n` +
                `- ${data.sikKemhan.length} SIK Kemhan\n\n` +
                `Data yang ada saat ini akan diganti dengan data backup.`
            )) {
                resetRestoreButton(originalText);
                return;
            }
            
            // Simpan ke server terlebih dahulu
            saveDataToServerWithData(data)
                .then(result => {
                    console.log('Data berhasil disimpan ke server:', result);
                    
                    // Update variabel global setelah berhasil disimpan ke database
                    transactions = data.transactions;
                    bahanPeledak = data.bahanPeledak;
                    customers = data.customers;
                    sikKemhanList = data.sikKemhan;
                    
                    // Perbarui semua tampilan
                    updateAllDisplays();
                    
                    // Reset form
                    fileInput.value = '';
                    document.getElementById('restore-file-name').textContent = 'Belum ada file dipilih';
                    
                    resetRestoreButton(originalText);
                    
                    alert(`Data berhasil dipulihkan!\n\n` +
                          `- ${result.counts.transactions} transaksi\n` +
                          `- ${result.counts.bahanPeledak} bahan peledak\n` +
                          `- ${result.counts.customers} customer\n` +
                          `- ${result.counts.sikKemhan} SIK Kemhan`);
                })
                .catch(error => {
                    console.error('Error dalam restore:', error);
                    resetRestoreButton(originalText);
                    alert('Gagal memulihkan data ke database: ' + error.message);
                });
                
        } catch (error) {
            console.error('Error parsing file:', error);
            resetRestoreButton(originalText);
            alert('Gagal memproses file: ' + error.message + '\nPastikan file adalah backup valid dari sistem ini.');
        }
    };
    
    reader.onerror = function() {
        resetRestoreButton(originalText);
        alert('Gagal membaca file');
    };
    
    reader.readAsText(file);
}

// Fungsi untuk reset tombol restore
function resetRestoreButton(originalText) {
    document.getElementById('restoreData').innerHTML = originalText;
    document.getElementById('restoreData').disabled = false;
}

// Fungsi untuk update semua tampilan
function updateAllDisplays() {
    isiDropdownPerusahaan();
    isiDropdownBahan();
    isiFilterCustomerDashboard();
    isiFilterBahanDashboard();
    isiFilterCustomer();
    isiFilterBahanLaporan();
    tampilkanRiwayatTransaksi();
    tampilkanDaftarBahan();
    tampilkanDaftarCustomer();
    tampilkanDaftarSIK();
    updateSIKSummary();
    updateSIKChart();
    updateStats();
    updateDashboard();
    tampilkanMasterBahan();
    tampilkanMasterSite();
}

// Fungsi khusus untuk menyimpan data restore ke server
function saveDataToServerWithData(data) {
    console.log('Mengirim data ke server...', data);
    
    return fetch('save_data.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            // Coba baca response text untuk debug
            return response.text().then(text => {
                console.error('Server response not OK:', text);
                throw new Error(`Server returned ${response.status}: ${response.statusText}. Details: ${text}`);
            });
        }
        return response.json();
    })
    .then(result => {
        console.log('Server response:', result);
        
        if (result.status === 'success') {
            console.log('Data restore berhasil disimpan ke server');
            return result;
        } else {
            throw new Error(result.message || 'Unknown server error');
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        throw error;
    });
}

// Fungsi untuk refresh semua data dari database setelah restore
function refreshDataAfterRestore() {
    return fetch('index.php')
        .then(response => response.text())
        .then(html => {
            // Parse HTML untuk mendapatkan data terbaru
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const scriptTags = doc.querySelectorAll('script');
            
            // Cari script yang berisi data
            let dataFound = false;
            scriptTags.forEach(script => {
                if (script.textContent.includes('let transactions = ')) {
                    // Extract data dari script menggunakan regex yang lebih robust
                    const transactionsMatch = script.textContent.match(/let transactions\s*=\s*(\[.*?\]);/s);
                    const bahanMatch = script.textContent.match(/let bahanPeledak\s*=\s*(\[.*?\]);/s);
                    const customersMatch = script.textContent.match(/let customers\s*=\s*(\[.*?\]);/s);
                    const sikMatch = script.textContent.match(/let sikKemhanList\s*=\s*(\[.*?\]);/s);
                    
                    if (transactionsMatch) {
                        try {
                            transactions = JSON.parse(transactionsMatch[1]);
                            dataFound = true;
                        } catch (e) {
                            console.error('Error parsing transactions:', e);
                        }
                    }
                    if (bahanMatch) {
                        try {
                            bahanPeledak = JSON.parse(bahanMatch[1]);
                            dataFound = true;
                        } catch (e) {
                            console.error('Error parsing bahanPeledak:', e);
                        }
                    }
                    if (customersMatch) {
                        try {
                            customers = JSON.parse(customersMatch[1]);
                            dataFound = true;
                        } catch (e) {
                            console.error('Error parsing customers:', e);
                        }
                    }
                    if (sikMatch) {
                        try {
                            sikKemhanList = JSON.parse(sikMatch[1]);
                            dataFound = true;
                        } catch (e) {
                            console.error('Error parsing sikKemhanList:', e);
                        }
                    }
                }
            });
            
            if (!dataFound) {
                throw new Error('Tidak dapat mengambil data terbaru dari server');
            }
            
            // Update semua tampilan
            isiDropdownPerusahaan();
            isiDropdownBahan();
            isiFilterCustomerDashboard();
            isiFilterBahanDashboard();
            tampilkanRiwayatTransaksi();
            tampilkanDaftarBahan();
            tampilkanDaftarCustomer();
            tampilkanDaftarSIK();
            updateSIKSummary();
            updateSIKChart();
            updateStats();
            updateDashboard();
            
            return true;
        })
        .catch(error => {
            console.error('Error refreshing data:', error);
            throw error;
        });
}
    
// Fungsi untuk update statistik
function updateStats() {
    document.getElementById('totalTransactions').textContent = transactions.length;
    
    let totalSales = 0;
    
    transactions.forEach(trans => {
        trans.bahanLedak.forEach(bahan => {
            totalSales += bahan.quantity * bahan.harga;
        });
    });
    
    document.getElementById('totalSales').textContent = 'Rp' + totalSales.toLocaleString('id-ID');
}

    // Fungsi untuk update statistik per bahan peledak
function updateStatsBahan(filteredTransactions) {
    const container = document.getElementById('statsBahan');
    container.innerHTML = '';

    // Hitung total kuantitas per bahan
    const totalPerBahan = {};
    
    filteredTransactions.forEach(trans => {
        trans.bahanLedak.forEach(bahanTrans => {
            const bahanId = bahanTrans.bahanId;
            if (!totalPerBahan[bahanId]) {
                totalPerBahan[bahanId] = {
                    total: 0,
                    bahan: bahanPeledak.find(b => b.id == bahanId)
                };
            }
            totalPerBahan[bahanId].total += bahanTrans.quantity;
        });
    });

    // Jika tidak ada data, tampilkan pesan
    if (Object.keys(totalPerBahan).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>Tidak ada data transaksi</p>
            </div>
        `;
        return;
    }

    // Tampilkan statistik untuk setiap bahan
    Object.values(totalPerBahan).forEach(item => {
        if (item.bahan) {
            const card = document.createElement('div');
            card.className = 'stat-card-bahan';
            card.innerHTML = `
                <div class="stat-label-bahan">${item.bahan.nama}</div>
                <div class="stat-value-bahan">${item.total.toLocaleString('id-ID')}</div>
                <div class="stat-satuan">${item.bahan.satuan}</div>
            `;
            container.appendChild(card);
        }
    });
}
    
// Fungsi untuk update dashboard
function updateDashboard() {
    // Update filter values
    currentDashboardFilters.customer = document.getElementById('filter-customer').value;
    currentDashboardFilters.bahan = document.getElementById('filter-bahan').value;
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;
    
    // Filter transactions
    let filteredTransactions = [...transactions];
    
    // Filter tanggal
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Akhir hari
        
        filteredTransactions = filteredTransactions.filter(trans => {
            const transDate = new Date(trans.tanggal);
            return transDate >= start && transDate <= end;
        });
    }
    
    // Filter customer
    if (currentDashboardFilters.customer) {
        filteredTransactions = filteredTransactions.filter(
            trans => trans.perusahaanId == currentDashboardFilters.customer
        );
    }
    
    // Filter bahan
    if (currentDashboardFilters.bahan) {
        const bahanDicari = bahanPeledak.find(b => b.id == currentDashboardFilters.bahan)?.nama;
        filteredTransactions = filteredTransactions.filter(trans => 
            trans.bahanLedak.some(b => b.jenis === bahanDicari)
        );
    }
    
    // Update statistik bahan
    updateStatsBahan(filteredTransactions);
    
    // Update summary tables
    updateSummaryTables(filteredTransactions);
    
    // Update recent transactions
    updateRecentTransactions(filteredTransactions);
}
    
    // Fungsi untuk update tabel ringkasan
    function updateSummaryTables(filteredTransactions) {
        // Fliter by per bahan peledak
        updateSummaryBahan(filteredTransactions);
        
        // Fliter by per site
        updateSummarySite(filteredTransactions);
        
        // Realisasi kuota
        if (currentSummaryMode === 'kuota') {
            updateSummaryKuota();
        }
        
        // Update chart berdasarkan mode ringkasan
        updateChartBasedOnSummaryMode(filteredTransactions);
    }
    
    // Fungsi untuk update chart berdasarkan mode ringkasan
    function updateChartBasedOnSummaryMode(filteredTransactions) {
        // Berdasarkan mode ringkasan yang dipilih, siapkan data untuk chart
        let chartLabels = [];
        let chartDatasets = [];
        let chartTitle = '';
        
        switch (currentSummaryMode) {
            case 'bahan':
                // Untuk semua jenis chart, tampilkan per bahan
                const bahanSummary = {};
                
                filteredTransactions.forEach(trans => {
                    trans.bahanLedak.forEach(bahan => {
                        const bahanName = bahan.jenis;
                        if (!bahanSummary[bahanName]) {
                            bahanSummary[bahanName] = 0;
                        }
                        bahanSummary[bahanName] += bahan.quantity * bahan.harga;
                    });
                });
                
                chartLabels = Object.keys(bahanSummary);
                
                if (currentChartType === 'pie') {
                    // Pie chart: Distribusi per bahan
                    chartDatasets = [{
                        label: 'Total Penjualan',
                        data: Object.values(bahanSummary),
                        backgroundColor: generateChartColors(chartLabels.length),
                    }];
                    chartTitle = 'Distribusi Penjualan per Bahan';
                } else {
                    // Bar/Line chart: Perkembangan per bulan
                    const bulanLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
                    chartLabels = bulanLabels;
                    
                    // Siapkan data untuk setiap bahan
                    chartLabels.forEach((_, bulanIndex) => {
                        const bulan = bulanIndex + 1;
                        
                        // Filter transaksi di bulan tertentu
                        const transInMonth = filteredTransactions.filter(trans => {
                            const transMonth = new Date(trans.tanggal).getMonth() + 1;
                            return transMonth === bulan;
                        });
                        
                        // Hitung total penjualan per bahan di bulan ini
                        const bulanData = {};
                        transInMonth.forEach(trans => {
                            trans.bahanLedak.forEach(b => {
                                if (!bulanData[b.jenis]) bulanData[b.jenis] = 0;
                                bulanData[b.jenis] += b.quantity * b.harga;
                            });
                        });
                        
                        // Tambahkan ke dataset
                        Object.keys(bahanSummary).forEach(bahanName => {
                            if (!chartDatasets.some(ds => ds.label === bahanName)) {
                                chartDatasets.push({
                                    label: bahanName,
                                    data: new Array(12).fill(0),
                                    backgroundColor: generateRandomColor(),
                                });
                            }
                            
                            const dataset = chartDatasets.find(ds => ds.label === bahanName);
                            dataset.data[bulanIndex] = bulanData[bahanName] || 0;
                        });
                    });
                    
                    chartTitle = 'Penjualan per Bulan per Jenis Bahan';
                }
                break;
                
            case 'site':
                // Untuk semua jenis chart, tampilkan per site
                const siteSummary = {};
                
                filteredTransactions.forEach(trans => {
                    const siteName = trans.perusahaan;
                    if (!siteSummary[siteName]) siteSummary[siteName] = 0;
                    
                    trans.bahanLedak.forEach(bahan => {
                        siteSummary[siteName] += bahan.quantity * bahan.harga;
                    });
                });
                
                chartLabels = Object.keys(siteSummary);
                
                if (currentChartType === 'pie') {
                    // Pie chart: Distribusi per site
                    chartDatasets = [{
                        label: 'Total Penjualan',
                        data: Object.values(siteSummary),
                        backgroundColor: generateChartColors(chartLabels.length),
                    }];
                    chartTitle = 'Distribusi Penjualan per Site';
                } else {
                    // Bar/Line chart: Perkembangan per bulan
                    const bulanLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
                    chartLabels = bulanLabels;
                    
                    // Siapkan data untuk setiap site
                    chartLabels.forEach((_, bulanIndex) => {
                        const bulan = bulanIndex + 1;
                        
                        // Filter transaksi di bulan tertentu
                        const transInMonth = filteredTransactions.filter(trans => {
                            const transMonth = new Date(trans.tanggal).getMonth() + 1;
                            return transMonth === bulan;
                        });
                        
                        // Hitung total penjualan per site di bulan ini
                        const bulanData = {};
                        transInMonth.forEach(trans => {
                            if (!bulanData[trans.perusahaan]) bulanData[trans.perusahaan] = 0;
                            
                            trans.bahanLedak.forEach(b => {
                                bulanData[trans.perusahaan] += b.quantity * b.harga;
                            });
                        });
                        
                        // Tambahkan ke dataset
                        Object.keys(siteSummary).forEach(siteName => {
                            if (!chartDatasets.some(ds => ds.label === siteName)) {
                                chartDatasets.push({
                                    label: siteName,
                                    data: new Array(12).fill(0),
                                    backgroundColor: generateRandomColor(),
                                });
                            }
                            
                            const dataset = chartDatasets.find(ds => ds.label === siteName);
                            dataset.data[bulanIndex] = bulanData[siteName] || 0;
                        });
                    });
                    
                    chartTitle = 'Penjualan per Bulan per Site';
                }
                break;
                
            case 'kuota':
                // Buat ringkasan realisasi kuota (dalam kuantitas)
                chartLabels = [];
                const kuotaData = [];
                const realisasiData = [];
                
                // Hitung total kuota dan realisasi per bahan (dalam kuantitas) dari semua SIK
                const summaryKuota = {};
                sikKemhanList.forEach(sik => {
                    sik.bahan.forEach(bahan => {
                        const bahanData = bahanPeledak.find(b => b.id == bahan.bahanId);
                        if (bahanData) {
                            if (!summaryKuota[bahanData.nama]) {
                                summaryKuota[bahanData.nama] = {
                                    kuota: 0,
                                    realisasi: 0
                                };
                            }
                            summaryKuota[bahanData.nama].kuota += bahan.kuota;
                            summaryKuota[bahanData.nama].realisasi += bahan.terpakai;
                        }
                    });
                });
                
                // Siapkan data untuk chart (kuota dan realisasi)
                Object.keys(summaryKuota).forEach(bahanName => {
                    const data = summaryKuota[bahanName];
                    chartLabels.push(bahanName);
                    kuotaData.push(data.kuota);
                    realisasiData.push(data.realisasi);
                });
                
                chartDatasets = [
                    {
                        label: 'Kuota',
                        data: kuotaData,
                        backgroundColor: 'rgba(52, 152, 219, 0.8)'
                    },
                    {
                        label: 'Realisasi',
                        data: realisasiData,
                        backgroundColor: 'rgba(46, 204, 113, 0.8)'
                    }
                ];
                
                chartTitle = 'Kuota dan Realisasi per Bahan Peledak';
                break;
        }
        
        // Update chart jika ada data
        if (chartLabels.length > 0 && chartDatasets.length > 0) {
            updateChart(chartLabels, chartDatasets, chartTitle);
        } else {
            // Hapus chart jika tidak ada data
            if (summaryChart) {
                summaryChart.destroy();
                summaryChart = null;
            }
        }
    }
    
    // Fungsi untuk update ringkasan bahan
    function updateSummaryBahan(filteredTransactions) {
        const tbody = document.getElementById('summary-bahan-results');
        tbody.innerHTML = '';
        
        const summaryBahan = {};
        
        filteredTransactions.forEach(trans => {
            trans.bahanLedak.forEach(bahan => {
                const key = bahan.jenis;
                
                if (!summaryBahan[key]) {
                    summaryBahan[key] = {
                        nama: bahan.jenis,
                        totalTransaksi: 0,
                        totalKuantitas: 0,
                        totalNilai: 0
                    };
                }
                
                summaryBahan[key].totalTransaksi += 1;
                summaryBahan[key].totalKuantitas += bahan.quantity;
                summaryBahan[key].totalNilai += (bahan.quantity * bahan.harga);
            });
        });
        
        if (Object.keys(summaryBahan).length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>Tidak ada data bahan peledak</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Urutkan berdasarkan total nilai
        const sortedBahan = Object.values(summaryBahan).sort((a, b) => b.totalNilai - a.totalNilai);
        
        // Tampilkan hasil
        sortedBahan.forEach(bahan => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${bahan.nama}</td>
                <td>${bahan.totalTransaksi}</td>
                <td>${bahan.totalKuantitas.toLocaleString('id-ID')}</td>
                <td>Rp${bahan.totalNilai.toLocaleString('id-ID')}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // Fungsi untuk update ringkasan site
    function updateSummarySite(filteredTransactions) {
        const tbody = document.getElementById('summary-site-results');
        tbody.innerHTML = '';
        
        const summarySite = {};
        
        filteredTransactions.forEach(trans => {
            const key = trans.perusahaan;
            
            if (!summarySite[key]) {
                summarySite[key] = {
                    nama: trans.perusahaan,
                    totalTransaksi: 0,
                    totalKuantitas: 0,
                    totalNilai: 0
                };
            }
            
            summarySite[key].totalTransaksi += 1;
            
            trans.bahanLedak.forEach(bahan => {
                summarySite[key].totalKuantitas += bahan.quantity;
                summarySite[key].totalNilai += (bahan.quantity * bahan.harga);
            });
        });
        
        if (Object.keys(summarySite).length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <i class="fas fa-building"></i>
                        <p>Tidak ada data site</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Urutkan berdasarkan total nilai
        const sortedSite = Object.values(summarySite).sort((a, b) => b.totalNilai - a.totalNilai);
        
        // Tampilkan hasil
        sortedSite.forEach(site => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${site.nama}</td>
                <td>${site.totalTransaksi}</td>
                <td>${site.totalKuantitas.toLocaleString('id-ID')}</td>
                <td>Rp${site.totalNilai.toLocaleString('id-ID')}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // Fungsi untuk update ringkasan kuota
    function updateSummaryKuota() {
        const tbody = document.getElementById('summary-kuota-results');
        tbody.innerHTML = '';
        
        // Hitung total kuota dan realisasi per bahan (dalam kuantitas)
        const summaryKuota = {};
        
        sikKemhanList.forEach(sik => {
            sik.bahan.forEach(bahan => {
                const bahanData = bahanPeledak.find(b => b.id == bahan.bahanId);
                if (bahanData) {
                    if (!summaryKuota[bahanData.nama]) {
                        summaryKuota[bahanData.nama] = {
                            kuota: 0,
                            realisasi: 0
                        };
                    }
                    summaryKuota[bahanData.nama].kuota += bahan.kuota;
                    summaryKuota[bahanData.nama].realisasi += bahan.terpakai;
                }
            });
        });
        
        if (Object.keys(summaryKuota).length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-file-contract"></i>
                        <p>Tidak ada data kuota SIK Kemhan</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Tampilkan hasil
        Object.entries(summaryKuota).forEach(([bahanName, data]) => {
            const persentase = data.kuota > 0 ? 
                Math.round((data.realisasi / data.kuota) * 100) : 0;
            
            // Tentukan kelas CSS berdasarkan persentase
            let statusClass = '';
            let statusText = '';
            
            if (persentase >= 90) {
                statusClass = 'badge-warning';
                statusText = 'Hampir Habis';
            } else if (persentase >= 75) {
                statusClass = 'badge-info';
                statusText = 'Tersedia';
            } else {
                statusClass = 'badge-success';
                statusText = 'Aman';
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${bahanName}</td>
                <td>${data.kuota.toLocaleString('id-ID')}</td>
                <td>${data.realisasi.toLocaleString('id-ID')}</td>
                <td>${persentase}%</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // Fungsi untuk update transaksi terbaru di dashboard
    function updateRecentTransactions(filteredTransactions) {
        const tbody = document.getElementById('dashboard-transactions');
        tbody.innerHTML = '';
        
        // Ambil 5 transaksi terbaru
        const recentTransactions = [...filteredTransactions]
            .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
            .slice(0, 5);
        
        if (recentTransactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Tidak ada data transaksi</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        recentTransactions.forEach(trans => {
            // Format tanggal
            const tanggal = new Date(trans.tanggal);
            const formattedDate = tanggal.toLocaleDateString('id-ID');
            
            // Tampilkan semua bahan dalam satu transaksi
            trans.bahanLedak.forEach((bahan, index) => {
                const row = document.createElement('tr');
                
                // Hanya tampilkan tanggal, perusahaan, dan logistik di baris pertama
                if (index === 0) {
                    row.innerHTML = `
                        <td rowspan="${trans.bahanLedak.length}">${formattedDate}</td>
                        <td rowspan="${trans.bahanLedak.length}">${trans.perusahaan}</td>
                        <td>${bahan.jenis} <span class="satuan-badge">${bahan.satuan}</span></td>
                        <td>${bahan.quantity}</td>
                        <td>Rp${bahan.harga.toLocaleString('id-ID')}</td>
                        <td rowspan="${trans.bahanLedak.length}">Rp${trans.biayaLogistik.toLocaleString('id-ID')}</td>
                        <td rowspan="${trans.bahanLedak.length}" class="action-group">
                            <button class="action-btn btn-edit" data-id="${trans.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn btn-delete" data-id="${trans.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                } else {
                    row.innerHTML = `
                        <td>${bahan.jenis} <span class="satuan-badge">${bahan.satuan}</span></td>
                        <td>${bahan.quantity}</td>
                        <td>Rp${bahan.harga.toLocaleString('id-ID')}</td>
                    `;
                }
                
                tbody.appendChild(row);
            });
        });
        
        // Tambah event listener untuk tombol aksi
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                editTransaction(id);
            });
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                showDeleteModal(id);
            });
        });
    }
    
    // Fungsi untuk menambah bahan baru ke database
    function tambahBahanBaru() {
        const namaBahan = document.getElementById('nama-bahan').value.trim();
        const satuanBahan = document.getElementById('satuan-bahan').value.trim();
        
        if (!namaBahan || !satuanBahan) {
            alert('Nama bahan dan satuan tidak boleh kosong');
            return;
        }
        
        if (bahanPeledak.some(b => b.nama.toLowerCase() === namaBahan.toLowerCase())) {
            alert('Bahan sudah terdaftar');
            return;
        }
        
        const formData = new FormData();
        formData.append('action', 'save_bahan');
        formData.append('nama_bahan', namaBahan);
        formData.append('satuan_bahan', satuanBahan);
        
        fetch('index.php', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                return refreshAllData();
            }
            throw new Error('Gagal menyimpan bahan');
        })
        .then(() => {
            document.getElementById('nama-bahan').value = '';
            document.getElementById('satuan-bahan').value = '';
            alert('Bahan baru berhasil ditambahkan!');
        })
        .catch(error => {
            alert('Gagal menambah bahan: ' + error.message);
        });
    }
    
    // Fungsi untuk menampilkan daftar bahan
    function tampilkanDaftarBahan() {
        const tbody = document.getElementById('daftar-bahan');
        tbody.innerHTML = '';
        
        if (bahanPeledak.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>Belum ada data bahan peledak</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        bahanPeledak.forEach(bahan => {
            const row = document.createElement('tr');
            row.className = 'clickable-row';
            row.innerHTML = `
                <td>${bahan.id}</td>
                <td>${bahan.nama}</td>
                <td><span class="badge badge-info">${bahan.satuan}</span></td>
                <td>
                    <button class="action-btn hapus-bahan" data-id="${bahan.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
            
            // Tambahkan event listener untuk klik baris
            row.addEventListener('click', function(e) {
                // Cegah event jika yang diklik adalah tombol hapus
                if (!e.target.closest('.hapus-bahan')) {
                    goToReportWithBahan(bahan.id, bahan.nama);
                }
            });
        });
        
        // Tambah event listener untuk tombol hapus
        document.querySelectorAll('.hapus-bahan').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                hapusBahan(id);
            });
        });
    }
    
    // Fungsi untuk menghapus bahan dari database
    function hapusBahan(id) {
        if (confirm('Apakah Anda yakin ingin menghapus bahan ini?')) {
            const formData = new FormData();
            formData.append('action', 'delete_bahan');
            formData.append('id', id);
            
            fetch('index.php', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (response.ok) {
                    return refreshAllData();
                }
                throw new Error('Gagal menghapus bahan');
            })
            .then(() => {
                alert('Bahan berhasil dihapus!');
            })
            .catch(error => {
                alert('Gagal menghapus bahan: ' + error.message);
            });
        }
    }
    
    // Fungsi untuk menyimpan customer ke database
    function simpanCustomer(e) {
        e.preventDefault();
        
        const nama = document.getElementById('nama-customer').value.trim();
        const alamat = document.getElementById('alamat-customer').value.trim();
        const lat = parseFloat(document.getElementById('latitude').value);
        const lng = parseFloat(document.getElementById('longitude').value);
        
        if (!nama || !alamat || isNaN(lat) || isNaN(lng)) {
            alert('Harap isi semua data dengan benar');
            return;
        }
        
        if (customers.some(c => c.nama.toLowerCase() === nama.toLowerCase())) {
            alert('Customer sudah terdaftar');
            return;
        }
        
        const formData = new FormData();
        formData.append('action', 'save_customer');
        formData.append('nama_customer', nama);
        formData.append('alamat_customer', alamat);
        formData.append('latitude', lat);
        formData.append('longitude', lng);
        
        fetch('index.php', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                return refreshAllData();
            }
            throw new Error('Gagal menyimpan customer');
        })
        .then(() => {
            document.getElementById('customerForm').reset();
            alert('Customer baru berhasil ditambahkan!');
        })
        .catch(error => {
            alert('Gagal menambah customer: ' + error.message);
        });
    }
    
    // Fungsi untuk menampilkan daftar customer
    function tampilkanDaftarCustomer() {
        const tbody = document.getElementById('daftar-customer');
        tbody.innerHTML = '';
        
        if (customers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-building"></i>
                        <p>Belum ada data customer</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        customers.forEach(customer => {
            const row = document.createElement('tr');
            row.className = 'clickable-row';
            row.innerHTML = `
                <td>${customer.id}</td>
                <td>${customer.nama}</td>
                <td>${customer.alamat}</td>
                <td>${customer.koordinat.lat}, ${customer.koordinat.lng}</td>
                <td>
                    <button class="action-btn hapus-customer" data-id="${customer.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
            
            // Tambahkan event listener untuk klik baris
            row.addEventListener('click', function(e) {
                // Cegah event jika yang diklik adalah tombol hapus
                if (!e.target.closest('.hapus-customer')) {
                    goToReportWithCustomer(customer.id, customer.nama);
                }
            });
        });
        
        // Tambah event listener untuk tombol hapus
        document.querySelectorAll('.hapus-customer').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                hapusCustomer(id);
            });
        });
    }
    
    // Fungsi untuk menghapus customer dari database
    function hapusCustomer(id) {
        if (confirm('Apakah Anda yakin ingin menghapus customer ini?')) {
            const formData = new FormData();
            formData.append('action', 'delete_customer');
            formData.append('id', id);
            
            fetch('index.php', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (response.ok) {
                    return refreshAllData();
                }
                throw new Error('Gagal menghapus customer');
            })
            .then(() => {
                alert('Customer berhasil dihapus!');
                })
            .catch(error => {
                alert('Gagal menghapus customer: ' + error.message);
                });
        }
    }
    
    // Fungsi untuk beralih ke tab laporan dengan filter customer
    function goToReportWithCustomer(customerId, customerName) {
        // Aktifkan tab laporan
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        const reportTabBtn = document.querySelector('.tab-btn[data-tab="reports"]');
        const reportContent = document.getElementById('reports');
        
        reportTabBtn.classList.add('active');
        reportContent.classList.add('active');
        
        // Set filter customer
        document.getElementById('customer-filter').value = customerId;
        document.getElementById('bahan-filter').value = '';
        activeFilter = { type: 'site', name: customerName };
        
        // Tampilkan notifikasi filter
        showFilterNotification();
        
        // Generate laporan
        generateReport();
    }

    // Fungsi untuk beralih ke tab laporan dengan filter bahan
    function goToReportWithBahan(bahanId, bahanName) {
        // Aktifkan tab laporan
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        const reportTabBtn = document.querySelector('.tab-btn[data-tab="reports"]');
        const reportContent = document.getElementById('reports');
        
        reportTabBtn.classList.add('active');
        reportContent.classList.add('active');
        
        // Set filter bahan
        document.getElementById('bahan-filter').value = bahanId;
        document.getElementById('customer-filter').value = '';
        activeFilter = { type: 'bahan', name: bahanName };
        
        // Tampilkan notifikasi filter
        showFilterNotification();
        
        // Generate laporan
        generateReport();
    }

    // Fungsi untuk menampilkan notifikasi filter
    function showFilterNotification() {
        const notificationContainer = document.getElementById('filter-notification');
        
        if (!activeFilter) {
            notificationContainer.innerHTML = '';
            return;
        }
        
        let notificationHTML = '';
        if (activeFilter.type === 'site') {
            notificationHTML = `
                <div class="filter-notification site">
                    <i class="fas fa-filter"></i> Filter aktif: Site "${activeFilter.name}"
                    <button class="btn btn-sm btn-secondary" id="clear-filter" style="margin-left: 10px;">
                        <i class="fas fa-times"></i> Hapus Filter
                    </button>
                </div>
            `;
        } else if (activeFilter.type === 'bahan') {
            notificationHTML = `
                <div class="filter-notification bahan">
                    <i class="fas fa-filter"></i> Filter aktif: Bahan "${activeFilter.name}"
                    <button class="btn btn-sm btn-secondary" id="clear-filter" style="margin-left: 10px;">
                        <i class="fas fa-times"></i> Hapus Filter
                    </button>
                </div>
            `;
        }
        
        notificationContainer.innerHTML = notificationHTML;
        
        // Tambahkan event listener untuk tombol hapus filter
        document.getElementById('clear-filter').addEventListener('click', function() {
            document.getElementById('customer-filter').value = '';
            document.getElementById('bahan-filter').value = '';
            activeFilter = null;
            notificationContainer.innerHTML = '';
            generateReport();
        });
    }
    
    // Fungsi untuk inisialisasi peta dengan tema gelap
    // Perbarui fungsi initMap untuk menggunakan marker merah
    function initMap() {
        // Hapus peta yang sudah ada jika ada
        if (map) {
            map.remove();
        }
        
        // Buat peta baru dengan tema gelap
        map = L.map('map-container', {
            center: [-2.5000, 117.0000],
            zoom: 5,
            zoomControl: false
        });
        
        // Tambahkan layer peta gelap
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);
        
        // Tambahkan circle marker merah untuk setiap customer
        customers.forEach(customer => {
            // Buat circle marker merah sebagai ganti pin
            const marker = L.circleMarker([customer.koordinat.lat, customer.koordinat.lng], {
                color: '#e74c3c',
                fillColor: '#e74c3c',
                fillOpacity: 0.8,
                radius: 8,
                weight: 2
            }).addTo(map);
            
            // Tambahkan popup info
            marker.bindPopup(`
                <div style="background: #2c3e50; color: #ecf0f1; padding: 10px; border-radius: 5px;">
                    <b>${customer.nama}</b><br>
                    ${customer.alamat}<br>
                    <small>Koordinat: ${customer.koordinat.lat.toFixed(4)}, ${customer.koordinat.lng.toFixed(4)}</small>
                </div>
            `);
            
            // Event untuk saat marker diklik
            marker.on('click', function() {
                // Highlight customer di daftar
                highlightCustomerInList(customer.id);
            });
        });
        
        // Tampilkan daftar customer di overlay
        updateCustomerList();
        
        // Tambahkan kontrol zoom
        L.control.zoom({
            position: 'bottomright'
        }).addTo(map);
        
        // Kontrol kustom
        document.getElementById('zoom-in').addEventListener('click', function() {
            map.zoomIn();
        });
        
        document.getElementById('zoom-out').addEventListener('click', function() {
            map.zoomOut();
        });
        
        document.getElementById('reset-map').addEventListener('click', function() {
            map.setView([-2.5000, 117.0000], 5);
        });
        
        // Tambahkan event listener untuk pencarian customer
        document.getElementById('customer-search').addEventListener('input', function() {
            filterCustomerList(this.value);
        });
    }
    
    // Fungsi untuk memperbarui daftar customer di sidebar
    function updateCustomerList() {
        const customerList = document.getElementById('customer-list');
        customerList.innerHTML = '';
        
        if (customers.length === 0) {
            customerList.innerHTML = '<p style="color: #95a5a6; text-align: center;">Tidak ada customer</p>';
            return;
        }
        
        customers.forEach(customer => {
            const customerInfo = document.createElement('div');
            customerInfo.className = 'customer-info';
            customerInfo.dataset.id = customer.id;
            customerInfo.innerHTML = `
                <div class="customer-name">${customer.nama}</div>
                <div>${customer.alamat}</div>
                <div class="coordinate">${customer.koordinat.lat.toFixed(4)}, ${customer.koordinat.lng.toFixed(4)}</div>
            `;
            
            // Event listener untuk klik customer di daftar
            customerInfo.addEventListener('click', function() {
                // Pindahkan peta ke lokasi customer
                map.setView([customer.koordinat.lat, customer.koordinat.lng], 10);
                
                // Buka popup (simulasi klik pada marker)
                // Karena kita tidak memiliki referensi langsung ke marker,
                // kita bisa menggunakan cara lain seperti menyimpan referensi marker
                // atau mencari marker berdasarkan koordinat
                
                // Highlight customer yang dipilih
                highlightCustomerInList(customer.id);
            });
            
            customerList.appendChild(customerInfo);
        });
    }
    
    // Fungsi untuk memfilter daftar customer berdasarkan pencarian
    function filterCustomerList(searchTerm) {
        const customerItems = document.querySelectorAll('.customer-info');
        const term = searchTerm.toLowerCase();
        
        customerItems.forEach(item => {
            const customerName = item.querySelector('.customer-name').textContent.toLowerCase();
            const customerAddress = item.textContent.toLowerCase();
            
            if (customerName.includes(term) || customerAddress.includes(term)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    // Fungsi untuk menyorot customer di daftar
    function highlightCustomerInList(customerId) {
        // Hapus highlight dari semua item
        document.querySelectorAll('.customer-info').forEach(item => {
            item.classList.remove('highlighted');
        });
        
        // Tambahkan highlight ke item yang dipilih
        const selectedItem = document.querySelector(`.customer-info[data-id="${customerId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('highlighted');
            
            // Scroll ke item yang dipilih
            selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
// Fungsi untuk generate laporan dengan struktur baru
function generateReport() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const customerId = document.getElementById('customer-filter').value;
    const bahanId = document.getElementById('bahan-filter').value;
    
    if (!startDate || !endDate) {
        alert('Harap pilih periode laporan');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Akhir hari
    
    // Filter transaksi berdasarkan periode
    let filteredTransactions = transactions.filter(trans => {
        const transDate = new Date(trans.tanggal);
        return transDate >= start && transDate <= end;
    });
    
    // Filter berdasarkan customer jika dipilih
    if (customerId) {
        filteredTransactions = filteredTransactions.filter(
            trans => trans.perusahaanId == customerId
        );
    }
    
    // Filter berdasarkan bahan jika dipilih
    if (bahanId) {
        const bahanDicari = bahanPeledak.find(b => b.id == bahanId)?.nama;
        filteredTransactions = filteredTransactions.filter(trans => 
            trans.bahanLedak.some(b => b.jenis === bahanDicari)
        );
    }
    
    // Tampilkan hasil
    const tbody = document.getElementById('report-results');
    tbody.innerHTML = '';
    
    if (filteredTransactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="42" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Tidak ada data transaksi dalam periode yang dipilih</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Urutkan transaksi berdasarkan tanggal
    filteredTransactions.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
    
    // Tampilkan setiap transaksi
    filteredTransactions.forEach(trans => {
        // Format tanggal
        const tanggal = new Date(trans.tanggal);
        const formattedDate = tanggal.toLocaleDateString('id-ID');
        
        // Untuk setiap bahan dalam transaksi, buat baris terpisah
        trans.bahanLedak.forEach((bahan, index) => {
            const row = document.createElement('tr');
            
            // Hitung nilai untuk kolom-kolom baru
                const dpp = bahan.quantity * bahan.harga;
                const ppn = dpp * 0.11;
                const amount = dpp + ppn;
                const amountIncTax = dpp + ppn;
            
            // Isi data untuk setiap kolom
            row.innerHTML = `
                <!-- Customer Section -->
                <td>-</td>
                <td>${formattedDate}</td>
                <td>-</td>
                <td>${bahan.jenis}</td>
                <td>${bahan.quantity}</td>
                <td>${bahan.satuan}</td>
                <td>${bahan.harga.toLocaleString('id-ID')}</td>
                <td>${dpp.toLocaleString('id-ID')}</td>
                <td>${ppn.toLocaleString('id-ID')}</td>
                <td>${amount.toLocaleString('id-ID')}</td>
                
                <!-- Vendor Section -->
                <td>PT Distribusi Ammo Nusantara</td>
                <td>-</td>
                <td>${bahan.jenis}</td>
                <td>${bahan.quantity}</td>
                <td>${bahan.satuan}</td>
                <td>${bahan.harga.toLocaleString('id-ID')}</td>
                <td>${dpp.toLocaleString('id-ID')}</td>
                <td>${ppn.toLocaleString('id-ID')}</td>
                <td>${amount.toLocaleString('id-ID')}</td>
                <td>-</td>
                <td>-</td>
                
                <!-- Transport Section -->
                <td>-</td>
                <td>${trans.biayaLogistik.toLocaleString('id-ID')}</td>
                <td>${(trans.biayaLogistik * 0.1).toLocaleString('id-ID')}</td>
                <td>${(trans.biayaLogistik * 0.02).toLocaleString('id-ID')}</td>
                <td>${trans.biayaLogistik.toLocaleString('id-ID')}</td>
                <td>-</td>
                <td>-</td>
                
                <!-- BAST Section -->
                <td>${formattedDate}</td>
                <td>${formattedDate}</td>
                <td>${trans.beritaAcara ? 'Ya' : 'Tidak'}</td>
                
                <!-- Invoice to Customer Section -->
                <td>-</td>
                <td>${amountIncTax.toLocaleString('id-ID')}</td>
                <td>${formattedDate}</td>
                <td>${formattedDate}</td>
                <td>${formattedDate}</td>
                <td>-</td>
            `;
            tbody.appendChild(row);
        });
    });
    
    // Simpan data untuk download
    currentReportData = {
        filteredTransactions: filteredTransactions,
        startDate: startDate,
        endDate: endDate
    };
}

// Fungsi untuk download laporan Excel dengan struktur baru
function downloadExcelReport() {
    if (!currentReportData || currentReportData.filteredTransactions.length === 0) {
        alert('Tidak ada data untuk didownload');
        return;
    }
    
    try {
        // Siapkan data untuk Excel
        const data = [];
        
        // Header
        data.push([
            // Customer Section
            'No. Project',
            'Date PO Customer',
            'No. PO Customer',
            'Description',
            'Qty',
            'Unit',
            'Unit Price (IDR)',
            'DPP',
            'PPN',
            'Amount',
            
            // Vendor Section
            'Vendor',
            'No. PO Vendor',
            'Description',
            'Qty',
            'Unit',
            'Unit Price (IDR)',
            'DPP',
            'PPN',
            'Amount',
            'Invoice Vendor',
            'Date of Payment Vendor',
            
            // Transport Section
            'Transport',
            'DPP',
            'PPN',
            'PPH 23',
            'Amount',
            'Invoice Transport',
            'Date of Payment Transport',
            
            // BAST Section
            'Date of BAST',
            'Hardcopy BAST',
            'Receipt PO & BAST',
            
            // Invoice to Customer Section
            'No. Invoice DAN to Cust',
            'Amount Inc. Tax',
            'Invoice Date',
            'Due Date',
            'Date of Payment Customer',
            'Remark'
        ]);
        
        // Data transaksi
        currentReportData.filteredTransactions.forEach(trans => {
            const tanggal = new Date(trans.tanggal);
            const formattedDate = tanggal.toLocaleDateString('id-ID');
            
            trans.bahanLedak.forEach((bahan, index) => {
                const dpp = bahan.quantity * bahan.harga;
                const ppn = dpp * 0.11;
                const amount = dpp + ppn;
                const amountIncTax = dpp + ppn;
                
                const row = [
                    // Customer Section
                    '-',
                    formattedDate,
                    '-',
                    bahan.jenis,
                    bahan.quantity,
                    bahan.satuan,
                    bahan.harga,
                    dpp,
                    ppn,
                    amount,
                    
                    // Vendor Section
                    'PT Distribusi Ammo Nusantara',
                    '-',
                    bahan.jenis,
                    bahan.quantity,
                    bahan.satuan,
                    bahan.harga,
                    dpp,
                    ppn,
                    amount,
                    '-',
                    '-',
                    
                    // Transport Section
                    '-',
                    trans.biayaLogistik,
                    trans.biayaLogistik * 0.11,
                    trans.biayaLogistik * 0.02,
                    trans.biayaLogistik,
                    '-',
                    '-',
                    
                    // BAST Section
                    formattedDate,
                    formattedDate,
                    trans.beritaAcara ? 'Ya' : 'Tidak',
                    
                    // Invoice to Customer Section
                    '-',
                    amountIncTax,
                    formattedDate,
                    formattedDate,
                    formattedDate,
                    '-'
                ];
                data.push(row);
            });
        });
        
        // Buat worksheet
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Buat workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan Penjualan');
        
        // Download file
        XLSX.writeFile(wb, 'Laporan_Penjualan.xlsx');
        
        alert('Laporan Excel berhasil didownload!');
    } catch (error) {
        console.error(error);
        alert('Terjadi kesalahan saat membuat laporan Excel');
    }
}

// Fungsi untuk download laporan PDF dengan struktur baru
function downloadPDFReport() {
    if (!currentReportData || currentReportData.filteredTransactions.length === 0) {
        alert('Tidak ada data untuk didownload');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a3'
        });
        
        // Judul laporan
        doc.setFontSize(16);
        doc.text('LAPORAN PENJUALAN PT DISTRIBUSI AMMO NUSANTARA', 20, 20);
        
        // Periode laporan
        const startFormatted = new Date(currentReportData.startDate).toLocaleDateString('id-ID');
        const endFormatted = new Date(currentReportData.endDate).toLocaleDateString('id-ID');
        
        doc.setFontSize(12);
        doc.text(`Periode: ${startFormatted} - ${endFormatted}`, 20, 30);
        
        // Header tabel
        const headers = [
            ['No. Project', 'Date PO Customer', 'No. PO Customer', 'Description', 'Qty', 'Unit', 'Unit Price (IDR)', 'DPP', 'PPN', 'Amount',
             'Vendor', 'No. PO Vendor', 'Description', 'Qty', 'Unit', 'Unit Price (IDR)', 'DPP', 'PPN', 'Amount', 'Invoice Vendor', 'Date of Payment Vendor',
             'Transport', 'DPP', 'PPN', 'PPH 23', 'Amount', 'Invoice Transport', 'Date of Payment Transport',
             'Date of BAST', 'Hardcopy BAST', 'Receipt PO & BAST',
             'No. Invoice DAN to Cust', 'Amount Inc. Tax', 'Invoice Date', 'Due Date', 'Date of Payment Customer', 'Remark']
        ];
        
        // Data tabel
        const tableData = [];
        
        currentReportData.filteredTransactions.forEach(trans => {
            const tanggal = new Date(trans.tanggal);
            const formattedDate = tanggal.toLocaleDateString('id-ID');
            
            trans.bahanLedak.forEach((bahan, index) => {
                const dpp = bahan.quantity * bahan.harga;
                const ppn = dpp * 0.11;
                const amount = dpp + ppn;
                const amountIncTax = dpp + ppn;
                
                const row = [
                    '-',
                    formattedDate,
                    '-',
                    bahan.jenis,
                    bahan.quantity.toString(),
                    bahan.satuan,
                    'Rp ' + bahan.harga.toLocaleString('id-ID'),
                    'Rp ' + dpp.toLocaleString('id-ID'),
                    'Rp ' + ppn.toLocaleString('id-ID'),
                    'Rp ' + amount.toLocaleString('id-ID'),
                    
                    'PT Distribusi Ammo Nusantara',
                    '-',
                    bahan.jenis,
                    bahan.quantity.toString(),
                    bahan.satuan,
                    'Rp ' + bahan.harga.toLocaleString('id-ID'),
                    'Rp ' + dpp.toLocaleString('id-ID'),
                    'Rp ' + ppn.toLocaleString('id-ID'),
                    'Rp ' + amount.toLocaleString('id-ID'),
                    '-',
                    '-',
                    
                    '-',
                    'Rp ' + trans.biayaLogistik.toLocaleString('id-ID'),
                    'Rp ' + (trans.biayaLogistik * 0.1).toLocaleString('id-ID'),
                    'Rp ' + (trans.biayaLogistik * 0.02).toLocaleString('id-ID'),
                    'Rp ' + trans.biayaLogistik.toLocaleString('id-ID'),
                    '-',
                    '-',
                    
                    formattedDate,
                    formattedDate,
                    trans.beritaAcara ? 'Ya' : 'Tidak',
                    
                    '-',
                    'Rp ' + amountIncTax.toLocaleString('id-ID'),
                    formattedDate,
                    formattedDate,
                    formattedDate,
                    '-'
                ];
                tableData.push(row);
            });
        });
        
        // Buat tabel
        doc.autoTable({
            startY: 40,
            head: headers,
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 4, cellPadding: 1 },
            headStyles: { fillColor: [44, 62, 80] },
            margin: { left: 5, right: 5 }
        });
        
        // Download file
        doc.save('Laporan_Penjualan.pdf');
        
        alert('Laporan PDF berhasil didownload!');
    } catch (error) {
        console.error(error);
        alert('Terjadi kesalahan saat membuat laporan PDF');
    }
}
    
        // Fungsi untuk menampilkan master bahan di dashboard
        function tampilkanMasterBahan() {
            const container = document.getElementById('bahan-list');
            const searchInput = document.getElementById('search-bahan');
            container.innerHTML = '';
            
            // Hitung jumlah transaksi per bahan
            const transactionCountPerBahan = {};
            transactions.forEach(trans => {
                trans.bahanLedak.forEach(bahan => {
                    const bahanId = bahan.bahanId;
                    if (!transactionCountPerBahan[bahanId]) {
                        transactionCountPerBahan[bahanId] = 0;
                    }
                    transactionCountPerBahan[bahanId]++;
                });
            });
            
            // Sort bahan berdasarkan nama
            const sortedBahan = [...bahanPeledak].sort((a, b) => a.nama.localeCompare(b.nama));
            
            // Update counter
            document.getElementById('bahan-count').textContent = sortedBahan.length;
            
            if (sortedBahan.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>Tidak ada data bahan</p>
                    </div>
                `;
                return;
            }
            
            // Tampilkan bahan
            sortedBahan.forEach(bahan => {
                const count = transactionCountPerBahan[bahan.id] || 0;
                const item = document.createElement('div');
                item.className = 'master-item';
                item.dataset.id = bahan.id;
                item.dataset.type = 'bahan';
                item.innerHTML = `
                    <div>${bahan.nama}</div>
                    <div class="item-counter">${count}</div>
                `;
                container.appendChild(item);
                
                // Event listener untuk klik item
                item.addEventListener('click', function() {
                    const clickedId = parseInt(this.dataset.id);
                    
                    // Jika item yang sama diklik lagi, reset filter
                    if (selectedMasterItem && 
                        selectedMasterItem.type === 'bahan' && 
                        selectedMasterItem.id === clickedId) {
                        resetMasterSelection();
                        return;
                    }
                    
                    // Simpan item yang dipilih
                    selectedMasterItem = { type: 'bahan', id: clickedId };
                    
                    // Hapus active dari semua item, lalu set active pada item ini
                    document.querySelectorAll('.master-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    this.classList.add('active');
                    
                    // Aktifkan tab ringkasan site
                    document.getElementById('site-tab').click();
                    
                    // Set filter bahan
                    document.getElementById('filter-bahan').value = clickedId;
                    document.getElementById('filter-customer').value = '';
                    
                    // Nonaktifkan tab ringkasan bahan dan kuota
                    document.querySelectorAll('.summary-tab').forEach(tab => {
                        if (tab.getAttribute('data-summary') !== 'site') {
                            tab.classList.add('disabled');
                        } else {
                            tab.classList.remove('disabled');
                        }
                    });
                    
                    // Perbarui dashboard
                    updateDashboard();
                });
            });
            
            // Fungsi pencarian
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const items = container.querySelectorAll('.master-item');
                
                items.forEach(item => {
                    const bahanName = item.textContent.toLowerCase();
                    if (bahanName.includes(searchTerm)) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }
        
        // Fungsi untuk menampilkan master site di dashboard
        function tampilkanMasterSite() {
            const container = document.getElementById('site-list');
            const searchInput = document.getElementById('search-site');
            container.innerHTML = '';
            
            // Hitung jumlah transaksi per site
            const transactionCountPerSite = {};
            transactions.forEach(trans => {
                const siteId = trans.perusahaanId;
                if (!transactionCountPerSite[siteId]) {
                    transactionCountPerSite[siteId] = 0;
                }
                transactionCountPerSite[siteId]++;
            });
            
            // Sort site berdasarkan nama
            const sortedSites = [...customers].sort((a, b) => a.nama.localeCompare(b.nama));
            
            // Update counter
            document.getElementById('site-count').textContent = sortedSites.length;
            
            if (sortedSites.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-building"></i>
                        <p>Tidak ada data site</p>
                    </div>
                `;
                return;
            }
            
            // Tampilkan site
            sortedSites.forEach(site => {
                const count = transactionCountPerSite[site.id] || 0;
                const item = document.createElement('div');
                item.className = 'master-item';
                item.dataset.id = site.id;
                item.dataset.type = 'site';
                item.innerHTML = `
                    <div>${site.nama}</div>
                    <div class="item-counter">${count}</div>
                `;
                container.appendChild(item);
                
                // Event listener untuk klik item
                item.addEventListener('click', function() {
                    const clickedId = parseInt(this.dataset.id);
                    
                    // Jika item yang sama diklik lagi, reset filter
                    if (selectedMasterItem && 
                        selectedMasterItem.type === 'site' && 
                        selectedMasterItem.id === clickedId) {
                        resetMasterSelection();
                        return;
                    }
                    
                    // Simpan item yang dipilih
                    selectedMasterItem = { type: 'site', id: clickedId };
                    
                    // Hapus active dari semua item, lalu set active pada item ini
                    document.querySelectorAll('.master-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    this.classList.add('active');
                    
                    // Aktifkan tab ringkasan bahan
                    document.getElementById('bahan-tab').click();
                    
                    // Set filter site
                    document.getElementById('filter-customer').value = clickedId;
                    document.getElementById('filter-bahan').value = '';
                    
                    // Nonaktifkan tab ringkasan site dan kuota
                    document.querySelectorAll('.summary-tab').forEach(tab => {
                        if (tab.getAttribute('data-summary') !== 'bahan') {
                            tab.classList.add('disabled');
                        } else {
                            tab.classList.remove('disabled');
                        }
                    });
                    
                    // Perbarui dashboard
                    updateDashboard();
                });
            });
            
            // Fungsi pencarian
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const items = container.querySelectorAll('.master-item');
                
                items.forEach(item => {
                    const siteName = item.textContent.toLowerCase();
                    if (siteName.includes(searchTerm)) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }
        
        // Fungsi untuk mereset semua filter dan seleksi
        function resetMasterSelection() {
            selectedMasterItem = null;
            currentDashboardFilters = { customer: '', bahan: '' };
            
            // Reset input filter
            document.getElementById('filter-customer').value = '';
            document.getElementById('filter-bahan').value = '';
            
            // Hapus seleksi dari semua item master
            document.querySelectorAll('.master-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Aktifkan kembali semua tab ringkasan
            document.querySelectorAll('.summary-tab').forEach(tab => {
                tab.classList.remove('disabled');
            });
            
            // Kembalikan ke tab ringkasan bahan default
            document.querySelector('.summary-tab[data-summary="bahan"]').click();
            
            // Perbarui dashboard
            updateDashboard();
        }
    
        // Fungsi untuk mengupdate chart
        function updateChart(labels, datasets, title) {
            const ctx = document.getElementById('summaryChart').getContext('2d');
            
            // Hapus chart sebelumnya jika ada
            if (summaryChart) {
                summaryChart.destroy();
            }
            
            // Konfigurasi chart berdasarkan tipe
            let config;
            
            if (currentChartType === 'pie') {
                // Pie chart: Distribusi per bahan
                const pieData = {
                    labels: labels,
                    datasets: [{
                        data: datasets[0].data,
                        backgroundColor: generateChartColors(labels.length),
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        borderWidth: 1
                    }]
                };
                
                config = {
                    type: 'pie',
                    data: pieData,
                    options: getChartOptions(title)
                };
            } else if (currentChartType === 'line') {
                // Line chart dengan multiple datasets
                const lineData = {
                    labels: labels,
                    datasets: datasets.map(dataset => ({
                        label: dataset.label,
                        data: dataset.data,
                        borderColor: dataset.backgroundColor,
                        backgroundColor: dataset.backgroundColor.replace('0.8', '0.1'),
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3
                    }))
                };
                
                config = {
                    type: 'line',
                    data: lineData,
                    options: getChartOptions(title)
                };
            } else {
                // Bar chart (default)
                const barData = {
                    labels: labels,
                    datasets: datasets.map(dataset => ({
                        label: dataset.label,
                        data: dataset.data,
                        backgroundColor: dataset.backgroundColor,
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        borderWidth: 1
                    }))
                };
                
                config = {
                    type: 'bar',
                    data: barData,
                    options: getChartOptions(title)
                };
            }
            
            // Buat chart baru
            summaryChart = new Chart(ctx, config);
        }
        
        // Fungsi untuk membuat opsi chart
        function getChartOptions(title) {
            return {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#ecf0f1'
                        }
                    },
                    title: {
                        display: true,
                        text: title,
                        color: '#ecf0f1',
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (currentSummaryMode === 'kuota') {
                                        // Untuk kuota, tampilkan angka biasa
                                        label += context.parsed.y.toLocaleString('id-ID');
                                    } else {
                                        // Untuk lainnya, tampilkan dalam format uang
                                        label += 'Rp' + context.parsed.y.toLocaleString('id-ID');
                                    }
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#ecf0f1',
                            callback: function(value) {
                                if (currentSummaryMode === 'kuota') {
                                    return value.toLocaleString('id-ID');
                                }
                                return 'Rp' + value.toLocaleString('id-ID');
                            }
                        },
                        grid: {
                            color: 'rgba(236, 240, 241, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#ecf0f1'
                        },
                        grid: {
                            color: 'rgba(236, 240, 241, 0.1)'
                        }
                    }
                }
            };
        }
        
        // Fungsi untuk generate warna chart
        function generateChartColors(count) {
            const colors = [
                'rgba(231, 76, 60, 0.8)',
                'rgba(52, 152, 219, 0.8)',
                'rgba(46, 204, 113, 0.8)',
                'rgba(155, 89, 182, 0.8)',
                'rgba(241, 196, 15, 0.8)',
                'rgba(230, 126, 34, 0.8)',
                'rgba(52, 73, 94, 0.8)',
                'rgba(26, 188, 156, 0.8)'
            ];
            
            // Jika jumlah data lebih dari warna yang tersedia, ulangi warna
            const result = [];
            for (let i = 0; i < count; i++) {
                result.push(colors[i % colors.length]);
            }
            return result;
        }
        
        // Fungsi untuk generate warna acak
        function generateRandomColor() {
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);
            return `rgba(${r}, ${g}, ${b}, 0.8)`;
        }
    
    // Fungsi untuk menambah bahan SIK
    function tambahBahanSIK() {
        const container = document.getElementById('sik-bahan-container');
        const newRow = document.createElement('div');
        newRow.className = 'sik-bahan-row';
        newRow.innerHTML = `
            <select class="form-control bahan-sik" required>
                <option value="">Pilih Jenis Bahan</option>
            </select>
            <input type="number" class="form-control kuota-sik" placeholder="Kuota" min="1" required>
            <input type="text" class="form-control satuan-sik" placeholder="Satuan" readonly>
            <button type="button" class="btn btn-danger btn-sm btn-icon remove-sik-bahan"><i class="fas fa-times"></i></button>
        `;
        container.appendChild(newRow);
        
        // Isi dropdown bahan untuk baris baru
        isiDropdownBahan();
        
        // Tambah event listener untuk tombol hapus
        newRow.querySelector('.remove-sik-bahan').addEventListener('click', function() {
            container.removeChild(newRow);
        });
    }
    
    // Fungsi untuk menyimpan SIK Kemhan ke database
    function simpanSIK(e) {
        e.preventDefault();
        
        const nomorSIK = document.getElementById('nomor-sik').value.trim();
        const tanggalMulai = document.getElementById('tanggal-mulai').value;
        const tanggalBerakhir = document.getElementById('tanggal-berakhir').value;
        const keterangan = document.getElementById('keterangan-sik').value.trim();
        const editId = document.getElementById('sik-id').value;
        
        // Kumpulkan data bahan dengan kuota
        const bahanRows = document.querySelectorAll('.sik-bahan-row');
        const bahanList = [];
        
        bahanRows.forEach(row => {
            const bahanId = row.querySelector('.bahan-sik').value;
            const bahan = bahanPeledak.find(b => b.id == bahanId);
            const kuota = parseInt(row.querySelector('.kuota-sik').value);
            
            if (bahanId && kuota > 0) {
                bahanList.push({
                    bahanId: parseInt(bahanId),
                    bahanNama: bahan.nama,
                    kuota: kuota,
                    terpakai: 0
                });
            }
        });
        
        if (bahanList.length === 0) {
            alert('Minimal satu bahan dengan kuota harus ditambahkan');
            return;
        }
        
        const sikData = {
            nomor: nomorSIK,
            tanggalMulai: tanggalMulai,
            tanggalBerakhir: tanggalBerakhir,
            bahan: bahanList,
            keterangan: keterangan
        };
        
        const formData = new FormData();
        formData.append('action', 'save_sik');
        formData.append('sik_data', JSON.stringify(sikData));
        
        if (editId) {
            formData.append('edit_id', editId);
        }
        
        fetch('index.php', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                return refreshAllData();
            }
            throw new Error('Gagal menyimpan SIK');
        })
        .then(() => {
            document.getElementById('sikForm').reset();
            document.getElementById('sik-bahan-container').innerHTML = '';
            document.getElementById('sik-id').value = '';
            document.getElementById('cancel-sik').style.display = 'none';
            tambahBahanSIK();
            alert(`SIK Kemhan ${editId ? 'diperbarui' : 'disimpan'}!`);
        })
        .catch(error => {
            alert('Gagal menyimpan SIK: ' + error.message);
        });
    }
    
    // Fungsi untuk menampilkan daftar SIK Kemhan
    function tampilkanDaftarSIK() {
        const tbody = document.getElementById('daftar-sik');
        tbody.innerHTML = '';
        
        if (sikKemhanList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-file-contract"></i>
                        <p>Belum ada data SIK Kemhan</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Urutkan SIK berdasarkan tanggal berakhir (dari yang terbaru)
        const sortedSIK = [...sikKemhanList].sort((a, b) => 
            new Date(b.tanggalBerakhir) - new Date(a.tanggalBerakhir)
        );
        
        sortedSIK.forEach(sik => {
            // Hitung total kuota dan terpakai
            let totalKuota = 0;
            let totalTerpakai = 0;
            
            sik.bahan.forEach(b => {
                totalKuota += b.kuota;
                totalTerpakai += b.terpakai;
            });
            
            const totalSisa = totalKuota - totalTerpakai;
            
            // Format periode
            const startDate = new Date(sik.tanggalMulai).toLocaleDateString('id-ID');
            const endDate = new Date(sik.tanggalBerakhir).toLocaleDateString('id-ID');
            
            // Tentukan status
            const today = new Date();
            const endDateObj = new Date(sik.tanggalBerakhir);
            let statusClass = '';
            let statusText = '';
            
            if (today > endDateObj) {
                statusClass = 'badge-danger';
                statusText = 'Kadaluarsa';
            } else if (totalSisa <= 0) {
                statusClass = 'badge-warning';
                statusText = 'Kuota Habis';
            } else {
                statusClass = 'badge-success';
                statusText = 'Aktif';
            }
            
            const row = document.createElement('tr');
            row.className = 'clickable-row sik-row';
            row.setAttribute('data-id', sik.id);
            row.innerHTML = `
                <td>${sik.nomor}</td>
                <td>${startDate} - ${endDate}</td>
                <td>${totalKuota.toLocaleString('id-ID')}</td>
                <td>${totalTerpakai.toLocaleString('id-ID')}</td>
                <td>${totalSisa.toLocaleString('id-ID')}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td class="action-group">
                    <button class="action-btn btn-edit-sik" data-id="${sik.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete-sik" data-id="${sik.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
            
            // Tambahkan event listener untuk klik baris
            row.addEventListener('click', function(e) {
                // Cegah event jika yang diklik adalah tombol aksi
                if (!e.target.closest('.btn-edit-sik') && !e.target.closest('.btn-delete-sik')) {
                    selectSIK(sik.id);
                }
            });
        });
        
        // Tambah event listener untuk tombol edit
        document.querySelectorAll('.btn-edit-sik').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                editSIK(id);
            });
        });
        
        // Tambah event listener untuk tombol hapus
        document.querySelectorAll('.btn-delete-sik').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                hapusSIK(id);
            });
        });
    }
    
    // Fungsi untuk memilih SIK
    function selectSIK(id) {
        const sik = sikKemhanList.find(s => s.id === id);
        if (!sik) return;
        
        selectedSIK = sik;
        
        // Hapus kelas selected dari semua baris
        document.querySelectorAll('.sik-row').forEach(row => {
            row.classList.remove('sik-selected');
        });
        
        // Tambah kelas selected ke baris yang dipilih
        const selectedRow = document.querySelector(`.sik-row[data-id="${id}"]`);
        if (selectedRow) {
            selectedRow.classList.add('sik-selected');
        }
        
        // Perbarui ringkasan SIK
        updateSIKSummary();
    }
    
    // Fungsi untuk mengedit SIK
    function editSIK(id) {
        const sik = sikKemhanList.find(s => s.id === id);
        if (!sik) return;
        
        sikToEdit = sik;
        
        // Isi form dengan data SIK
        document.getElementById('nomor-sik').value = sik.nomor;
        document.getElementById('tanggal-mulai').value = sik.tanggalMulai;
        document.getElementById('tanggal-berakhir').value = sik.tanggalBerakhir;
        document.getElementById('keterangan-sik').value = sik.keterangan || '';
        document.getElementById('sik-id').value = sik.id;
        document.getElementById('cancel-sik').style.display = 'inline-block';
        
        // Kosongkan container bahan
        const container = document.getElementById('sik-bahan-container');
        container.innerHTML = '';
        
        // Tambahkan baris bahan sesuai SIK
        sik.bahan.forEach(bahan => {
            const newRow = document.createElement('div');
            newRow.className = 'sik-bahan-row';
            newRow.innerHTML = `
                <select class="form-control bahan-sik" required>
                    <option value="">Pilih Jenis Bahan</option>
                </select>
                <input type="number" class="form-control kuota-sik" placeholder="Kuota" min="1" required>
                <input type="text" class="form-control satuan-sik" placeholder="Satuan" readonly>
                <button type="button" class="btn btn-danger btn-sm btn-icon remove-sik-bahan"><i class="fas fa-times"></i></button>
            `;
            container.appendChild(newRow);
            
            // Isi dropdown bahan
            isiDropdownBahan();
            
            // Set nilai
            newRow.querySelector('.bahan-sik').value = bahan.bahanId;
            newRow.querySelector('.kuota-sik').value = bahan.kuota;
            
            // Set satuan
            const bahanData = bahanPeledak.find(b => b.id == bahan.bahanId);
            if (bahanData) {
                newRow.querySelector('.satuan-sik').value = bahanData.satuan;
            }
            
            // Tambah event listener untuk tombol hapus
            newRow.querySelector('.remove-sik-bahan').addEventListener('click', function() {
                container.removeChild(newRow);
            });
        });
        
        // Scroll ke form
        document.getElementById('sikForm').scrollIntoView({ behavior: 'smooth' });
    }
    
    // Fungsi untuk membatalkan edit SIK
    function cancelEditSIK() {
        document.getElementById('sikForm').reset();
        document.getElementById('sik-bahan-container').innerHTML = '';
        document.getElementById('sik-id').value = '';
        document.getElementById('cancel-sik').style.display = 'none';
        tambahBahanSIK();
    }
    
    // Fungsi untuk menghapus SIK dari database
    function hapusSIK(id) {
        if (confirm('Apakah Anda yakin ingin menghapus SIK ini?')) {
            const formData = new FormData();
            formData.append('action', 'delete_sik');
            formData.append('id', id);
            
            fetch('index.php', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (response.ok) {
                    return refreshAllData();
                }
                throw new Error('Gagal menghapus SIK');
            })
            .then(() => {
                alert('SIK berhasil dihapus!');
            })
            .catch(error => {
                alert('Gagal menghapus SIK: ' + error.message);
            });
        }
    }
    
    // Fungsi untuk update ringkasan SIK
    function updateSIKSummary() {
        const container = document.getElementById('sik-quota-summary');
        container.innerHTML = '';
        
        if (!selectedSIK && sikKemhanList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-contract"></i>
                    <p>Belum ada data SIK Kemhan</p>
                </div>
            `;
            return;
        }
        
        // Jika ada SIK yang dipilih, tampilkan detailnya
        if (selectedSIK) {
            container.innerHTML = `
                <div class="quota-card">
                    <div class="quota-card-header">${selectedSIK.nomor}</div>
                    <div class="quota-card-value">${new Date(selectedSIK.tanggalMulai).toLocaleDateString('id-ID')} - ${new Date(selectedSIK.tanggalBerakhir).toLocaleDateString('id-ID')}</div>
                    <div class="quota-card-label">Periode Berlaku</div>
                </div>
            `;
            
            selectedSIK.bahan.forEach(bahan => {
                const bahanData = bahanPeledak.find(b => b.id == bahan.bahanId);
                if (bahanData) {
                    const persentase = bahan.kuota > 0 ? 
                        Math.round((bahan.terpakai / bahan.kuota) * 100) : 0;
                    
                    // Tentukan kelas progress bar berdasarkan persentase
                    let progressClass = '';
                    if (persentase >= 90) {
                        progressClass = 'kuota-expired';
                    } else if (persentase >= 75) {
                        progressClass = 'kuoto-low';
                    }
                    
                    const card = document.createElement('div');
                    card.className = 'quota-card';
                    card.innerHTML = `
                        <div class="quota-card-header">${bahanData.nama}</div>
                        <div class="quota-card-value">${bahan.terpakai.toLocaleString('id-ID')} / ${bahan.kuota.toLocaleString('id-ID')} ${bahanData.satuan}</div>
                        <div class="quota-card-label">${persentase}% Terpakai</div>
                        <div class="quota-progress">
                            <div class="quota-progress-bar ${progressClass}" style="width: ${persentase}%"></div>
                        </div>
                    `;
                    container.appendChild(card);
                }
            });
        } else {
            // Tampilkan ringkasan semua SIK
            const totalKuota = {};
            const totalTerpakai = {};
            
            sikKemhanList.forEach(sik => {
                sik.bahan.forEach(bahan => {
                    const bahanData = bahanPeledak.find(b => b.id == bahan.bahanId);
                    if (bahanData) {
                        if (!totalKuota[bahanData.nama]) {
                            totalKuota[bahanData.nama] = 0;
                            totalTerpakai[bahanData.nama] = 0;
                        }
                        totalKuota[bahanData.nama] += bahan.kuota;
                        totalTerpakai[bahanData.nama] += bahan.terpakai;
                    }
                });
            });
            
            Object.keys(totalKuota).forEach(bahanName => {
                const kuota = totalKuota[bahanName];
                const terpakai = totalTerpakai[bahanName];
                const persentase = kuota > 0 ? 
                    Math.round((terpakai / kuota) * 100) : 0;
                
                // Tentukan kelas progress bar berdasarkan persentase
                let progressClass = '';
                if (persentase >= 90) {
                    progressClass = 'kuota-expired';
                } else if (persentase >= 75) {
                    progressClass = 'kuoto-low';
                }
                
                const card = document.createElement('div');
                card.className = 'quota-card';
                card.innerHTML = `
                    <div class="quota-card-header">${bahanName}</div>
                    <div class="quota-card-value">${terpakai.toLocaleString('id-ID')} / ${kuota.toLocaleString('id-ID')}</div>
                    <div class="quota-card-label">${persentase}% Terpakai</div>
                    <div class="quota-progress">
                        <div class="quota-progress-bar ${progressClass}" style="width: ${persentase}%"></div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    }
    
    // Fungsi untuk update chart SIK
    function updateSIKChart() {
        const ctx = document.getElementById('sikChart').getContext('2d');
        
        // Hancurkan chart yang sudah ada jika ada
        if (sikChart) {
            sikChart.destroy();
        }
        
        // Siapkan data untuk chart (perbandingan kuota dan realisasi per tahun)
        const tahunData = {};
        
        sikKemhanList.forEach(sik => {
            const tahun = new Date(sik.tanggalMulai).getFullYear();
            
            if (!tahunData[tahun]) {
                tahunData[tahun] = {
                    kuota: 0,
                    realisasi: 0
                };
            }
            
            sik.bahan.forEach(bahan => {
                tahunData[tahun].kuota += bahan.kuota;
                tahunData[tahun].realisasi += bahan.terpakai;
            });
        });
        
        const labels = Object.keys(tahunData).sort();
        const kuotaData = labels.map(tahun => tahunData[tahun].kuota);
        const realisasiData = labels.map(tahun => tahunData[tahun].realisasi);
        
        // Buat chart baru
        sikChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Kuota',
                        data: kuotaData,
                        backgroundColor: 'rgba(52, 152, 219, 0.7)'
                    },
                    {
                        label: 'Realisasi',
                        data: realisasiData,
                        backgroundColor: 'rgba(46, 204, 113, 0.7)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Perbandingan Kuota dan Realisasi SIK Kemhan per Tahun',
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('id-ID');
                            }
                        }
                    }
                }
            }
        });
    }

    // Event listener untuk inisialisasi aplikasi
    document.addEventListener('DOMContentLoaded', function() {
        // Tampilkan tanggal saat ini
        updateCurrentDate();
        
        // Set tanggal default ke hari ini
        document.getElementById('tanggal').valueAsDate = new Date();
        
        // Set tanggal default untuk filter dashboard (bulan ini)
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), 0, 2);
        document.getElementById('filter-start-date').valueAsDate = firstDay;
        document.getElementById('filter-end-date').valueAsDate = today;
        
        // Event listener untuk tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // Hapus kelas active dari semua tab
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Tambah kelas active ke tab yang diklik
                this.classList.add('active');
                const tabId = this.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
                
                // Jika tab map, inisialisasi peta
                if (tabId === 'map') {
                    initMap();
                }
                
                // Jika tab laporan, isi filter customer
                if (tabId === 'reports') {
                    isiFilterCustomer();
                    isiFilterBahanLaporan();
                }
                
                // Jika tab dashboard, perbarui data
                if (tabId === 'dashboard') {
                    updateDashboard();
                }
                
                // Jika tab SIK Kemhan, perbarui data
                if (tabId === 'sik-kemhan') {
                    tampilkanDaftarSIK();
                    updateSIKSummary();
                    updateSIKChart();
                }
            });
        });
        
        // Event listener untuk tab ringkasan
        document.querySelectorAll('.summary-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                // Hapus kelas active dari semua tab
                document.querySelectorAll('.summary-tab').forEach(t => t.classList.remove('active'));
                // Tambah kelas active ke tab yang diklik
                this.classList.add('active');
                
                // Sembunyikan semua tabel
                document.getElementById('summary-bahan-table').style.display = 'none';
                document.getElementById('summary-site-table').style.display = 'none';
                document.getElementById('summary-kuota-table').style.display = 'none';
                
                // Tampilkan tabel yang sesuai
                const summaryType = this.getAttribute('data-summary');
                currentSummaryMode = summaryType;
                
                if (summaryType === 'bahan') {
                    document.getElementById('summary-bahan-table').style.display = 'table';
                } else if (summaryType === 'site') {
                    document.getElementById('summary-site-table').style.display = 'table';
                } else if (summaryType === 'kuota') {
                    document.getElementById('summary-kuota-table').style.display = 'table';
                }
                
                // Perbarui ringkasan
                updateDashboard();
            });
        });
        
        // Event listener untuk tipe chart
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // Hapus kelas active dari semua tombol
                document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
                // Tambah kelas active ke tombol yang diklik
                this.classList.add('active');
                
                // Set tipe chart baru
                currentChartType = this.getAttribute('data-chart-type');
                
                // Perbarui chart
                updateDashboard();
            });
        });
        
        // Event listener untuk refresh
        document.getElementById('refresh-transactions').addEventListener('click', function() {
            tampilkanRiwayatTransaksi();
            updateStats();
            updateDashboard();
        });
        
        document.getElementById('refresh-dashboard').addEventListener('click', updateDashboard);
        document.getElementById('refresh-map').addEventListener('click', initMap);
        document.getElementById('refresh-sik').addEventListener('click', function() {
            tampilkanDaftarSIK();
            updateSIKSummary();
            updateSIKChart();
        });
        
        // Event listener untuk tambah bahan
        document.getElementById('tambah-bahan').addEventListener('click', tambahBahan);
        
        // Event listener untuk form transaksi
        document.getElementById('transactionForm').addEventListener('submit', simpanTransaksi);
        
        // Event listener untuk batal edit
        document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
        
        // Event listener untuk file upload transaksi
        document.getElementById('berita-acara').addEventListener('change', function(e) {
            const fileName = e.target.files.length > 0 ? e.target.files[0].name : 'Belum ada file dipilih';
            document.getElementById('file-name').textContent = fileName;
        });
        
        // Event listener untuk file upload restore
        document.getElementById('restore-file').addEventListener('change', function(e) {
            const fileName = e.target.files.length > 0 ? e.target.files[0].name : 'Belum ada file dipilih';
            document.getElementById('restore-file-name').textContent = fileName;
        });
        
        // Event listener untuk backup
        document.getElementById('downloadBackup').addEventListener('click', downloadBackup);
        
        // Event listener untuk restore
        document.getElementById('restoreData').addEventListener('click', restoreData);
        
        // Event listener untuk tambah bahan baru
        document.getElementById('tambah-bahan-btn').addEventListener('click', tambahBahanBaru);
        
        // Event listener untuk form customer
        document.getElementById('customerForm').addEventListener('submit', simpanCustomer);
        
        // Event listener untuk form SIK Kemhan
        document.getElementById('sikForm').addEventListener('submit', simpanSIK);
        document.getElementById('tambah-sik-bahan').addEventListener('click', tambahBahanSIK);
        document.getElementById('cancel-sik').addEventListener('click', cancelEditSIK);
        
        // Event listener untuk modal
        document.querySelector('.close-modal').addEventListener('click', closeModal);
        document.getElementById('cancel-delete').addEventListener('click', closeModal);
        document.getElementById('confirm-delete').addEventListener('click', deleteTransaction);
        
        // Isi dropdown perusahaan
        isiDropdownPerusahaan();
        isiFilterCustomerDashboard();
        isiFilterBahanDashboard();
        
        // Isi dropdown bahan
        isiDropdownBahan();
        
        // Tampilkan riwayat transaksi
        tampilkanRiwayatTransaksi();
        
        // Tampilkan daftar bahan
        tampilkanDaftarBahan();
        
        // Tampilkan daftar customer
        tampilkanDaftarCustomer();
        
        // Update statistik
        updateStats();
        updateDashboard();
        
        // Set default dates for report
        document.getElementById('start-date').valueAsDate = firstDay;
        document.getElementById('end-date').valueAsDate = today;
        
        // Generate report
        document.getElementById('generate-report').addEventListener('click', generateReport);
        
        // Download laporan
        document.getElementById('download-excel').addEventListener('click', downloadExcelReport);
        document.getElementById('download-pdf').addEventListener('click', downloadPDFReport);
        
        // Event listener untuk filter dashboard
        document.getElementById('apply-filters').addEventListener('click', updateDashboard);
        document.getElementById('reset-filters').addEventListener('click', resetMasterSelection);
        
        // Tampilkan master bahan dan site di dashboard
        tampilkanMasterBahan();
        tampilkanMasterSite();
    });