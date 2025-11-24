/**
 * OCR Parser for Line Polish Data Entry - Simplified Version
 * Parses text extracted from handwritten line polish reports
 */

export interface ParsedLinePolishData {
  date: string;
  shift: 'A' | 'B'; // A = Morning, B = Evening  
  workers: number;
  totalHours: number;
  activities: ParsedActivity[];
  totalSlabs: number;
  totalSqFt: number;
}

export interface ParsedActivity {
  blockName: string;
  activityType: string;
  slabs: number;
  sqFt: number;
}

/**
 * Parse OCR text to extract Line Polish data
 */
export function parseLinePolishOCR(ocrText: string): ParsedLinePolishData[] {
  console.log('=== Starting OCR Parsing ===');
  console.log('Raw OCR text:', ocrText);
  
  const results: ParsedLinePolishData[] = [];
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Extract date (04/11 format)
  let date = new Date().toISOString().split('T')[0];
  for (const line of lines) {
    const dateMatch = line.match(/(\d{2})\/(\d{2})/);
    if (dateMatch) {
      const day = dateMatch[1];
      const month = dateMatch[2];
      const year = new Date().getFullYear();
      date = `${year}-${month}-${day}`;
      console.log('✅ Found date:', date);
      break;
    }
  }
  
  // Detect shift (Day/Morning vs Night/Evening)
  let shift: 'A' | 'B' = 'A';
  const shiftText = lines.join(' ').toLowerCase();
  if (shiftText.includes('night') || shiftText.includes('evening') || shiftText.includes('pm')) {
    shift = 'B';
  }
  console.log('✅ Detected shift:', shift === 'A' ? 'Morning (A)' : 'Night (B)');
  
  // Extract hours (look for "12 Hours" or "12 Hourly")
  let totalHours = 12; // default
  for (const line of lines) {
    const hoursMatch = line.match(/(\d+)\s*hour/i);
    if (hoursMatch) {
      totalHours = parseInt(hoursMatch[1]);
      console.log('✅ Found hours:', totalHours);
      break;
    }
  }
  
  // Default workers
  const workers = 3;
  
  // Parse activities
  const activities: ParsedActivity[] = [];
  
  // Skip certain lines that are not block names
  const skipPatterns = [
    /hours?/i,           // Skip "12 Hours", "6 hours"
    /day|night/i,        // Skip "Day", "Night"
    /am|pm/i,            // Skip time indicators
    /total/i,            // Skip total lines
    /^\d+\/\d+$/,        // Skip date lines
    /^\d{1,2}[Hh]$/,     // Skip "12H", "6H" patterns
    /^[A-Z]{2,3}$/       // Skip "SG", "BP", "BPL" alone
  ];
  
  const isSkippableLine = (line: string): boolean => {
    return skipPatterns.some(pattern => pattern.test(line));
  };
  
  console.log('🔍 Starting activity extraction...');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip if line matches skip patterns
    if (isSkippableLine(line)) {
      console.log(`⏭️  Skipping line: "${line}"`);
      continue;
    }
    
    // Look for block name patterns: 696-A, 25-A, 23-A, 02, 696 B, etc.
    // Must be 2-4 digits followed by optional hyphen/space and letter
    const blockMatch = line.match(/^(\d{2,4})[-\s]?([A-Z])$/);
    
    if (blockMatch) {
      const blockNumber = blockMatch[1];
      const blockLetter = blockMatch[2];
      const blockName = `AVG-${blockNumber}${blockLetter}`;
      
      console.log(`✅ Found potential block: ${blockName} from line "${line}"`);
      
      // Now look for activity type in nearby lines (within 2 lines before or after)
      let activityType = 'S/G Polish'; // default
      let foundActivity = false;
      
      const searchRange = [
        ...(i > 1 ? [lines[i-2], lines[i-1]] : i > 0 ? [lines[i-1]] : []),
        line,
        ...(i < lines.length - 2 ? [lines[i+1], lines[i+2]] : i < lines.length - 1 ? [lines[i+1]] : [])
      ];
      
      for (const searchLine of searchRange) {
        if (searchLine.match(/granding|grinding/i)) {
          activityType = 'S/G Grinding';
          foundActivity = true;
          console.log(`  → Found activity: Grinding`);
          break;
        } else if (searchLine.match(/polish/i) && !searchLine.match(/grinding/i)) {
          activityType = 'S/G Polish';
          foundActivity = true;
          console.log(`  → Found activity: Polish`);
          break;
        } else if (searchLine.match(/laputra|lapotra/i)) {
          activityType = 'S/G Laputra';
          foundActivity = true;
          console.log(`  → Found activity: Laputra`);
          break;
        }
      }
      
      // Look for slabs and sqft in the next 3-5 lines
      let slabs = 0;
      let sqFt = 0;
      
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const dataLine = lines[j];
        
        // Stop if we hit another block name
        if (dataLine.match(/^\d{2,4}[-\s]?[A-Z]$/) || dataLine.match(/total/i)) {
          break;
        }
        
        // Look for slab count (typically 20-150 range, standalone number)
        if (slabs === 0) {
          const slabMatch = dataLine.match(/^(\d{1,3})$/);
          if (slabMatch) {
            const num = parseInt(slabMatch[1]);
            if (num >= 5 && num <= 200) {
              slabs = num;
              console.log(`  → Found slabs: ${slabs}`);
            }
          }
        }
        
        // Look for sqft (typically > 100, with decimal)
        if (sqFt === 0) {
          const sqftMatch = dataLine.match(/(\d{3,5}(?:\.\d+)?)/);
          if (sqftMatch) {
            const num = parseFloat(sqftMatch[1]);
            if (num >= 100 && num < 50000) {
              sqFt = num;
              console.log(`  → Found sqft: ${sqFt}`);
            }
          }
        }
        
        // If we found both, stop searching
        if (slabs > 0 && sqFt > 0) break;
      }
      
      // Only add if we have at least one number
      if (slabs > 0 || sqFt > 0) {
        activities.push({
          blockName,
          activityType,
          slabs: slabs || 0,
          sqFt: sqFt || 0
        });
        console.log(`✅ Added activity: ${blockName} | ${activityType} | ${slabs} slabs | ${sqFt} sqft`);
      } else {
        console.log(`⚠️  Skipping ${blockName} - no valid numbers found`);
      }
    }
  }
  
  // Calculate totals
  const totalSlabs = activities.reduce((sum, a) => sum + a.slabs, 0);
  const totalSqFt = activities.reduce((sum, a) => sum + a.sqFt, 0);
  
  console.log('=== Parsing Complete ===');
  console.log('Total activities found:', activities.length);
  console.log('Total slabs:', totalSlabs);
  console.log('Total sqft:', totalSqFt);
  
  if (activities.length > 0) {
    results.push({
      date,
      shift,
      workers,
      totalHours,
      activities,
      totalSlabs,
      totalSqFt
    });
  }
  
  return results;
}
