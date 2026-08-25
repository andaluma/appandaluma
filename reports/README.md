# Reports

Standalone report generators for the money data. Isolated from the main app
on purpose — the app itself has no build step, and this doesn't add one to it.

## Spending by category

```
npm install        # first time only
node spending-by-category.js [path-to-backup.json] [year]
```

With no arguments, uses the newest file in `../backups/` and the current
year. Writes an .xlsx to `output/` (gitignored — re-run any time, nothing
here needs to be committed).

## Why this exists

The app stores money data in two separate Firebase nodes: `expenses`
(individually logged transactions) and `fixedExpenses` (recurring items —
subscriptions, family support — tracked and computed separately, and never
written into `expenses`). A report built from `expenses` alone will silently
be missing every subscription and recurring payment. This script requires
both nodes and prints a loud warning (and stamps it into the sheet's
footnote) if a backup is missing `fixedExpenses`, instead of quietly
producing a wrong report.
