---
name: translation
description: Maintain FR/EN parity for all user-facing strings (UI copy, score notes, event titles/descriptions, methodology). French is the source language; English mirrors it. Invoked whenever any *_fr / *_en pair is added or edited.
---

# Translation (dynamic context, fires on FR/EN tasks)

## Project rule
**French-first parity.** FR is the source. EN is the mirror. The site presents FR
first (default locale, no `/fr` prefix); EN lives under `/en`.

## When to invoke
- Any new or edited `name_fr` / `name_en`, `title_fr` / `title_en`, `description_fr` / `description_en`, `note_fr` / `note_en`, `label_fr` / `label_en`.
- Any UI string change in `src/i18n/{fr,en}.json`.
- Any methodology / anchor rubric edit (the rubric carries level labels in both languages).

## Glossary (fixed terms — do NOT translate creatively)

| FR | EN | Note |
|---|---|---|
| franc CFA | CFA franc | never "African franc," never "FCFA" alone |
| souveraineté | sovereignty | |
| autonomie externe | external autonomy | Axis A label |
| auto-détermination interne | internal self-determination | Axis B label |
| non-capture | non-capture | technical term — keep |
| capture | capture | the political-science sense; gloss on first use |
| FAIT / INTERPRÉTATION / CONTESTÉ | FACT / INTERPRETATION / CONTESTED | per-record tag |
| HARD / INTERP. | HARD / INTERP. | keep English in both locales (technical) |
| Year of Africa / Année de l'Afrique | Année de l'Afrique / Year of Africa | |
| indépendance sur le papier | independence on paper | R9 baseline label |
| données factices | dummy data | for dummy-mode placeholder copy |
| écart | gap | the nominal-vs-substantive sovereignty gap |
| Françafrique | Françafrique | keep French term in both |
| UEMOA / CEMAC / BCEAO / BEAC | UEMOA / CEMAC / BCEAO / BEAC | acronyms; keep |

## Register
- Editorial. Confident. Minimal. Dense prose. *Le Monde diplomatique* lineage, not press-release voice.
- One-sentence non-specialist gloss for every technical term on first appearance.

## Procedure
1. Write or revise the FR string first.
2. Mirror to EN, using the glossary above.
3. If a term is not in the glossary AND is technical, add a gloss in both languages (one sentence each).
4. Run `npm run validate` — every required `_fr` / `_en` pair is enforced by schema; missing one fails CI.
5. Never machine-translate proper nouns, country names, or rubric raw-value strings.
