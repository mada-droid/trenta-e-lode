# Trenta e Lode: data folder guide for AI assistants

This folder is the data folder of the desktop app **Trenta e Lode** (a study planner). The app copies this file here as `CLAUDE.md` so that Claude Code knows what to do; ChatGPT, Gemini and claude.ai receive the same instructions inside the prompt the app copies to the clipboard.

## Contents

| Folder or file | Content |
|---|---|
| `Subjects/<subject>/<topic>/…` | Files the student uploaded from the **Materials** page, one folder per topic. |
| `Subjects/<subject>/subject.json` | Extra data for the subject (topics, videos, flashcards, plan…). The app reads it when the student presses **Reload**. |
| `Requests/*.md` | Requests created by the **Ask an AI** buttons. |
| `Offline/` | Prayer times for the student's city, adhkar and Qur'an passages (downloaded by the app). Do not edit. |
| `Media/` | Focus-mode background videos. Do not edit. |

Without any AI, the app already builds a basic plan from the files (one study task per file, practice and review per topic). An AI makes it much better: real topics, objectives, exam-style questions, verified videos, flashcards and a smarter calendar.

## How to process a request (`Requests/<date>_<subject>.md`)

1. **Read the request** and the files it lists. Paths are relative to the subject folder.
2. **Derive the topics** from the files: a short title, what the student must know (`know`), the typical exam question (`exam`) and the resources (the uploaded files).
3. **Find YouTube lectures** in the preferred language written in the request: one main video plus 1–3 alternatives per topic.
   - Verify every ID, e.g. `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<ID>&format=json` must answer 200.
   - Record the title, channel and duration.
4. **Update `Subjects/<subject>/subject.json`.** Create it if missing and merge with what is there: never delete the student's tasks, videos or cards.
   - Add `plan` entries from tomorrow on, respecting the daily goal across all subjects (busy days are listed in the request), lighter on Sundays.
   - If the student is Muslim and the prayer table exists (`Offline/prayer-times.json`), leave the two ʿĪd days free (Hijri month 10 day 1 and month 12 day 10).
   - Add `exams` if the student gave dates.
   - Add every processed file to `processed`.
5. Add flashcards (`cards`) for definitions, theorems and formulas. Use LaTeX between `$…$`.
6. Reply with a short summary. The student presses **Reload** in the Materials page.

## The subject.json format

```json
{
  "processed": ["Trees/lecture3.pdf"],
  "exams": [{ "id": "e1", "t": "Written exam", "date": "2027-06-18", "oral": "2027-06-25" }],
  "phases": [{ "id": "f1", "t": "Phase 1 · Basics", "from": "2027-03-01", "to": "2027-03-21", "color": "#7ea6d8", "goals": ["…"] }],
  "topics": [{ "id": "trees", "n": 1, "t": "Binary trees", "exam": "What the exam asks", "know": ["I can…"],
               "lez": ["r_trees"], "es": [{ "r": "r_ex", "p": [3, 5] }], "color": "#7ea6d8" }],
  "resources": { "r_trees": { "t": "Lecture 3 – Trees", "f": "Trees/lecture3.pdf" } },
  "plan": { "2027-03-02": { "note": "Kick-off", "tasks": [["theory", "trees", 2, "Lecture 3: binary trees", ["r_trees:1-12"], "v_trees"]] } },
  "videos": [{ "id": "v_trees", "topic": "trees", "t": "Binary trees", "yt": [["<11-char videoId>", "Video title", "Channel", "18:20"]] }],
  "cards": [["trees", "Height of a complete binary tree with $n$ nodes?", "$\\lfloor \\log_2 n \\rfloor$"]],
  "sims": [{ "id": "m1", "t": "Mock exam 1", "minutes": 120, "parts": [["Exercise 1", 8, "Statement…", "Solution…"]] }]
}
```

A plan task is `[kind, topicId, pomodoros, title, resources[], videoId]`:

- `kind` is one of `theory`, `practice`, `video`, `mock`, `review`, `cards`, `oral`, `rest`.
- A resource is `"<key>"` or `"<key>:<firstPage>-<lastPage>"` (a key of `resources`).
- `f` paths in `resources` are relative to the subject folder.
