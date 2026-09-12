# mapio.net — Aggregator-CACHE, kein eigener Portal-Kanal (Rettungsanker für gelöschte Exposés)

Gilt für: **mapio.net** (Aggregator). Steht in `portals.yml` nicht — man landet dort nicht über einen
Scan, sondern über eine WebSearch nach der Adresse eines bereits **gelöschten** Inserats.

## Wozu — der einzige Grund, es zu öffnen
Wenn ein Exposé an der Quelle weg ist (IS24-Mobile-API 404 `ERROR_RESOURCE_NOT_FOUND`, Immowelt
„Anzeige gelöscht"), liefert mapio.net oft noch die **vollständige Objektbeschreibung + Ausstattung
+ Lage + Sonstiges + Anbieter** des verschwundenen Inserats. Das verwandelt einen leeren
EXPIRED-Report („nur Suchmetadaten, alles unbekannt") in einen mit belastbarem Cached-Data-Block:
Baujahr, Vertragsart, Ausstattung, Anbietername — genau die Felder, die bei einem **Re-List unter
neuer Scout-ID** die Wiedererkennung und die ersten drei Kontaktfragen tragen.
*Why:* ohne diesen Weg endet jeder 404 mit „Nebenkosten, Baujahr, Kaution, Anbieter: alle unbekannt",
obwohl die Daten öffentlich noch eine Suchanfrage entfernt liegen.

## Zugriffsweg (rein curl, kein Browser, keine Consent-Wall, kein Bot-Schutz)
1. `WebSearch "{Straße} {Ort} {Objekttyp} mieten"` → liefert `mapio.net/gegend-new/{id}-…/`
   (Gebiets-Trefferliste) und/oder `mapio.net/expose/{id}/`.
2. Gebietsseite curlen und die `href="/expose/NNNNNNNN/"` in **Seitenreihenfolge** ziehen — die
   Links stehen in derselben Reihenfolge wie die Teaser im Text, es gibt keinen Adress-Anker am
   Link. Also Teaser-Text (Adresse/Preis/m²) und Linkliste positionsweise paaren.
3. `curl -sL -A "<Desktop-Chrome-UA>" https://mapio.net/expose/{id}/` → 200, ~128 KB HTML.
   Text mit `re.sub` von `<script>/<style>/<tags>` befreien; der brauchbare Teil steht **vor**
   dem Marker `"Neue Angebote per E-Mail"` (danach beginnt das Suchformular-Boilerplate).

## Fallen
- **mapio markiert abgelaufene Inserate nur mit Verzögerung.** Ein frisch gelöschtes Exposé zeigt
  *kein* „Nicht mehr verfügbar"-Banner (alte Einträge schon, z. B. ein Inserat von 2018). Der Cache
  ist damit **niemals** ein Liveness-Beweis — Liveness entscheidet immer die Quelle (IS24-Mobile-API).
- **Der Cache verlinkt die Quelle NICHT** (keine Exposé-ID, kein Portal-Link im HTML). Die Zuordnung
  läuft ausschließlich über Adresse + Preis + m² + Inseratsdatum. Bei mehreren Einheiten derselben
  Hausnummer also zusätzlich die Zimmerzahl prüfen.
- **Der Cache ist unvollständig:** Nebenkosten/Warmmiete, Kaution, Energieausweis und Etage fehlen
  regelmäßig; enthalten sind Kaltmiete, m², Objekttext, Ausstattungsliste, Anbieter und
  Inseratsdatum. Cached-Werte deshalb immer ausdrücklich als **unverifiziert** kennzeichnen und
  per `evaluate.md`-Doktrin **nicht scoren**.
- **Das Inseratsdatum („Inseriert am …") ist der beste Standzeit-Messwert**, den man nach einer
  Löschung noch bekommt: Differenz zum Scan-/Löschdatum trennt „nach 11 Tagen vermietet" von
  „nach 2 Tagen zurückgezogen" (letzteres wäre ein Köder-Indiz). Seen on #733.
- **Archiv-Bonus: das Nachbarhaus derselben Straße von vor Jahren ist ein Preis-Zeitanker.**
  `mapio.net/archiv/…` bzw. alte `/expose/`-Seiten überleben jahrelang; auf #733 lieferte
  Orville-Wright-Str. **74a** (12/2018, 98 m², 1.084 EUR = 11,06 EUR/m²) den Vergleich zum aktuellen
  Aufruf (14,33 EUR/m² = +29,6 % in 8 Jahren ≈ +3,3 %/Jahr). Das ist ein adressgenauer
  Vergleichsobjekt-Beleg im Sinne von `potsdam-mietspiegel.md` — billiger als jede Marktrecherche.

Erstmals genutzt: #733 (IS24 expose 170405942, Reihenendhaus Orville-Wright-Str. 74b, Bornstedt —
404 an der Quelle, voller Objekttext über `mapio.net/expose/41392268/`).
Siehe [[immobilienscout24]] für den 404-Befund und [[potsdam-mietspiegel]] für die Verwertung der
Vergleichsobjekte.
