-- Add audit fields to suppliers table
ALTER TABLE dodavatele 
ADD COLUMN vytvoril_id UUID REFERENCES profily_uzivatelu(id),
ADD COLUMN upravil_id UUID REFERENCES profily_uzivatelu(id);

-- Initialize sample supplier HITEX
INSERT INTO dodavatele (kod, nazev_spolecnosti, zeme_puvodu, vychozi_mena, platebni_podminky_splatnost_dni, vychozi_lead_time_tydny, kontakty)
VALUES (
    'HITEX', 
    'HITEX Composites Ltd.', 
    'Čína', 
    'EUR', 
    0, 
    3, 
    '{"email_objednavky": "orders@hitex.cn", "jmeno_zastupce": "Mr. Chen", "telefonni_cislo": "+86 123 456 789"}'
) ON CONFLICT (kod) DO NOTHING;
