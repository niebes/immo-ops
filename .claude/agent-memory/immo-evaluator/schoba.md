# Schoba Immobilien — page quirks
Portal match: "Schoba Immobilien" · www.schoba.de

Local Potsdam broker. Detail pages are static `.htm`, server-rendered, no bot-protection, no consent dialog → fetch directly with `curl -sL --compressed` (no CiC needed).

1. **"Not available" notice lives in an HTML comment until the unit is rented.** Every detail page carries the row
   `<!-- <tr>...Dieses Mietobjekt steht leider nicht mehr zur Verfügung...</tr> -->`.
   While the listing is LIVE this row is commented out; the broker un-comments it when the flat is taken. So a naive strip-tags text extract will surface that sentence on a perfectly active listing. Do NOT mark EXPIRED on that text alone — confirm it is inside `<!-- -->`. Real availability is the `Verfügbar ab:` field.
2. **Several optional fields are also commented out** (Etagenanzahl, Fahrstuhl, Kamin, Hundehaltung, Balkon/Dachterrasse, Abstellraum, Gartennutzung). They show up in stripped text with a trailing `-->` — treat a field as present only if it has a real value, not just a label.
3. **Object data** is a label/value `<table>`: Objekt-ID, Baujahr, Zimmer, Wohnfläche (`ca. 61 m²`), Etage, Zustand, Nettokaltmiete/Nebenkosten/Gesamtmietpreis, Mietkaution (as "N Nettokaltmieten"). Energieausweis block (Typ/Klasse/Endenergiebedarf) is inline further down.
4. **Photos**: gallery files are `bilder/objekt-id-{id}-foto-galerie-{n}gr.jpg` (count distinct n = real photo count); `grundrisse/objekt-id-{id}.jpg` is the Grundriss. Numbers German (`711,51 €`).

**Why:** the commented-out "nicht mehr verfügbar" line would otherwise trigger a false EXPIRED on a live listing; the commented optional fields would otherwise be read as present amenities.
