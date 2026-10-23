# System report filters

Apply the previously approved System visual style to the date, test-type and topic controls requested by the user. Use consistently labelled 46px controls, native calendar inputs, icon-bearing custom single selects, selected-option check marks, themed borders and a separated apply footer. Use four columns on desktop, two on narrower screens and one on mobile. Share the filter component with staff analytics without changing its assignment control.

Preserve explicit Apply behavior, report query keys and inclusive end-date conversion in Asia/Tashkent. Constrain both ends of the date range to prevent reversed dates. The custom select supports arrows, Home/End, Enter/Space, Escape, Tab, outside click and text-prefix navigation; long menus scroll internally and long selected labels truncate visually while retaining their accessible name.

No backend or database changes. Validate query values, date boundaries, clearing filters, keyboard control, both report consumers, light/dark appearance, translations and 320/390/768px layouts before publishing.

Verification: all three TypeScript checks and the production build passed. Fourteen Chrome acceptance checks passed against learner progress and staff analytics, including exact query timestamps, explicit Apply, clearing selections, invalid date prevention, keyboard interaction, all languages and responsive/dark layouts. The private exam-data bundle scan also passed.
