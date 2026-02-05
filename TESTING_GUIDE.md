# Testing Guide for Timeline Application

## Overview
This guide provides step-by-step instructions for testing all features of the Timeline application, particularly the admin features and recent improvements.

## Prerequisites
- The application must be deployed and running
- You need a web browser (Chrome, Firefox, Safari, or Edge recommended)
- You should have the test file `test-batch-import.txt` available for batch import testing

## Test 1: Basic User Authentication

### Sign Up / Sign In
1. Navigate to the application URL
2. You should see the login screen with "Timeline" header
3. Options available:
   - "Continue with Google" button
   - Email and password fields
   - "Create an account" link (to switch to sign-up)
   - "Continue as Guest (View Only)" button
   - "Admin Access" button

### Test Google Sign-In:
1. Click "Continue with Google"
2. Complete Google OAuth flow
3. You should be redirected to the main timeline view
4. Header should show your email/name and "Sign out" button

### Test Email Sign-Up:
1. If already signed in, sign out
2. Click "Create an account"
3. Enter email and password
4. Click "Create account"
5. You should be signed in and redirected to timeline

### Test Guest Mode:
1. If already signed in, sign out
2. Click "Continue as Guest (View Only)"
3. You should see the timeline in read-only mode
4. No admin buttons should be visible

## Test 2: Admin Access

### Enable Admin Mode:
1. **Important**: First sign in with a regular account (Google or Email)
2. Look for "Admin Access" button at the bottom of login page
3. Click "Admin Access"
4. Enter password: `Zawe1234!`
5. Click "Admin Sign in"

### Verify Admin Panel:
After enabling admin mode, the header should show these buttons:
- **Batch Import** (Cyan colored with Upload icon)
- **Bulk Delete** (Pink colored with Trash icon)
- **Undo Batch** (Purple colored with Undo icon)
- **Archive** (Purple colored with Archive icon)

If you don't see these buttons, admin mode is not enabled.

## Test 3: Batch Import Feature

### Prepare Test File:
Use the provided `test-batch-import.txt` file or create your own with this format:
```
2024-01-15 : Your entry content here
Multiple lines are supported
~`~
2024-01-16 : Another entry
~`~
```

### Test File Upload:
1. Click "Batch Import" button in header
2. Modal should open with upload area
3. Click "Click to browse or drag and drop"
4. Select `test-batch-import.txt`
5. Modal should show:
   - Number of entries parsed
   - List of entries with dates
6. Click "Import" button
7. Progress bar should show import progress
8. Success message should appear
9. Modal closes automatically after 2 seconds
10. New entries should appear in timeline

### Test Drag and Drop:
1. Click "Batch Import" button again
2. Drag the `test-batch-import.txt` file onto the upload area
3. Drop area should highlight when file is over it
4. File should be processed automatically
5. Follow steps 5-10 from above

### Verify Imported Entries:
1. Scroll through the timeline
2. You should see entries with dates matching those in the test file
3. Each entry should have a mood rating and emoji
4. Entries should be positioned on the rollercoaster based on mood

## Test 4: Rollercoaster Visualization

### Test Date Labels:
1. Look at the rollercoaster timeline at the bottom
2. Hover over any colored dot (node)
3. You should see:
   - Date label above or below the dot (e.g., "Jan 15")
   - Time label (e.g., "3:45 PM")
   - Mood emoji (😄, 😊, 🙂, 😐, 😔, 😢)
   - Mood rating (e.g., "75/100")
4. Label color should match the dot color

### Test Smooth Curve:
1. Observe the flowing line connecting all dots
2. Line should be smooth and continuous
3. No sharp angles or jagged edges
4. Gradient coloring from cyan → purple → pink
5. Glow effect on the line

### Test Mood Visualization:
1. Higher dots = more positive mood
2. Lower dots = more negative mood
3. Middle position = neutral mood
4. The curve should clearly show mood trends over time

## Test 5: Sentiment Analysis

### Test with Positive Text:
1. Add a new entry: "I'm so happy and grateful! Today was absolutely wonderful and I feel blessed."
2. Check the mood analysis:
   - Should show positive emoji (😄 or 😊)
   - Rating should be 70-100
   - Description should be positive (e.g., "genuinely happy", "feeling blessed")

### Test with Negative Text:
1. Add a new entry: "I feel terrible and overwhelmed. Everything is going wrong and I'm so stressed."
2. Check the mood analysis:
   - Should show negative emoji (😔 or 😢)
   - Rating should be 1-40
   - Description should be negative (e.g., "stressed out", "overwhelmed with sadness")

### Test with Neutral Text:
1. Add a new entry: "Went to the store. Bought some groceries. Made dinner."
2. Check the mood analysis:
   - Should show neutral emoji (😐)
   - Rating should be 45-55
   - Description should be neutral (e.g., "balanced and steady", "contemplative")

## Test 6: Bulk Delete Feature

### Test Selective Deletion:
1. Click "Bulk Delete" button in header
2. Modal should open showing list of batch imports
3. Each batch should show:
   - Import date and time
   - Number of entries
   - Batch ID (last 8 characters)
4. Select one or more batches using checkboxes
5. Bottom should show total number of entries to be deleted
6. Click "Delete Selected Batches"
7. Confirm the deletion
8. Success message should appear
9. Selected batches should be removed from timeline

### Test Select All / Deselect All:
1. Click "Bulk Delete" again
2. Click "Select All" button
3. All checkboxes should be checked
4. Click "Deselect All"
5. All checkboxes should be unchecked

### Verify Manual Entries Protected:
1. Add a regular entry through the composer (not batch import)
2. Note the entry content
3. Perform bulk delete
4. Manual entry should still be visible in timeline
5. Only batch-imported entries should be deleted

## Test 7: Undo Batch Feature

### Test Undo:
1. After performing a batch import, note the batch details
2. Click "Undo Batch" button in header
3. Modal should show recent batch imports
4. Find the batch you just imported
5. Click the undo button for that batch
6. Confirm the undo operation
7. Entries from that batch should be removed from timeline

### Verify Undo Limits:
1. Undo feature should show recent batches
2. Very old batches may not appear in the list
3. Each batch can only be undone once

## Test 8: Archive Feature

### Test Archive Viewing:
1. Delete some entries (manual or bulk)
2. Click "Archive" button in header
3. Modal should show deleted entries
4. Each entry should show:
   - Original content
   - Deletion date
   - Original creation date
5. Entries are retained for 30 days

## Test 9: UI/UX Improvements

### Test No Jittering:
1. Click in the text entry composer
2. Type a long paragraph
3. Text area should expand smoothly
4. No jittering or jumping
5. Paste text from clipboard using the paste button
6. Height adjustment should be smooth

### Test No Flying Text:
1. Type in the text entry area
2. No words should fly around the screen
3. No black holes or portals should appear
4. No word vacuum effects

### Test No Background Animation:
1. Observe the background
2. Should be clean and static
3. No floating particles
4. No animated gradients moving around
5. Text entry box should have stable appearance

## Test 10: Entry Composer

### Test Regular Entry:
1. Type in the text area
2. Word counter should update
3. Progress bar should fill up
4. Press Enter to send (Shift+Enter for new line)
5. Entry should appear in timeline with mood analysis

### Test Image Upload:
1. Click "Add image" button
2. Select an image file
3. Image preview should appear
4. Click send
5. Entry should be created with image

### Test Paste Button:
1. Copy some text to clipboard
2. Click the clipboard/paste button
3. Text should be inserted at cursor position

## Expected Behaviors

### Mood Rating Scale:
- 1-20: Severely negative (😢, devastating emotions)
- 21-40: Moderately negative (😔, stressed/frustrated)
- 41-60: Neutral (😐, balanced/reflective)
- 61-80: Moderately positive (😊, happy/content)
- 81-100: Highly positive (😄, thrilled/ecstatic)

### Admin Features Access:
- Only visible when admin mode is enabled
- Requires two-step authentication:
  1. Regular account login
  2. Admin password entry

### Batch Import Format:
- Text files only (.txt)
- Format: YYYY-MM-DD : content
- Entries separated by ~`~ on its own line
- Multiple lines allowed per entry

## Troubleshooting

### Admin buttons not showing:
- Ensure you're signed in with a regular account first
- Click "Admin Access" and enter password: `Zawe1234!`
- Refresh the page if needed

### Batch import not working:
- Check file format matches exactly
- Ensure dates are in YYYY-MM-DD format
- Verify separator is ~`~ (tilde backtick tilde)
- Check file extension is .txt

### Entries not showing mood:
- New entries should have mood analysis automatically
- Old entries will have mood calculated on load
- Refresh page if mood is missing

### Rollercoaster not showing dates:
- Hover over the colored dots
- Date labels appear on hover only
- Make sure you're hovering directly over a dot

## Success Criteria

✅ All admin buttons visible when logged in as admin
✅ Batch import accepts file upload and drag-drop
✅ Bulk delete preserves manual entries
✅ Undo batch can reverse recent imports
✅ No jittering or breathing effects in text area
✅ No flying text or background particles
✅ Sentiment ratings are accurate and descriptive
✅ Rollercoaster shows smooth flowing line
✅ Date labels appear on hover over nodes
✅ All features work smoothly without errors

## Performance Notes

- Batch imports process entries with rate limiting
- Delay starts at 50ms, adjusts based on success/failure
- Large batches may take a minute or two
- Progress bar shows real-time progress
- Archive retains last 30 deleted entries for 30 days
