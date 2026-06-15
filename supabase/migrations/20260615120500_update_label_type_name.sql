-- Migration: Update label type name from 'Vlastní' to 'AZ label'
-- Path: supabase/migrations/20260615120500_update_label_type_name.sql

UPDATE c_typy_labelu 
SET nazev = 'AZ label' 
WHERE id = 'vlastni';
