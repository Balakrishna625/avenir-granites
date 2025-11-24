/**
 * OCR Parser for Line Polish Data Entry
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
  console.log('Starting OCR parsing...');
  console.log('Raw OCR text:', ocrText);
  
  const results: ParsedLinePolishData[] = [];
  
  // Split into lines
  const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('Total lines:', lines.length);
  
  // Extract date (look for patterns like "04/11", "Date", etc.)
  let date = '';
  for (const line of lines) {
    // Match patterns like "04/11" or "04/11/2025"
    const dateMatch = line.match(/(\d{2})\/(\d{2})(?:\/(\d{2,4}))?/);
    if (dateMatch) {
      const day = dateMatch[1];
      const month = dateMatch[2];
      const year = dateMatch[3] ? (dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]) : new Date().getFullYear().toString();
      date = `${year}-${month}-${day}`;
      console.log('Found date:', date);
      break;
    }
  }
  
  if (!date) {
    date = new Date().toISOString().split('T')[0];
    console.log('No date found, using today:', date);
  }
  
  // Extract workers and hours (look for patterns like "3 workers", "12 hours", "Workers: 3")
  let workers = 3; // default
  let totalHours = 12; // default
  
  for (const line of lines) {
    const workersMatch = line.match(/(?:Workers?[:\s]+)?(\d+)(?:\s+workers?)?/i);
    const hoursMatch = line.match(/(?:Hours?[:\s]+)?(\d+)(?:\s+hours?)?/i);
    
    if (workersMatch && parseInt(workersMatch[1]) > 0 && parseInt(workersMatch[1]) < 20) {
      workers = parseInt(workersMatch[1]);
    }
    if (hoursMatch && parseInt(hoursMatch[1]) > 0 && parseInt(hoursMatch[1]) <= 24) {
      totalHours = parseInt(hoursMatch[1]);
    }
  }
  
  // Detect shifts by looking for section separators or shift indicators
  const shiftSections = detectShiftSections(lines);
  
  if (shiftSections.length === 0) {
    // Single section, default to morning shift
    const activities = extractActivities(lines);
    const totals = calculateTotals(activities);
    
    results.push({
      date: date || new Date().toISOString().split('T')[0],
      shift: 'A',
      workers,
      totalHours,
      activities,
      totalSlabs: totals.slabs,
      totalSqFt: totals.sqFt
    });
  } else {
    // Multiple sections detected
    shiftSections.forEach((section, index) => {
      const activities = extractActivities(section.lines);
      const totals = calculateTotals(activities);
      
      results.push({
        date: date || new Date().toISOString().split('T')[0],
        shift: section.shift || (index === 0 ? 'A' : 'B'),
        workers,
        totalHours,
        activities,
        totalSlabs: totals.slabs,
        totalSqFt: totals.sqFt
      });
    });
  }
  
  return results;
}

/**
 * Detect shift sections in the OCR text
 */
function detectShiftSections(lines: string[]): Array<{shift: 'A' | 'B', lines: string[]}> {
  const sections: Array<{shift: 'A' | 'B', lines: string[]}> = [];
  let currentSection: string[] = [];
  let currentShift: 'A' | 'B' = 'A';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for shift indicators
    if (line.match(/morning|AM|shift\s*A/i)) {
      if (currentSection.length > 0) {
        sections.push({ shift: currentShift, lines: currentSection });
      }
      currentShift = 'A';
      currentSection = [];
      continue;
    }
    
    if (line.match(/evening|PM|shift\s*B|night/i)) {
      if (currentSection.length > 0) {
        sections.push({ shift: currentShift, lines: currentSection });
      }
      currentShift = 'B';
      currentSection = [];
      continue;
    }
    
    // Check for total indicators (suggests end of section)
    if (line.match(/total\s*(?:slabs?|sft|sqft)/i)) {
      currentSection.push(line);
      // Look ahead a few lines to see if there's more data
      let hasMoreData = false;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (isActivityLine(lines[j])) {
          hasMoreData = true;
          break;
        }
      }
      if (hasMoreData) {
        sections.push({ shift: currentShift, lines: currentSection });
        currentShift = currentShift === 'A' ? 'B' : 'A';
        currentSection = [];
      }
      continue;
    }
    
    currentSection.push(line);
  }
  
  if (currentSection.length > 0) {
    sections.push({ shift: currentShift, lines: currentSection });
  }
  
  return sections;
}

/**
 * Check if a line looks like an activity entry
 */
function isActivityLine(line: string): boolean {
  // Look for patterns: block name + activity + numbers
  const patterns = [
    /[A-Z]+-\d+[A-Z]?\s+.*\d+/i,  // AVG-24C ... 25
    /\d+\s*[xX×]\s*\d+/,           // 114 x 36
    /\d+\.\d{2,}/                  // 712.500
  ];
  
  return patterns.some(pattern => pattern.test(line));
}

/**
 * Extract activities from lines of text
 */
function extractActivities(lines: string[]): ParsedActivity[] {
  const activities: ParsedActivity[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip total/summary lines
    if (line.match(/total|sum|grand/i)) continue;
    
    // Pattern 1: Complete line with all info
    // Example: "AVG-24C SG E-LAPOTRA 25 114x36 712.500"
    const fullPattern = /([A-Z]+-?\d+[A-Z]?)\s+.*?([EG][-\s]*(?:LAPO?TRA|POLISH|GRINDING))\s+(\d+)\s+\d+\s*[xX×]\s*\d+\s+([\d,]+\.?\d*)/i;
    const fullMatch = line.match(fullPattern);
    
    if (fullMatch) {
      const blockName = normalizeBlockName(fullMatch[1]);
      const activityType = normalizeActivityType(fullMatch[2]);
      const slabs = parseInt(fullMatch[3]);
      const sqFt = parseFloat(fullMatch[4].replace(/,/g, ''));
      
      activities.push({ blockName, activityType, slabs, sqFt });
      continue;
    }
    
    // Pattern 2: Block name and activity in one line, numbers in next lines
    const blockPattern = /([A-Z]+-?\d+[A-Z]?)\s+.*?([EG][-\s]*(?:LAPO?TRA|POLISH|GRINDING))/i;
    const blockMatch = line.match(blockPattern);
    
    if (blockMatch) {
      const blockName = normalizeBlockName(blockMatch[1]);
      const activityType = normalizeActivityType(blockMatch[2]);
      
      // Look for numbers in the same line or next few lines
      let slabs = 0;
      let sqFt = 0;
      
      // Check same line
      const numberMatch = line.match(/(\d+)\s+\d+\s*[xX×]\s*\d+\s+([\d,]+\.?\d*)/);
      if (numberMatch) {
        slabs = parseInt(numberMatch[1]);
        sqFt = parseFloat(numberMatch[2].replace(/,/g, ''));
      } else {
        // Check next lines
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j];
          const nextMatch = nextLine.match(/(\d+)\s+\d+\s*[xX×]\s*\d+\s+([\d,]+\.?\d*)/);
          if (nextMatch) {
            slabs = parseInt(nextMatch[1]);
            sqFt = parseFloat(nextMatch[2].replace(/,/g, ''));
            break;
          }
        }
      }
      
      if (slabs > 0 && sqFt > 0) {
        activities.push({ blockName, activityType, slabs, sqFt });
      }
    }
  }
  
  return activities;
}

/**
 * Normalize block name (AVG-24C, AVG-2B, etc.)
 */
function normalizeBlockName(raw: string): string {
  // Remove extra spaces and normalize format
  let normalized = raw.toUpperCase().replace(/\s+/g, '');
  
  // Ensure hyphen exists (AVG24C → AVG-24C)
  if (!normalized.includes('-')) {
    const match = normalized.match(/([A-Z]+)(\d+[A-Z]?)/);
    if (match) {
      normalized = `${match[1]}-${match[2]}`;
    }
  }
  
  return normalized;
}

/**
 * Normalize activity type
 */
function normalizeActivityType(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z]/g, '');
  
  if (cleaned.includes('LAPO') || cleaned.includes('LAPUTRA')) {
    return 'S/G Laputra';
  }
  if (cleaned.includes('POLISH')) {
    return 'S/G Polish';
  }
  if (cleaned.includes('GRIND')) {
    return 'S/G Grinding';
  }
  if (cleaned.includes('CUTTING')) {
    return 'S/G Cutting';
  }
  
  return 'S/G Laputra'; // default
}

/**
 * Calculate totals for activities
 */
function calculateTotals(activities: ParsedActivity[]): { slabs: number; sqFt: number } {
  return activities.reduce(
    (acc, activity) => ({
      slabs: acc.slabs + activity.slabs,
      sqFt: acc.sqFt + activity.sqFt
    }),
    { slabs: 0, sqFt: 0 }
  );
}
