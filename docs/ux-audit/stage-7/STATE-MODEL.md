# Authoring state and durability

## Independent storage

`hm.authoringDrafts.v1` is an additive `{ version: 1, drafts: { identity: envelope } }` store. Each envelope has `kind`, `sourceVersion`, millisecond `updatedAt`, unique `revision` and structurally validated `payload`. Question identities are `question:new` and `question:<source ID>`; builder and import use `builder:current` and `import:current`. Existing question source content determines the editor source version; sample workflows have explicit fixture versions.

Question drafts contain text, matching terms/definitions, options, explicit correct choice, accepted answers/manual method, topic, preview points/difficulty and optional legal reference. Builder drafts contain current step, details, method, selections, groups, local dates/times and advanced options. Import drafts contain step, filename/size metadata and mapping/duplicate decisions. No file bytes enter storage. Preview completion is transient and separate from persistence.

Structural validation permits incomplete forms to be recovered. Business validation occurs before question preview and at each builder step. Corrupt global JSON is never silently replaced. Invalid or incompatible individual records disable recovery and offer confirmed scoped discard. A globally unreadable store keeps new work in memory and offers Retry saving; external repair/removal of that store is necessary if it remains malformed. Failed writes are never reported as saved.

## Route entry and saving

No record opens the source form. A compatible record offers explicit Resume local draft or confirmed Start fresh. An incompatible record shows storage incompatibility and disables resume. Source fields are replaced only after Resume. Start fresh deletes only this identity after confirmation and restores its source. Failed deletion preserves the record and form.

Edits remain in memory immediately; after 700 ms the latest structurally valid payload is saved. Manual Save local draft and Retry saving use the same path. Success updates the durable snapshot and local timestamp. Failure preserves all fields. Dirty means the payload differs from the last known durable snapshot; leave protection remains until successful saving, explicit loss confirmation or source reset.

## Conflicts

Every write rereads the store, compares this identity to its expected record and preserves other identities. A differing record opens a decision without overwriting it. Current fields remain in memory. Use saved version validates and adopts the current durable record. Replace saved version with mine compares again to the competing record observed when the conflict was presented; another change demands another decision. Escape preserves both versions; Review versions reopens the decision.

This is a conservative local conflict check, not collaborative editing or a cross-process transaction protocol. Simultaneous interleaved localStorage operations have no atomic transaction guarantee. No server synchronization is claimed.

## Navigation and dialogs

React Router useBlocker guards internal links, Student app and SPA Back/Forward while dirty. Native beforeunload covers reload, closing and document navigation; the browser supplies its wording. Leave anyway permits deliberate loss. Successful saves permit leaving without loss prompts. Consequential dialogs use the shared native modal, safe initial focus, contained keyboard focus, Escape cancellation and trigger restoration. Ordinary Bank and Editor previews stay in document flow.

## Workflow boundaries

Overview counts unfinished GRADING fixtures. Bank shows actual rows, keeps filters in its URL and carries that context into/out of Editor. Its hide/review actions mutate only mounted sample rows; reset/reload restores fixtures. Import shows ten fixture rows with three enduring source errors; completion is a demonstration. Builder automatically selects real fixture IDs or accepts manual IDs, and cannot publish or assign. Student grades, attempts, sessions and question definitions are untouched.
