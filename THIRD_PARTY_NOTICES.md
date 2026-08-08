# Third-party notices

## Loomdraft editor (MIT)

Portions of the writing editor under `src/writing-editor/` (CodeMirror markdown
editor, toolbar, spellcheck, themes, styles) and the English Hunspell
dictionaries `dictionaries/en.aff` / `en.dic` are derived from
[Loomdraft](https://github.com/H3kk3/Loomdraft) by Hekke, licensed under the MIT
License. See `src/writing-editor/LICENSE.loomdraft.txt`.

Cockpit does not ship Loomdraft’s project shell (corkboard, wiki tree, export
pipeline); local draft text, version history, and images use Cockpit storage.

## Hunspell dictionaries (LibreOffice)

Additional spell-check dictionaries under `dictionaries/` come from the
[LibreOffice dictionaries](https://github.com/LibreOffice/dictionaries) project.
Upstream README / license texts are kept in `dictionaries/licenses/`.

| Files | Source | License (summary) |
|-------|--------|-------------------|
| `ru.aff`, `ru.dic` | LibreOffice `ru_RU` (Alexander I. Lebedev et al.) | BSD-style (see `licenses/README_ru.txt`) |
| `uk.aff`, `uk.dic` | LibreOffice `uk_UA` / [dict_uk](https://github.com/brown-uk/dict_uk) | MPL 1.1 (see `licenses/README_uk.txt`) |
| `cs.aff`, `cs.dic` | LibreOffice `cs_CZ` | GNU GPL (see `licenses/README_cs.txt`) |
