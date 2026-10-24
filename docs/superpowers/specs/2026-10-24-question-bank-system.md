# Question bank: compact System layout

The existing System design is the accepted visual direction. Replace oversized question cards with compact rows showing source number, type, topic, current publication status and a small edit action. A keyboard-accessible disclosure reveals the complete stem without leaving the bank. Keep source filenames visible and truncate long text only in the collapsed summary.

Search, type, topic and publication status apply to the entire accessible bank on the server. Paginate twenty rows at a time. Group imports newest first and sort each group by its authoritative import row number, rather than random draft UUIDs. Do not derive order from question wording. Manual questions remain visible. Preserve teacher ownership and admin visibility; never expose answer keys in list responses.

Explain the existing publishing workflow in the bank, successful import history and empty assignment overview. Import creates question drafts; published questions can be used to build a test; a published test can be open practice or assigned to a group. Do not publish or assign content automatically.

Verify real D1 queries for ownership, filtering, page boundaries, source ordering and answer-key exclusion. Browser fixtures use synthetic content to check compact rows, disclosure, paging, search, filters, mobile width, themes, and empty-state navigation. No database migration is needed.
