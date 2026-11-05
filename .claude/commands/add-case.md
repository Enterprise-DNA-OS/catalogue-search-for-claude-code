# /add-case

Record a real expected result and why it should appear. Never make a failed test disappear by weakening the expectation without the operator asking.

Run `npm run search -- add-case --catalogue=<code> --query="<query>" --expected=<object-id> --max-rank=3 --rationale="<why>" --by="<operator>"`. Use `--json` when reading the result for further analysis.

Read CLAUDE.md first. Use the operator’s actual name for --by. Preserve unknowns. Report the result and any unresolved issue. Never send, publish or change a live website.
