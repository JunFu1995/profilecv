# Resume upload regression fixtures

`complete.docx` and `complete.pdf` contain the same fictional Chinese/English resume as `complete.txt`. The PDF has two pages, with the first research entry continuing across the page boundary.

Expected parsing: two jobs containing two and one projects respectively, one independent project, two research entries, two numbered publications with DOI continuation lines, one education entry, and two skill groups. Team, supervisor and degree information must survive header splitting. Contiguous PDF text fragments must not introduce spaces inside English titles, DOI strings or Chinese section names.

Manual verification on 2026-11-01 used the actual upload picker with local parsing. PDF and DOCX extraction matched the fixture text ignoring whitespace. After editing research and paper fields and moving projects, both saved JSON exports matched the reviewed fields after a browser reload. Existing materials and delivery versions stayed unchanged. PDF undo was additionally compared to the complete pre-import JSON baseline and matched exactly.

Word undo confirmation was completed in a follow-up browser check on 2026-11-01, using an isolated localhost origin and the actual DOCX upload picker:

1. Export the pre-import baseline, append `complete.docx`, and explicitly accept the imported name. After confirming the import, edit the name again and append a marker to the imported research summary.
2. Export the modified document, click **撤销本次导入**, and verify the in-page warning explains that later edits will also be reverted. The initially focused button is **保留当前内容**.
3. Click **保留当前内容**, reload, and export again. Both later edits, all imported records, project ownership and both existing delivery versions remain intact. The complete documents match after `normalizeDoc` (reload fills optional default fields).
4. Reopen the warning after reload and press Escape. A further export matches the preceding export exactly, without normalization.
5. Reopen the warning and click **确认撤销**, then reload and export. The complete raw JSON matches the pre-import baseline exactly, including IDs, company projects, research, publications, delivery versions and layout settings. The undo banner disappears and the original demo status is restored.

Counts before / after import and edits / after confirmed undo: jobs **2 / 4 / 2**, company projects **3 / 6 / 3**, independent projects **2 / 3 / 2**, research **1 / 3 / 1**, publications **2 / 4 / 2**, education **1 / 2 / 1**, skills **3 / 5 / 3**, delivery versions **2 / 2 / 2**. No additional application changes were needed for this confirmation flow.
