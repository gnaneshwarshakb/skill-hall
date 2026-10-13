"""
recover_data.py - read data back out of the Excel "database" (data/skillhall.xlsx)

Usage examples (run from the skillhall folder):
    python recover_data.py                      # summary of every sheet
    python recover_data.py students             # print all students
    python recover_data.py teachers python      # who teaches Python (with contact details)
    python recover_data.py export                # save every sheet as CSV in data/export/
    python recover_data.py backup                # timestamped copy of the .xlsx
"""
import os
import shutil
import sys
from datetime import datetime

import pandas as pd

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "skillhall.xlsx")
pd.set_option("display.width", 200)
pd.set_option("display.max_columns", None)


def load():
    # sheet_name=None -> dict of DataFrames, one per sheet
    return pd.read_excel(DB, sheet_name=None, dtype=str)


def main():
    if not os.path.exists(DB):
        sys.exit("Database not found. Start the app once (python app.py) to create it.")
    args = sys.argv[1:]
    cmd = args[0].lower() if args else "summary"
    sheets = load()

    if cmd == "summary":
        for name, df in sheets.items():
            print(f"\n=== {name}: {len(df)} rows ===")
            print(df.head())
    elif cmd in ("students", "skills", "requests"):
        print(sheets[cmd.capitalize()].to_string(index=False))
    elif cmd == "teachers":
        keyword = args[1].lower() if len(args) > 1 else ""
        skills, students = sheets["Skills"], sheets["Students"]
        t = skills[(skills["type"] == "teach") & skills["skill"].str.lower().str.contains(keyword)]
        merged = t.merge(students, left_on="student_id", right_on="id", suffixes=("", "_s"))
        print(merged[["name", "skill", "level", "department", "email", "phone"]].to_string(index=False))
    elif cmd == "export":
        out = os.path.join(os.path.dirname(DB), "export")
        os.makedirs(out, exist_ok=True)
        for name, df in sheets.items():
            df.to_csv(os.path.join(out, name.lower() + ".csv"), index=False)
        print("CSV files saved in", out)
    elif cmd == "backup":
        dest = DB.replace(".xlsx", f"_backup_{datetime.now():%Y%m%d_%H%M%S}.xlsx")
        shutil.copy2(DB, dest)
        print("Backup saved:", dest)
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
