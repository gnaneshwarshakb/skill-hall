# Skillhall – Campus Skill Exchange

Students post skills they can **teach** and skills they want to **learn**, search each other,
and send requests with contact details. All data is stored in an **Excel file** (`data/skillhall.xlsx`).

## 1. Run it

```bash
pip install -r requirements.txt
python app.py
```
Open http://127.0.0.1:5000. The Excel database is created automatically on first run.

To let other students on the campus Wi-Fi use it, change the last line of `app.py` to
`app.run(host="0.0.0.0", port=5000)` and share `http://<your-PC-IP>:5000`
(find your IP with `ipconfig` on Windows). For real deployment use a server and `gunicorn`/`waitress`.

## 2. Project structure

```
skillhall/
├── app.py              Flask backend + Excel read/write functions
├── recover_data.py     Script to read / export / back up the database
├── requirements.txt
├── data/skillhall.xlsx The database (auto-created)
├── templates/index.html
└── static/ style.css, app.js
```

## 3. Database layout (3 sheets)

| Sheet     | Columns |
|-----------|---------|
| Students  | id, name, department, year, email, phone, bio, created_at |
| Skills    | id, student_id, skill, type (teach/learn), level, description, created_at |
| Requests  | id, from_id, to_id, skill, message, status, created_at |

`student_id`, `from_id`, `to_id` point to `Students.id` – this is how the sheets are linked (like foreign keys).

## 4. How to recover / view the data

**Method A – Open in Excel:** open `data/skillhall.xlsx` (close the web app's use of it first if Excel says
it is locked). Or click **Database (Excel)** in the site and press **Download**.

**Method B – Recovery script (pandas):**
```bash
python recover_data.py                 # summary
python recover_data.py students        # all students
python recover_data.py teachers python # who teaches Python + contact details
python recover_data.py export          # CSV copies in data/export/
python recover_data.py backup          # timestamped backup of the .xlsx
```

**Method C – In your own Python code:**
```python
import pandas as pd
sheets = pd.read_excel("data/skillhall.xlsx", sheet_name=None, dtype=str)
students, skills = sheets["Students"], sheets["Skills"]
python_teachers = skills[(skills.type == "teach") & (skills.skill.str.lower() == "python")]
print(python_teachers.merge(students, left_on="student_id", right_on="id"))
```

**Method D – Restore from a backup:** stop the app, copy a `skillhall_backup_*.xlsx` over
`data/skillhall.xlsx`, start the app again.

## 5. Tips

- Make a backup regularly (`python recover_data.py backup`).
- If the site shows "Excel file is open in another program", close the file in Excel.
- Excel is great for a college project with a few hundred students. For thousands of users,
  switch to SQLite/MySQL later – only the helper functions at the top of `app.py` need to change.
- Privacy: emails/phones are visible to logged-in students; tell users this when they register.
