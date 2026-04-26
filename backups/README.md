# Andaluma Backups

This folder contains automatic weekly backups of all Firebase data.

Backups run every Sunday at midnight UTC via GitHub Actions.

Each file contains:
- All expenses
- All trips  
- All tasks

To restore: download the file and import into Firebase Console → Data → ⋮ → Import JSON.
