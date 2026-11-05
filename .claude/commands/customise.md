# /customise

Read CLAUDE.md and the existing migrations. Ask what field, category or rule the operator wants changed. Write a new numbered migration, update the CLI validation and commands, and add a meaningful smoke test. Run npm test against its temporary database, then apply the migration to the operator’s selected database. Do not edit an applied migration. Show the changed record and update the relevant documentation. Never weaken access controls or publish a website change.
