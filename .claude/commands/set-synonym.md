# /set-synonym

Read existing synonyms and relevant search cases. Add a one-way whole-query expansion, then rerun relevance-check.

Run `npm run search -- set-synonym --catalogue=<code> --term="<query>" --expansion="<words>" --owner="<owner>" --review-on=YYYY-MM-DD --by="<operator>"`. Use `--json` when reading the result for further analysis.

Read CLAUDE.md first. Use the operator’s actual name for --by. Preserve unknowns. Report the result and any unresolved issue. Never send, publish or change a live website.
