# Semmelhaack (semmelhaack.de) — evaluator notes

Matches portal: **Semmelhaack**. Detail URL shape: `/vermietung/wohnobjekte/details-wohnobjekt/{id}/`.

## Extraction
- Plain server-rendered page. `document.body.innerText` returns everything **behind** the cookie banner without needing to click consent — no interaction required. Grab it and slice by field.
- **Address is the first line after "Zurück zur Ergebnisliste"** (e.g. `Baumschulenweg 21a, 25436 Tornesch`). Always read the PLZ here — the title never contains the city.
- Price block is under a `Preise` heading: Kaltmiete / Nebenkosten / Heizkosten / Warmmiete / Kaution (stated as "3 Nettokaltmieten"). Energieausweis + Baujahr follow, then `Objektbeschreibung`, then `Sonstiges` (Staffelmiete, Mietbindung, Vertragsausfertigungsgebühr, "Fotos sind Musteransichten").
- Gallery imgs aren't under a `.galerie`/`.gallery` class — a generic `img` count (~45) is not a real-photo count. Photos are typically labelled "Musteransichten" (renders); for Neubau this is normal, no Block D penalty.

## The dominant quirk: nationwide → out-of-area discards
Semmelhaack lists **nationwide**, mostly Schleswig-Holstein / Hamburg / Meck-Pomm / Niedersachsen. The vast majority of forwarded listings are **300+ km from Golm/Potsdam → DISCARDED (location hard blocker)**. Recurring out-of-area PLZ seen: 25436 Tornesch, 21493 Schwarzenbek, 25335 Elmshorn, 23845 Itzstedt, Garbsen/Hannover, Heide/Itzehoe/Brunsbüttel, Tessin/Güstrow. Also frequent: **commercial** units (Büro/Lager/Praxis) → discard, and occasional **WBS-required** → discard.
The Potsdam-area quartiers worth keeping: City-Quartier Potsdam, Fahrland, Eiche. **Why:** confirms the location on-page before scoring; the caller's metadata says "location unverified" precisely because Semmelhaack is nationwide.
