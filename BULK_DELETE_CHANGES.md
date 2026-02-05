# Bulk Delete Feature Update

## Summary

Updated the bulk delete feature to **only delete batch-imported entries**, not all timeline entries. This ensures manually created entries are protected from accidental deletion.

## Changes Made

### 1. Updated `bulkDeleteChats` function (src/lib/chats.ts)

**Before:**
- Deleted entries based on time range (last 7 days, last 30 days, or all)
- Would delete ANY entries within the time range
- Parameter: `days?: number`

**After:**
- Only deletes entries with a `batchId` (batch-imported entries)
- Can target specific batches or all batch-imported entries
- Parameter: `batchIds?: string[]`
- Manual entries (without batchId) are NEVER deleted

### 2. Added `getBatchEntryCounts` function (src/lib/chats.ts)

New utility function that:
- Counts actual entries for each batch
- Returns Map<batchId, count>
- Used to show accurate counts in the UI

### 3. Completely redesigned BulkDeleteModal (src/components/BulkDeleteModal.tsx)

**Before:**
- Radio buttons for time ranges (Last 7 days, Last 30 days, All)
- Simple confirmation

**After:**
- Lists all batch imports with details:
  - Import date and time
  - Number of entries in each batch
  - Batch ID (last 8 characters)
- Checkboxes to select which batches to delete
- "Select All" / "Deselect All" buttons
- Shows total count of entries that will be deleted
- Better confirmation messaging

### 4. Updated Documentation

- **ADMIN_ACCESS.md**: Added detailed explanation of bulk delete behavior
- **README.md**: Added "Important: Bulk Delete Behavior" section

## Key Features

✅ **Safety**: Manual entries are protected - only batch imports can be deleted
✅ **Selective**: Choose specific batches or all batches
✅ **Transparent**: See exactly how many entries in each batch
✅ **Reversible**: All deletions are archived for 30 days
✅ **Clean**: After 30 days in archive, entries are permanently deleted

## Testing

Logic verified with test cases:
- Only entries with `batchId` are deleted ✓
- Manual entries (no `batchId`) are preserved ✓
- Selective deletion by batchId works ✓
- Entry counts are accurate ✓

## UI Flow

1. Admin clicks "Bulk Delete" button
2. Modal loads and displays all batch imports
3. Admin selects batches to delete (checkboxes)
4. Summary shows total entries that will be deleted
5. Admin confirms deletion
6. Entries are archived and then deleted
7. Success message shows count of deleted entries
