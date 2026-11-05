# Catalogue and query record checks

Sources opened 2026-11-05. These are limited operational checks, not a legal assessment or certification. The base handles public, non-personal catalogue content. The operator must review source files, raw attributes and query text for personal or restricted information before import.

| Check | Implemented behaviour | Basis |
|---|---|---|
| Purpose and responsibility | A catalogue must have an owner and purpose. The check reports older records with blank values. | [NZ Privacy Principle 1](https://www.privacy.org.nz/privacy-principles/1/) requires a lawful connected purpose and necessary collection when personal information is involved. An owner field is our operational control, not a statutory wording. |
| Query retention | Reports query events older than the catalogue’s chosen retention_days. It does not delete them. | [NZ Privacy Principle 9](https://www.privacy.org.nz/privacy-principles/9/) limits personal-information retention to what the lawful purpose requires. The default 30 days is an editable business policy, not a legal deadline. |
| Source review | Reports active catalogue records with no reviewed_on or older than review_days. | A local catalogue-quality policy. The default 30 days is not a statutory period. |
| Identifier minimisation | Search and log-query reject apparent email addresses and uninterrupted long number strings. Searches are not logged automatically. | Supports data minimisation under Principle 1. This heuristic does not identify all personal information, and does not make an imported record anonymous. |

For Australian operators, [APP 11 guidance](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information) describes security and destruction or de-identification obligations where the Privacy Act applies. The responsible person must establish applicability, exceptions and a retention schedule. A local review flag is not proof that those obligations have been met.

No automatic deletion, anonymisation, breach reporting, consent assessment, publication approval or legal-hold handling is included. Resolve retention findings with the responsible person and apply an expressly authorised maintenance change covering the database, raw imports, drafts, exports and backups. A clean check does not mean all retained data is lawful.
