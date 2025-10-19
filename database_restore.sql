-- Script untuk restore data dari backup

-- Restore seluruh database
-- psql -U postgres -d erp_ammo_nusantara -f backup_erp_20231201.sql

-- Atau restore dari CSV files
TRUNCATE TABLE bahan_peledak, customers, sik_kemhan, transactions RESTART IDENTITY;

COPY bahan_peledak FROM 'D:/xampp/htdocs/tryphp/backup/bahan_peledak.csv' WITH CSV HEADER;
COPY customers FROM 'D:/xampp/htdocs/tryphp/backup/customers.csv' WITH CSV HEADER;
COPY sik_kemhan FROM 'D:/xampp/htdocs/tryphp/backup/sik_kemhan.csv' WITH CSV HEADER;
COPY transactions FROM 'D:/xampp/htdocs/tryphp/backup/transactions.csv' WITH CSV HEADER;