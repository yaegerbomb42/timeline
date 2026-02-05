# Admin Access Guide

## How to Access Admin Features

1. **First, sign in with your regular account:**
   - Go to the Timeline app
   - Sign in with Google or Email/Password

2. **Enable Admin Mode:**
   - On the login page, look for "Admin Access" button at the bottom
   - Click "Admin Access"
   - Enter the admin password: `Zawe1234!`
   - Click "Admin Sign in"

3. **Admin Features Available:**

   Once in admin mode, you'll see additional buttons in the header:
   
   - **Batch Import** (Cyan button with Upload icon)
     - Upload timeline entries from a .txt file
     - File format:
       ```
       YYYY-MM-DD : Entry content here
       Multiple lines are OK
       ~`~
       2025-01-02 : Another entry
       ~`~
       ```
   
   - **Bulk Delete** (Pink button with Trash icon)
     - Delete multiple entries at once
     - Options: Last 7 days, Last 30 days, or All entries
     - Entries are archived before deletion
   
   - **Undo Batch** (Purple button with Undo icon)
     - Undo recent batch imports
   
   - **Archive** (Purple button with Archive icon)
     - View deleted entries (last 30 retained)

## Layout Structure

The app now displays three main sections vertically:

1. **Top - Entry Composer**
   - Add new timeline entries
   - Upload images with entries

2. **Middle - Timeline AI**
   - Ask questions about your timeline
   - Get AI-powered insights

3. **Bottom - Timeline Rollercoaster**
   - Visual representation of your timeline
   - Mood-based positioning: higher dots = more positive mood
   - Color-coded by sentiment:
     - Green: Positive mood
     - Pink: Negative mood  
     - Cyan: Neutral mood

## Mood Rating System

All entries are analyzed for sentiment and assigned:
- **Rating**: 1-100 scale (1 = most negative, 100 = most positive)
- **Description**: Sophisticated mood descriptions like "genuinely happy", "peaceful", "stressed out"
- **Emoji**: Visual mood indicator
- **Color**: Visual mood representation on timeline

The rollercoaster visualization aligns these mood ratings so you can see emotional patterns over time.
