-- Vytvoření číselníku kódů vláken
CREATE TABLE IF NOT EXISTS c_kody_vlakna (
    id TEXT PRIMARY KEY,
    nazev TEXT NOT NULL
);

-- Seeding základních kódů vláken
INSERT INTO c_kody_vlakna (id, nazev) VALUES
('syt45', 'SYT45'),
('syt45s', 'SYT45S'),
('tc33', 'TC33'),
('hts40', 'HTS40'),
('h2550', 'H2550'),
('af1000', 'AF1000'),
('af3000', 'AF3000'),
('as4', 'AS4'),
('tr30s', 'TR30S')
ON CONFLICT (id) DO UPDATE SET nazev = EXCLUDED.nazev;
