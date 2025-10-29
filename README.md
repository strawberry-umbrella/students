Student Presence Tracker
========================

A simple, fast, local web app to track which students are present in the morning and whether they are in class between classes. No server needed — just open `index.html`.

Features
--------
- Morning Attendance: quickly mark all present/absent or per-student.
- Between Classes: see only students present for the day; mark who is in class now; filter to show only missing; export missing list.
- Roster Management: add/remove students, import CSV, export CSV. Data is saved in your browser (localStorage).

Getting Started (Windows)
-------------------------
1. Open the folder:
   - `C:\Users\strum\OneDrive\Documents\GitHub\students\`
2. Double-click `index.html` to open it in your default browser (Edge/Chrome).
   - If your browser blocks local file downloads for CSV export, use Chrome or Edge.

Daily Flow
---------
1. Morning
   - Go to the "Morning Attendance" tab.
   - Use "Mark All Present" (or "Mark All Absent") then adjust individuals.
   - Click "Save Morning Check" (saves automatically, but gives confirmation).
2. Between Classes
   - Go to the "Between Classes" tab.
   - Only students marked present show here.
   - Toggle "In class now". Use "Show Missing Only" to focus on students not in class.
   - "Export Missing List" to get a CSV you can print or share.

Roster
------
- Add Student: enter Name and Grade/Class, then Add.
- Remove: use the Remove button on a student card.
- Import CSV: choose a `.csv` with a header row containing `Name` (required) and `Grade` (optional). Example:

```
Name,Grade
Alex Johnson,10A
Briana Lee,10A
```

- Export CSV: downloads your current roster.
- Load Sample Roster: resets to a small sample list.

Data Storage
------------
- Data is stored in your browser using localStorage.
  - Roster: `spt_roster_v1`
  - Attendance by date: `spt_attendance_by_date_v1` with keys like `YYYY-MM-DD`.
- Clearing browser data will remove this information. Export CSV periodically for backup.

Notes
-----
- Timestamps show the last time a student was marked "In class now".
- This is a single-file static app and works offline once opened.

Privacy
-------
- All data stays on your device/browser; no network calls are made.

