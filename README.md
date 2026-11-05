# Catalogue Search for Claude Code

Search your catalogue, check what people cannot find, and keep the corrections with the person who owns them. An open-source database and CLI for the catalogue search work you use Algolia for.

## Three ways to own it

- **Do it yourself.** Free under the MIT licence. Run the database and commands with Claude Code, Codex, OpenCode or Cursor. Hosting and agent subscriptions are separate.
- **We customise it.** Enterprise DNA maps your records, fields, search rules and existing website connection. One setup fee, then a retainer for ongoing work.
- **We run it for you.** Omni by Enterprise DNA installs, connects and operates your version. One setup fee, then a monthly retainer. [Book a 30-minute call](https://enterprisedna.co/omni/book?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=algolia).

## Try the fictional catalogue

Node 20 or later. No database account or vendor credentials needed.

```bash
npm install
npm run demo
npm run search -- catalogues
npm run search -- search "waterproof jacket" --catalogue=harbour-outdoors
npm run search -- relevance-check --catalogue=harbour-outdoors
npm run search -- weekly-review --catalogue=harbour-outdoors
npm run view
npm run docs
npm test
```

The demo is fictional Harbour Outdoors: two rain jackets, a rucksack, unavailable boots, an expired tent offer and trekking poles with no source review. A second guide catalogue proves search isolation. Seed is repeatable and does not overwrite changed demo records. Never seed your production database.

The base provides English keyword search, category filtering, whole-query one-way synonyms, bounded boosts and expected-result checks. Archived, unavailable and expired records do not appear in search. It does not claim Algolia API compatibility, automatic typo correction, personalisation, a hosted search service or production load capacity. Website integration is a separate implementation and test job. Read [why there is no front end](docs/why-no-front-end.md).

## Bring your Algolia records

[The switching guide](docs/replace-algolia.md) explains the vendor’s browse export, cursor completeness, mapping and reconciliation. Import a complete record array in one command after creating your catalogue:

```bash
npm run search -- add-catalogue --code=my-products --name="My products" --owner="Catalogue manager" --purpose="Public product discovery" --by="Operator"
npm run search -- import algolia imports/products.json --catalogue=my-products --expected-count=250 --dry-run --by="Operator"
```

Remove `--dry-run` once the record count and mapped fields agree with the source. The example count is illustrative; use your real count. Unknown attributes stay intact in the raw source record. Custom field names use `--map=imports/map.json`. A single bad record rolls back the whole import. Repeating an object ID updates that record within its catalogue. Imports replace mapped fields, so review the mapping before using an export to update locally edited records.

## The weekly rituals

Start with `/gaps`, `/relevance-check`, `/attention`, `/synonyms` and `/tasks`. `/weekly-review` combines the first three into a private draft. `/draft-search-fix` prepares the correction brief. `/compliance` flags purpose, retention and source-review gaps with sources and limits. Nothing sends or deploys.

The full routing table is in [CLAUDE.md](CLAUDE.md). `npm run search -- help` lists the CLI and accepted flags. `--json` produces structured results. Failed expectations are returned as FAIL rows with exit 0 so a review can contain both passes and failures; invalid commands or ambiguous references exit 1.

## Ten questions across your records

These are implemented queries, not unsupported claims about another vendor’s dashboards. Run `npm run search -- insights <key> --catalogue=harbour-outdoors`.

1. Which categories contain the most overdue source reviews? `stale-categories`
2. Which products have no searchable description? `missing-descriptions`
3. Which unavailable products are still expected by our search tests? `stock-gaps`
4. Which expired offers are excluded from results? `expired-offers`
5. Which categories have the most products without an expected search? `untested-categories`
6. Which vocabulary changes are past their review date? `synonym-debt`
7. Who owns the most overdue search corrections? `owner-backlog`
8. Which days of query history are past our retention policy? `retention-review`
9. Which recorded searches repeatedly found nothing? `zero-demand`
10. Which expected results fail after the latest catalogue change? `failed-expectations`

## Your first hour: ten things to ask for

1. Show what needs attention this week.
2. Find a waterproof jacket and explain the ranking.
3. Show the recorded searches that found nothing.
4. Tell me why boots fail the expected search.
5. Show the owner of the overdue jacket review.
6. Add a search case for the product customers ask for.
7. Draft the search correction brief.
8. Prepare the Monday search review.
9. Add a supplier field through /customise.
10. Add a report of overdue reviews grouped by category through /new-view.

## Reports and paperwork

Set business name, logo and colours in `brand.json`. `npm run view` produces three read-only HTML reports: catalogue health, attention and zero results. `npm run docs` produces a catalogue review worksheet, synonym review worksheet and retention review for each catalogue. Files remain local and are printable. These are operational working papers, not statutory certificates. The renderer escapes record text and uses private file permissions where the operating system supports them.

## Data, access and backups

`supabase/migrations/` contains portable Postgres SQL. The adapter selects operator-managed Postgres through DATABASE_URL or embedded PGlite under `.data/db`. Both use the same queries. All eight domain tables have UUIDs, timestamps and update triggers. Public database privileges are revoked; no anonymous database access is granted. This is a trusted-operator tool, not a multi-tenant access service.

`export exports/<new-directory>` writes all eight record types to snapshot.json and one importable JSON file per catalogue. Existing output directories are refused. Keep these files private. The default reimport maps catalogue content only; use the explicit archive map in the switching guide for status and review fields. The snapshot is an audit-readable export, not a full database restore tool. Test recovery from a stopped PGlite directory copy or Postgres backup before cutover. Do not commit imports, exports or generated documents.

## Validation

`npm test` uses a temporary data directory and checks the search engine, catalogue isolation, ranking expectations, source expiry, audit writes, import idempotency, dry run, rollback, mappings, export reimport, drafts, HTML escaping and actual CLI exit codes. GitHub Actions runs on Linux and Windows and also against disposable Postgres. Local runs do not prove hosted CI passed; check the workflow result after pushing.

## Licence and independence

MIT. Copyright 2026 Enterprise DNA. This is an independent project, not affiliated with Algolia. Your database is the product; the coding agent is the door. [Read the comparison](https://enterprisedna.co/omni/instead-of/algolia?utm_source=github&utm_medium=readme&utm_campaign=algolia).
