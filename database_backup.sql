-- Script untuk backup data (jalankan secara berkala)

-- Backup seluruh database
-- pg_dump -U postgres -d erp_ammo_nusantara -f backup_erp_$(date +%Y%m%d).sql

-- Atau backup hanya data tertentu (tanpa schema)
COPY (SELECT * FROM bahan_peledak) TO '/backup/bahan_peledak.csv' WITH CSV HEADER;
COPY (SELECT * FROM customers) TO '/backup/customers.csv' WITH CSV HEADER;
COPY (SELECT * FROM sik_kemhan) TO '/backup/sik_kemhan.csv' WITH CSV HEADER;
COPY (SELECT * FROM transactions) TO '/backup/transactions.csv' WITH CSV HEADER;