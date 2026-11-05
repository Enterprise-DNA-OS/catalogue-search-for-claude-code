# Catalogue Search for Claude Code

Business: [your business]. Operator: [your name]. Priority: useful catalogue results, current source records and accountable review.

The database is the source of truth. Use `npm run search -- help` for accepted commands. Flags use `--name=value`; reads support `--json`. Every mutation requires `--by` with the actual operator’s name. Record lookup accepts a unique case-insensitive name, exact object ID or UUID prefix. Ambiguity lists candidates and exits 1.

| Job | What to do |
|---|---|
| /catalogues | Read catalogue owners, record counts and test coverage. |
| /records | List every record, including archived, expired and unavailable items. |
| /record | Read the full source record before changing it. A partial ID or unique name works. |
| /search | Search the chosen catalogue. Only available, active, unexpired records appear. |
| /facets | Read category counts for searchable records. |
| /synonyms | Read vocabulary expansions, owners and review dates. |
| /cases | Read the expected search results agreed by the operator. |
| /relevance-check | Run expected searches and show every failed rank or missing result. A failed expectation is a business finding, not a script crash. |
| /gaps | Rank recorded searches that returned nothing. Do not call these all website searches. |
| /attention | Show stale source records, expired offers, vocabulary reviews and overdue work. |
| /compliance | Read docs/compliance.md, then show the limited record checks with their sources. A clear result is not legal certification. |
| /insights | Choose one of the ten implemented question keys in the README. |
| /tasks | Read the work list before creating or closing a task. |
| /history | Read the audit events for this catalogue. |
| /add-catalogue | Create a catalogue with a named owner and lawful purpose. Use a unique lowercase code. |
| /set-policy | Read the existing catalogue first. Change only the requested review or retention policy. Do not invent a statutory period. |
| /put-record | Read the record first. Add or update only the specified fields. Set status=archived to withdraw an item. Set reviewed-on only after the source is checked. |
| /set-synonym | Read existing synonyms and relevant search cases. Add a one-way whole-query expansion, then rerun relevance-check. |
| /add-case | Record a real expected result and why it should appear. Never make a failed test disappear by weakening the expectation without the operator asking. |
| /log-query | Record one observed query and its actual result count. Remove personal information first. Do not invent website analytics. |
| /add-task | Read open tasks and add the requested owner and due date. |
| /close-task | Read the task and record what was actually resolved. |
| /log | Record the operator’s factual review note. |
| /import | Read docs/replace-algolia.md. Confirm the complete source count and attribute mapping. Dry run, reconcile, then apply. |
| /export | Export all record types and reusable catalogue files to a new private directory. Never overwrite an earlier export. |
| /weekly-review | Read gaps, relevance-check and attention, then prepare the Monday review. Present failed searches with the owner and next action. |
| /draft-search-fix | Read the source records and prepare the correction brief. Save a draft and present it here. Never send or deploy it. |
| /customise | Change fields and rules with a new migration and tests. |
| /new-view | Add a branded read-only report. |

Read a full record before changing it. Never invent a search observation, source review, owner or result count. Do not import personal or restricted records: this base is for public catalogue information. Search text is not logged automatically. The simple identifier check does not detect every kind of personal information.

All generated messages stay in drafts. No network service, website integration, email sender or public endpoint is shipped. A public website connection needs separate authentication, load, relevance and privacy review before cutover. Local catalogue selection is not tenant authentication. Run the CLI only as a trusted database owner; database RLS denies public access.

Dates are YYYY-MM-DD. Retention and source review periods are business policies, not legal deadlines. Read docs/compliance.md before interpreting findings. Archive catalogue records rather than deleting them. Any removal of personal data needs an explicit operator instruction and a reviewed migration or maintenance change, including backups and exports.

DATABASE_URL selects Postgres; without it, PGlite lives in .data/db. Do not seed an operational database. npm test always uses a temporary embedded database unless TEST_DATABASE_URL explicitly names an empty disposable Postgres database. Keep import files, exports, drafts and generated reports private. For recovery, close PGlite before copying its data directory, or use verified Postgres backups.

Use Claude Code, Codex, OpenCode or Cursor against the same commands and records. Omni by Enterprise DNA provides setup, customisation and ongoing operation.
