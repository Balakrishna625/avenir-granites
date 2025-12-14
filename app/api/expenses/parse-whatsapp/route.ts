import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/expenses/parse-whatsapp
 * Parse WhatsApp message text to extract expense data
 * 
 * Request body: { message: string }
 * Response: { amount: number, description: string, date: string, confidence: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message text is required' },
        { status: 400 }
      );
    }

    // Parse the WhatsApp message
    const parsed = parseWhatsAppMessage(message);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Error parsing WhatsApp message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse message' },
      { status: 500 }
    );
  }
}

interface ParsedExpense {
  amount: number | null;
  description: string;
  date: string | null;
  vendor: string | null;
  confidence: number;
}

/**
 * Parse WhatsApp message text to extract expense information
 * Handles various natural language formats:
 * - "Paid 5000 for diesel"
 * - "Spent Rs. 12,500 at Home Depot on 15th Dec"
 * - "₹3000 electricity bill"
 * - "Bought materials 25000"
 */
function parseWhatsAppMessage(message: string): ParsedExpense {
  let amount: number | null = null;
  let description = message.trim();
  let date: string | null = null;
  let vendor: string | null = null;
  let confidence = 0.5; // Base confidence

  // Amount extraction patterns (supports Rs, ₹, Indian comma format)
  const amountPatterns = [
    /(?:paid|spent|cost|bill|amount)\s+(?:Rs\.?\s*|₹\s*|INR\s*)?([\d,]+(?:\.\d{1,2})?)/gi, // "paid 5000", "spent Rs 5000"
    /(?:Rs\.?\s*|₹\s*|INR\s*)([\d,]+(?:\.\d{1,2})?)/gi, // "Rs 5000", "₹ 12,500"
    /\b([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|₹|INR)\b/gi, // "5000 Rs", "12500 ₹"
    /\b([\d,]+(?:\.\d{1,2})?)\b/g, // Fallback: any number (lowest priority)
  ];

  for (const pattern of amountPatterns) {
    const matches = Array.from(message.matchAll(pattern));
    if (matches.length > 0) {
      // Take the first match, remove commas and parse
      const amountStr = matches[0][1].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        confidence += 0.3; // Increase confidence if amount found
        break;
      }
    }
  }

  // Date extraction patterns
  const datePatterns = [
    // "15th Dec", "15 December", "15/12", "15-12-2024"
    /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/gi,
    /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/g, // 15/12 or 15/12/2024
    /(today|yesterday)/gi
  ];

  for (const pattern of datePatterns) {
    const match = message.match(pattern);
    if (match) {
      date = parseDate(match[0]);
      if (date) {
        confidence += 0.1;
        break;
      }
    }
  }

  // Vendor extraction (look for "at", "from", "to" patterns)
  const vendorPatterns = [
    /(?:at|from|to)\s+([A-Z][A-Za-z\s&]+?)(?:\s+on|\s+for|\s+\d|$)/gi,
  ];

  for (const pattern of vendorPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      vendor = match[1].trim();
      confidence += 0.1;
      break;
    }
  }

  // Description generation
  if (!description || description.length < 5) {
    if (vendor && amount) {
      description = `${vendor} - ₹${amount.toLocaleString('en-IN')}`;
    } else if (amount) {
      description = `Expense - ₹${amount.toLocaleString('en-IN')}`;
    } else {
      description = 'WhatsApp expense (manual review needed)';
      confidence = 0.2;
    }
  }

  return {
    amount,
    description: description.substring(0, 500), // Limit length
    date,
    vendor,
    confidence: Math.min(confidence, 1.0)
  };
}

/**
 * Parse date string to ISO format (YYYY-MM-DD)
 */
function parseDate(dateStr: string): string | null {
  const normalized = dateStr.toLowerCase().trim();
  const now = new Date();

  // Handle relative dates
  if (normalized === 'today') {
    return now.toISOString().split('T')[0];
  }
  if (normalized === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  // Handle "15th Dec" format
  const monthMatch = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/i);
  if (monthMatch) {
    const day = parseInt(monthMatch[1]);
    const monthStr = monthMatch[2];
    const monthMap: { [key: string]: number } = {
      'jan': 0, 'january': 0,
      'feb': 1, 'february': 1,
      'mar': 2, 'march': 2,
      'apr': 3, 'april': 3,
      'may': 4,
      'jun': 5, 'june': 5,
      'jul': 6, 'july': 6,
      'aug': 7, 'august': 7,
      'sep': 8, 'september': 8,
      'oct': 9, 'october': 9,
      'nov': 10, 'november': 10,
      'dec': 11, 'december': 11
    };
    const month = monthMap[monthStr.toLowerCase()];
    if (month !== undefined) {
      const year = now.getFullYear();
      const date = new Date(year, month, day);
      return date.toISOString().split('T')[0];
    }
  }

  // Handle DD/MM or DD-MM or DD/MM/YYYY format
  const slashMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1]);
    const month = parseInt(slashMatch[2]) - 1; // 0-indexed
    let year = slashMatch[3] ? parseInt(slashMatch[3]) : now.getFullYear();
    
    // Handle 2-digit year
    if (year < 100) {
      year += 2000;
    }
    
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  return null;
}
