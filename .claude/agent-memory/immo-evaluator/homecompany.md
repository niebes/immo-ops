# HomeCompany (+ any agency site running the `sw-immosuite` WordPress plugin)
Portal match: homecompany.de · berlin.homecompany.de (all 20 agency subdomains redirect to
the main site) · reachable as the *Anbieter* behind immobilien.de / SZ / Regionalimmobilien24
cross-posts. Screenwork's `sw-immosuite` plugin is used by other Makler sites too — the API
recipe below is worth trying on any agency WordPress whose `/wp-json/` lists `sw-immosuite/v1`.

## HomeCompany is **Wohnen auf Zeit**, always — this is a hard-blocker portal
HomeCompany eG's own strings say it outright: `/wp-json/` site description
`"Full-Service Agentur für Wohnen auf Zeit"`; footer on every page *"HomeCompany eG — Ihre
Agenturen für Wohnen auf Zeit"*; the listings index headline *"Willkommen bei der Zukunft
des Wohnens auf Zeit."* The local agency (Berlin = **HomeCompany Berlin Volkmer & Fierus
GbR**, Bundesallee 39-40a, Inhaber Thomas Fierus) is a **Mitwohnzentrale, never the
Vermieter** — the actual landlord is never named on any surface.
Network standard: let for **3–12 months, Berlin minimum 3 Monate**.

**So: Anbieter contains "HomeCompany" ⇒ § 549 Abs. 2 Nr. 1 BGB temporary let ⇒
`no_zwischenmiete` fires ⇒ Block G = 1,0, global capped at 2,0.** Do not wait for an
explicit Mindestmietdauer — **the exposé deliberately prints none**, because the term is
negotiated per tenant. Its absence is NOT evidence of an unbefristeter Vertrag.

Corroborating fields, all on the exposé: `Pauschalmiete` (not Kaltmiete), `Möbliert: voll`,
`Nichtraucher`, `Haustiere erlaubt: Nein`, and prose aimed at *"Berufstätige, Pendler …
sofort bezugsfertige Wohnlösung"*. Tenant pays no Provision (*"kostenfrei für Mieter"*),
Kaution is a round number unrelated to 3× Kaltmiete (there is no Kaltmiete).
**Why:** furnished alone is not the blocker, so without the Mitwohnzentrale + Pauschalmiete
stack you cannot tell a genuine § 549 Zeitmietvertrag from an ordinary furnished flat, and
the score swings between 2,0 and ~3,5 on that call (seen #659).

## Getting the authoritative exposé: the `sw-immosuite` PDF route (no browser, no auth)
The public site search (`/?s={ObjNr}`) finds **nothing** — the objects are not WP posts, and
`/wohnungen/` is a React app that fetches. Two open REST endpoints do the whole job:

1. `GET /wp-json/sw-immosuite/v1/expose/search-map?search=x` → **the entire national
   inventory** as `{"list":[{"id":…,"lat":…,"lng":…}]}` (~2.000 objects, ~100 KB). The
   `search` param is ignored; that is fine — you want the full list.
2. Filter that list by the **lat/lng from the cross-post's JSON-LD** (a bbox of ±0,03° is
   plenty; the match is usually exact to 4 decimals because both sides come from the same
   OpenImmo export).
3. `GET /wp-json/sw-immosuite/v1/pdfexpose/{id}` → a full **16-page PDF exposé**
   (`application/pdf`, ~1,9 MB). `pdftotext -layout` it; `pdfimages -list` counts the real
   photos (19 on #659 — enough to lift any Block-D photo cap).

The PDF carries what no aggregator does: the **`Pauschalmiete` label**, Kaution, Baujahr,
Etage, `Möbliert`, `Haustiere erlaubt`, `Gartennutzung`, the Ausstattung + Sonstiges keyword
lists (this is where **Balkon/Keller presence is decided** — HomeCompany does list "zwei
Balkone" when there are any, so silence means absent), and `Stand: {today}` proving liveness.
It withholds the street (*"Die vollständige Adresse erhalten Sie bei uns"*) — take that from
the immobilien.de JSON-LD instead.
**Why:** without the PDF you only have the aggregator's mislabelled "Warmmiete" and no way
to prove Pauschalmiete, must-have absence, or photo count.

Other API routes exist (`/wp-json/sw-immosuite/v1` lists them) but `/expose/search/{id}`
needs a saved-search id and POST to `search-map` 404s — use the two GETs above.
