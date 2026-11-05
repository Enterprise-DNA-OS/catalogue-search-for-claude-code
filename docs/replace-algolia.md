# Moving catalogue records from Algolia

## Export the complete index

Algolia’s [Browse for records](https://www.algolia.com/doc/rest-api/search/browse) operation returns index records in `hits` and a cursor when more records remain. Use your own authorised vendor tools to export; this project never asks for or handles Algolia credentials. Follow all cursors and combine every hit into a JSON array. Reconcile the final object count with the source index. Do not export a filtered search result and call it the whole catalogue.

Save the complete array privately as imports/products.json. The importer accepts that array, or one complete browse response without a continuation cursor. A response containing a cursor is rejected. `--expected-count` is mandatory and must equal the independently checked index count. Count equality cannot prove the exporter chose the correct source or fetched every intended record.

## One import after catalogue setup

```bash
npm run search -- add-catalogue --code=my-products --name="My products" --owner="Catalogue manager" --purpose="Public product discovery" --by="Operator"
npm run search -- import algolia imports/products.json --catalogue=my-products --expected-count=250 --dry-run --by="Operator"
npm run search -- import algolia imports/products.json --catalogue=my-products --expected-count=250 --by="Operator"
```

Replace the example count and names with your actual values. Default mapping: objectID to object_id, name to name, description to description, category to category, available to available. objectID and name must be nonempty strings. Missing description and category become empty; missing availability becomes true. Confirm this mapping before applying. The base expects public catalogue information, not customer records.

For another attribute layout, pass `--map=imports/map.json` with destination keys mapped to source paths, for example `{"object_id":"objectID","name":"product.title","category":"department","available":"in_stock"}`. Nested paths are supported. Boolean availability must be true or false, not 0/1. Multi-valued categories need an explicit choice or extension before import. Every source attribute remains in raw, including ones not made searchable.

Imports are atomic. A bad record, duplicate objectID, bad date or wrong count rolls back the whole file. Dry runs roll back records and audit entries. Repeating an objectID replaces its mapped content within the selected catalogue, without adding another row. Missing mapped optional values reset to defaults. Objects absent from the file are retained, never silently deleted. Locally adjusted boosts, status and review dates must be included in your mapping if they are to survive a subsequent import.

## What you reconcile

Compare the source count and a representative set of object IDs, names, descriptions, categories and stock flags. Read every attribute used to control visibility in Algolia: this base only enforces its own active, available and expiry fields. Run expected searches, including unavailable and expired items, with the business owner. Record the cases with add-case and rerun relevance-check. Settings, synonyms, ranking rules, permissions, analytics, replica configuration and hosted integrations are not carried in an object export. Set the rules you need explicitly. Do not describe the local import as a production website cutover.

## Exporting and recovery

`npm run search -- export exports/review-2026-11-05` writes all eight record types plus one catalogue JSON array each. To retain extra local control fields on reimport, use a mapping containing object_id:objectID, name:name, description:description, category:category, available:available, status:status, boost:boost, reviewed_on:reviewed_on and expires_on:expires_on. The snapshot retains notes, audit events, tasks and cases but is not a built-in restore format. Use full database backups for recovery.

The catalogue import is one command once the complete file and mapping are ready. Connecting a production website, testing its load and agreeing relevance take separate work. Keep Algolia in service until those checks pass. Enterprise DNA can map the records, implement the integration and operate the resulting system.
