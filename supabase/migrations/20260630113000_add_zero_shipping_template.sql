-- Přidání nové logistické šablony pro ČR bez dopravy (vlastní odběr / dodavatelé v Praze)
INSERT INTO logisticke_sablony (
    id,
    nazev,
    typ_vypoctu_dopravy,
    sazba_dopravy,
    poplatek_banka_czk,
    poplatek_procleni_czk,
    poplatek_odpady_czk,
    poplatek_balne_czk,
    vychozi_clo_procenta,
    zeme_puvodu,
    typ_vypoctu_dopravy_v2,
    fixni_cena_eur,
    bezpecnostni_koeficient
) VALUES (
    'da9adfca-45cf-4ffc-a835-a4fe717054c3',
    'ČR bez dopravy',
    'fixni',
    0,
    0,
    0,
    0,
    0,
    0,
    'CZ',
    'fixed_eur',
    0,
    1
)
ON CONFLICT (id) DO UPDATE SET
    nazev = EXCLUDED.nazev,
    typ_vypoctu_dopravy = EXCLUDED.typ_vypoctu_dopravy,
    sazba_dopravy = EXCLUDED.sazba_dopravy,
    poplatek_banka_czk = EXCLUDED.poplatek_banka_czk,
    poplatek_procleni_czk = EXCLUDED.poplatek_procleni_czk,
    poplatek_odpady_czk = EXCLUDED.poplatek_odpady_czk,
    poplatek_balne_czk = EXCLUDED.poplatek_balne_czk,
    vychozi_clo_procenta = EXCLUDED.vychozi_clo_procenta,
    zeme_puvodu = EXCLUDED.zeme_puvodu,
    typ_vypoctu_dopravy_v2 = EXCLUDED.typ_vypoctu_dopravy_v2,
    fixni_cena_eur = EXCLUDED.fixni_cena_eur,
    bezpecnostni_koeficient = EXCLUDED.bezpecnostni_koeficient;
