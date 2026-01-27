# How to Set Up Google Sheets Database

## Step 1: Create Your Google Sheet

1. Go to **sheets.google.com**
2. Click **+ Blank** to create a new spreadsheet
3. Name it: **"Student Marks System"**

## Step 2: Create the Sheet Structure

Create 6 tabs (sheets) by clicking the **+** button at the bottom:

### Tab 1: Students
**Column headers (Row 1):**
- A1: `id`
- B1: `name`
- C1: `class_id`

### Tab 2: Classes
**Column headers (Row 1):**
- A1: `id`
- B1: `name`

**Add this data (Row 2-4):**
- A2: `cls_1` | B2: `JSS 1`
- A3: `cls_2` | B3: `JSS 2`
- A4: `cls_3` | B4: `JSS 3`

### Tab 3: Subjects
**Column headers (Row 1):**
- A1: `id`
- B1: `name`

**Add this data (Row 2-5):**
- A2: `subj_1` | B2: `Integrated Science`
- A3: `subj_2` | B3: `Agriculture`
- A4: `subj_3` | B4: `Mathematics`
- A5: `subj_4` | B5: `English Language`

### Tab 4: Terms
**Column headers (Row 1):**
- A1: `id`
- B1: `name`

**Add this data (Row 2-4):**
- A2: `term_1` | B2: `1st Term`
- A3: `term_2` | B3: `2nd Term`
- A4: `term_3` | B4: `3rd Term`

### Tab 5: Configurations
**Column headers (Row 1):**
- A1: `id`
- B1: `class_id`
- C1: `subject_id`
- D1: `term_id`
- E1: `test_marked_over`
- F1: `max_added_marks`

(Leave empty - you'll add via the app)

### Tab 6: Marks
**Column headers (Row 1):**
- A1: `id`
- B1: `student_id`
- C1: `class_id`
- D1: `subject_id`
- E1: `term_id`
- F1: `raw_score`
- G1: `added_mark`

(Leave empty - you'll add via the app)

## Step 3: Make Sheet Public for Editing

1. Click the green **Share** button (top right)
2. Click **"Change to anyone with the link"**
3. Select **"Editor"** from the dropdown (not "Viewer")
4. Click **Done**

## Step 4: Copy the Sheet URL

1. Copy the **entire URL** from your browser address bar
2. It should look like: `https://docs.google.com/spreadsheets/d/1AbC...XyZ/edit`

## Step 5: Enter URL in the App

1. Open `setup.html` in your browser
2. Paste the Google Sheets URL
3. Click **Save**
4. Now open `index.html` - it will use Google Sheets!

---

## ✅ Benefits of This Setup

- **Access from anywhere** - Any computer with internet
- **Direct editing** - Open Google Sheets to view/edit data
- **Automatic backup** - Google saves everything
- **No localStorage issues** - No more browser data problems
- **Shareable** - Can give access to other teachers if needed

---

## 🔒 Security Note

The sheet is set to "Anyone with link can edit" - only share the link with people you trust. If you want better security, we can upgrade to Google Apps Script later.
