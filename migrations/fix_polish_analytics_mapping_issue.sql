-- Fix for Polish Analytics Mapping Issue
-- Date: 2026-04-17
-- Issue: AVG-1331A and AVG-1331C were incorrectly appearing under AVG-SL-14A

/*
PROBLEM IDENTIFIED:
===================
The polish-analytics route was creating overly broad block name mappings.
When a multi-cutter block AVG-SL-14A had notes "AVG-1331A", the system created:
  - AVG-1331A → AVG-SL-14A (correct)
  - AVG-1331 → AVG-SL-14A (incorrect - too broad!)

This caused unrelated blocks (AVG-1331C, AVG-1331B, etc.) to match the same 
consignment block, resulting in incorrect data aggregation.

ROOT CAUSE:
===========
Two problematic code patterns in polish-analytics route:

1. Base mapping creation (lines 177-183):
   ```typescript
   const base = mcNotes.replace(/[A-Z]$/i, '')
   if (base && base !== mcNotes) {
     linePolishToConsignmentMap[base.toUpperCase()] = matchingConsignmentBlock
   }
   ```
   This stripped trailing letters from notes, creating ambiguous mappings.

2. Base matching fallback (lines 258-261):
   ```typescript
   const base = lpBlockName.replace(/[A-Z]$/i, '').toUpperCase()
   matchingConsignmentBlock = linePolishToConsignmentMap[base]
   ```
   This allowed fuzzy matching that incorrectly grouped distinct blocks.

SOLUTION IMPLEMENTED:
====================
Code changes in /app/api/consignments-new/polish-analytics/route.ts:

1. Removed base mapping creation from notes:
   - Notes now map ONLY to their exact values
   - AVG-1331A maps only to "AVG-1331A", not "AVG-1331"

2. Removed base matching fallback in lookup:
   - Line polish blocks must match exactly or match quarry code variations
   - No more fuzzy "base without trailing letter" matching

RESULT:
=======
- AVG-1331A only matches to blocks explicitly marked as AVG-1331A
- AVG-1331C only matches to blocks explicitly marked as AVG-1331C
- Each block from quarry owner's serial is treated as distinct
- Consignment production data is now accurately segregated by actual blocks

TESTING:
========
After this fix:
1. Check consignment with AVG-SL-14A block
2. Verify only correct production data appears (not AVG-1331A/C unless actually linked)
3. Laputra and other polish activities should only appear under their correct blocks
*/

-- No database changes required
-- This is a code-level fix in the API route
