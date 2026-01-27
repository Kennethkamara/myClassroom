# Prompt for ChatGPT to Set Up Google Sheets Database

## Copy this entire prompt and send to ChatGPT:

---

**PROMPT START:**

Create a Google Sheet called "Student Marks System" with the following exact structure:

**Tab 1 - Students:**
- Column headers in row 1: id, name, class_id
- Leave rows 2+ empty

**Tab 2 - Classes:**
- Column headers in row 1: id, name
- Data rows:
  - Row 2: cls_1, JSS 1
  - Row 3: cls_2, JSS 2
  - Row 4: cls_3, JSS 3

**Tab 3 - Subjects:**
- Column headers in row 1: id, name
- Data rows:
  - Row 2: subj_1, Integrated Science
  - Row 3: subj_2, Agriculture
  - Row 4: subj_3, Mathematics
  - Row 5: subj_4, English Language

**Tab 4 - Terms:**
- Column headers in row 1: id, name
- Data rows:
  - Row 2: term_1, 1st Term
  - Row 3: term_2, 2nd Term
  - Row 4: term_3, 3rd Term

**Tab 5 - Configurations:**
- Column headers in row 1: id, class_id, subject_id, term_id, test_marked_over, max_added_marks
- Leave rows 2+ empty

**Tab 6 - Marks:**
- Column headers in row 1: id, student_id, class_id, subject_id, term_id, raw_score, added_mark
- Leave rows 2+ empty

After creating the sheet:
1. Share it with "Anyone with the link can EDIT"
2. Give me the shareable link

**PROMPT END:**

---

## What to Do Next:

1. ✅ **Copy** the prompt above (between PROMPT START and PROMPT END)
2. ✅ **Paste** it into ChatGPT
3. ✅ ChatGPT will create the Google Sheet and give you the link
4. ✅ **Copy the link** ChatGPT gives you
5. ✅ **Open** `setup.html` in your browser
6. ✅ **Paste the link** and click Save
7. ✅ **Done!** Open `index.html` to start using it

---

## Alternative: If ChatGPT Can't Create the Sheet

If ChatGPT says it can't create Google Sheets, you can:

**Use this shorter manual method (2 minutes):**
1. Go to sheets.google.com
2. Create new blank sheet
3. Name it "Student Marks System"
4. Create 6 tabs by clicking the + button 6 times
5. Rename tabs: Students, Classes, Subjects, Terms, Configurations, Marks
6. In each tab, just type the column headers in row 1:
   - **Students:** id, name, class_id
   - **Classes:** id, name (then add the 3 JSS classes in rows 2-4)
   - **Subjects:** id, name (then add 4 subjects in rows 2-5)
   - **Terms:** id, name (then add 3 terms in rows 2-4)
   - **Configurations:** id, class_id, subject_id, term_id, test_marked_over, max_added_marks
   - **Marks:** id, student_id, class_id, subject_id, term_id, raw_score, added_mark
7. Click Share → "Anyone with link can edit"
8. Copy the URL and paste in `setup.html`

Done in 2 minutes! 🎉
