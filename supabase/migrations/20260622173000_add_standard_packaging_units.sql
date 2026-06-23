-- ============================================================
-- Phase 2.8: Add Standard Packaging Units
-- Adds standard packaging units to c_merne_jednotky lookup table.
-- ============================================================

INSERT INTO c_merne_jednotky (id, nazev, zkratka) VALUES
  ('baleni', 'Balení', 'bal.'),
  ('krabice', 'Krabice', 'krab.')
ON CONFLICT (id) DO UPDATE SET
  nazev = EXCLUDED.nazev,
  zkratka = EXCLUDED.zkratka;
