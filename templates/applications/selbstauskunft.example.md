# Mieterselbstauskunft — TEMPLATE

<!--
Blank template. The FILLED version (with real applicant data) is generated into
`applications/{listing}/selbstauskunft.md`, which is gitignored — never commit PII.
Placeholders {like_this} are filled from config/profile.yml `applicants:` / `household:`.
Leave any value the applicant has not verified blank — the Selbstauskunft is a legally
binding truthful declaration; never invent a value.
-->

**Objekt:** {address} — {listing_title} (#{listing_no})
**Vertragsbeginn:** {available_from} · **Kaltmiete:** {kaltmiete} · **Nebenkosten:** {nebenkosten} · **TG/Stellplatz:** {stellplatz}
**An:** {landlord_email} — *send per the landlord's stated rules (e.g. separate PDFs, only after viewing).*

| Feld | **Mieter 1** | **Mieter 2** |
|---|---|---|
| Vorname / Name | {m1.vorname_name} | {m2.vorname_name} |
| Geburtsdatum | {m1.geburtsdatum} | {m2.geburtsdatum} |
| Staatsangehörigkeit | {m1.staatsangehoerigkeit} | {m2.staatsangehoerigkeit} |
| Familienstand | {m1.familienstand} | {m2.familienstand} |
| Bisherige Anschrift | {m1.anschrift} | {m2.anschrift} |
| Telefon privat (Festnetz) | {m1.telefon_privat} | {m2.telefon_privat} |
| Mobilfunk | {m1.mobil} | {m2.mobil} |
| E-Mail-Adresse | {m1.email} | {m2.email} |
| Telefon geschäftlich | {m1.telefon_geschaeftlich} | {m2.telefon_geschaeftlich} |
| Bisheriger Vermieter (Anschrift/Telefon) | {m1.bisheriger_vermieter} | {m2.bisheriger_vermieter} |
| Derzeitiger Arbeitgeber (Anschrift/Telefon) | {m1.arbeitgeber} | {m2.arbeitgeber} |
| Beschäftigt in ungekündigter Stellung seit | {m1.beschaeftigt_seit} | {m2.beschaeftigt_seit} |
| Befristet beschäftigt bis | {m1.befristet_bis} | {m2.befristet_bis} |
| Derzeit ausgeübter Beruf | {m1.beruf} | {m2.beruf} |
| Aktuelles monatl. Gesamtnettoeinkommen | {m1.netto_einkommen} | {m2.netto_einkommen} |

**Zum Haushalt gehörende weitere Personen (Kinder/Verwandte/Mitbewohner):** {household.additional_persons}

---

## Erklärungen (Seite 2)

- Die Wohnung wird für **{household.number_of_persons} Personen** benötigt.
- Keine Absicht, weitere Personen aufzunehmen / WG zu gründen.
- Haustiere: {household.haustiere}
- Keine gewerbliche Nutzung.
- Musikinstrumente: {household.musikinstrumente}
- In den letzten 3 Jahren keine eidesstattliche Versicherung / kein Haftbefehl — *durch Unterschrift bestätigen*.
- Kein Insolvenz-/Konkursverfahren in den letzten 5 Jahren — *durch Unterschrift bestätigen*.
- In der Lage, die Mietsicherheit ({kaution}) zu leisten und die Miete laufend zu zahlen.
- Einverständnis Datenverwendung (BDSG): Ja · Einverständnis SCHUFA-Selbstauskunft: Ja

**Ort/Datum:** __________  ·  **Unterschrift Mieter 1 / Mieter 2:** __________
