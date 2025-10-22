import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * PDF Parser for APCPDCL Electricity Bills
 * Extracts key metrics from the electricity bill text
 */
function parseElectricityBillText(text: string) {
  const lines = text.split('\n').map(l => l.trim());
  
  const extracted: any = {
    bill: {},
    todReadings: []
  };

  // Extract Bill Number - APCPDCL specific patterns
  // Pattern 1: "Bill No: 2513496777" (with colon and spaces)
  let billNoMatch = text.match(/Bill\s+No[:\s.]+(\d{8,})/i);
  
  // Pattern 2: Just the label and number on same line
  if (!billNoMatch) billNoMatch = text.match(/Bill\s+Number[:\s.]+(\d{8,})/i);
  
  // Pattern 3: APCPDCL format - look for 10-digit bill number near "Dated"
  if (!billNoMatch) {
    const billNoLine = text.match(/Dated[:\s]+\d{2}-[A-Z]{3}-\d{4}[\s\S]{0,100}?(\d{10})/i);
    if (billNoLine) billNoMatch = billNoLine;
  }
  
  // Pattern 4: Look for pattern "Bill No: XXXXXXXXXX" where X is 10 digits
  if (!billNoMatch) {
    const match = text.match(/Bill\s+No[:\s]*(\d{10})/i);
    if (match) billNoMatch = match;
  }
  
  // Pattern 5: Search for 10-digit number in first 500 characters (likely bill number)
  if (!billNoMatch) {
    const firstPart = text.substring(0, 500);
    const tenDigitMatch = firstPart.match(/\b(\d{10})\b/);
    if (tenDigitMatch) billNoMatch = tenDigitMatch;
  }
  
  if (billNoMatch) extracted.bill.bill_number = billNoMatch[1];

  // Extract Bill Month - APCPDCL specific patterns
  // Pattern 1: "H.T. Bill for the month of: OCT - 2025" (with spaces and dash)
  let billMonthMatch = text.match(/Bill\s+for\s+the\s+month\s+of[:\s]+([A-Z]{3})\s*[-\s]+(\d{4})/i);
  
  // Pattern 2: "Month: OCT-2025" or "OCT - 2025"
  if (!billMonthMatch) billMonthMatch = text.match(/month\s+of[:\s]+([A-Z]{3})\s*[-\s]*(\d{4})/i);
  
  // Pattern 3: Just "OCT - 2025" or "OCT-2025" format
  if (!billMonthMatch) billMonthMatch = text.match(/\b([A-Z]{3})\s*[-\s]+(\d{4})\b/);
  
  if (billMonthMatch) {
    // Normalize to "OCT-2025" format (remove extra spaces)
    extracted.bill.bill_month = `${billMonthMatch[1]}-${billMonthMatch[2]}`;
  }

  // Bill Date - multiple patterns
  let billDateMatch = text.match(/Dated[:\s]+(\d{2}[-/][A-Z]{3}[-/]\d{4})/i);
  if (!billDateMatch) billDateMatch = text.match(/Bill Date[:\s]+(\d{2}[-/][A-Z]{3}[-/]\d{4})/i);
  if (!billDateMatch) billDateMatch = text.match(/Date[:\s]+(\d{2}[-/][A-Z]{3}[-/]\d{4})/i);
  if (billDateMatch) {
    extracted.bill.bill_date = convertDateFormat(billDateMatch[1]);
  }

  // Due Date - multiple patterns
  let dueDateMatch = text.match(/Payable on or before[:\s]+(\d{2}[-/][A-Z]{3}[-/]\d{4})/i);
  if (!dueDateMatch) dueDateMatch = text.match(/Due Date[:\s]+(\d{2}[-/][A-Z]{3}[-/]\d{4})/i);
  if (!dueDateMatch) dueDateMatch = text.match(/Pay by[:\s]+(\d{2}[-/][A-Z]{3}[-/]\d{4})/i);
  if (dueDateMatch) {
    extracted.bill.due_date = convertDateFormat(dueDateMatch[1]);
  }

  const disconnectionMatch = text.match(/Disconnection Date[:\s]+(\d{2}[-/][A-Z]{3}[-/]\d{4})/i);
  if (disconnectionMatch) {
    extracted.bill.disconnection_date = convertDateFormat(disconnectionMatch[1]);
  }

  // Extract Consumer Details - APCPDCL specific
  // Pattern: "Consumer No : ONG2181" or "Consumer No: ONG2181"
  let consumerMatch = text.match(/Consumer\s+No[:\s.]+([A-Z0-9]+)/i);
  if (!consumerMatch) consumerMatch = text.match(/Consumer\s+Number[:\s.]+([A-Z0-9]+)/i);
  if (!consumerMatch) consumerMatch = text.match(/Account\s+No[:\s.]+([A-Z0-9]+)/i);
  if (!consumerMatch) consumerMatch = text.match(/Service\s+No[:\s.]+([A-Z0-9]+)/i);
  if (consumerMatch) extracted.bill.consumer_number = consumerMatch[1];

  // Consumer name - APCPDCL format (multiple lines after Consumer No)
  const consumerNameMatch = text.match(/Consumer\s+No[:\s]+[A-Z0-9]+[\s\n]+([A-Z\s]+?)(?=\n|[A-Z]+[:\s]|$)/i);
  if (consumerNameMatch) extracted.bill.consumer_name = consumerNameMatch[1].trim();

  // Contracted MD - APCPDCL format: "Contracted MD(KVA)" or "Contracted MD (KVA)"
  let contractedMatch = text.match(/Contracted\s+MD\s*\(?\s*KVA\s*\)?[:\s]+([\d.]+)/i);
  if (contractedMatch) extracted.bill.contracted_demand = parseFloat(contractedMatch[1]);

  // Voltage - APCPDCL format: "Voltage(KV) 11 (COMM-FEEDER)"
  let voltageMatch = text.match(/Voltage\s*\(?\s*KV\s*\)?[:\s]+(\d+)\s*\(([^)]+)\)/i);
  if (voltageMatch) {
    extracted.bill.voltage_level = `${voltageMatch[1]} KV (${voltageMatch[2]})`;
  }

  // Category - APCPDCL format: "Category 3A"
  let categoryMatch = text.match(/Category[:\s]+([A-Z0-9]+)/i);
  if (categoryMatch) extracted.bill.category = categoryMatch[1];

  // Extract Meter Readings
  const kwh_prev_match = text.match(/Reading On[:\s]+\d{2}-[A-Z]{3}-\d{4}[^\d]+(\d+)\.(\d+)/);
  if (kwh_prev_match) extracted.bill.previous_kwh_reading = parseFloat(kwh_prev_match[1] + kwh_prev_match[2]);

  const kwh_curr_match = text.match(/Reading On[:\s]+\d{2}-[A-Z]{3}-\d{4}[^\d]+\d+\.\d+[^\d]+(\d+)\.(\d+)/);
  if (kwh_curr_match) extracted.bill.current_kwh_reading = parseFloat(kwh_curr_match[1] + kwh_curr_match[2]);

  // Consumption - APCPDCL table format
  // Pattern 1: "Total Consumption" row with value like "53829.00"
  let consumptionMatch = text.match(/Total\s+Consumption[\s\S]{0,50}?([\d,]+\.?\d*)/i);
  
  // Pattern 2: Look in the KWH column for consumption value
  if (!consumptionMatch) consumptionMatch = text.match(/Difference[\s\S]{0,50}?([\d,]+\.?\d*)/);
  
  // Pattern 3: Just "Consumption: XXXXX"
  if (!consumptionMatch) consumptionMatch = text.match(/Consumption[:\s]+([\d,]+)/i);
  
  if (consumptionMatch) {
    extracted.bill.kwh_consumption = parseFloat(consumptionMatch[1].replace(/,/g, ''));
  }

  // KVAH readings
  const kvahPrevMatch = text.match(/KVAH[^\d]+(\d+)/);
  if (kvahPrevMatch) extracted.bill.previous_kvah_reading = parseFloat(kvahPrevMatch[1]);

  const kvahConsMatch = text.match(/KVAH[^\d]+\d+[^\d]+([\d.]+)/);
  if (kvahConsMatch) extracted.bill.kvah_consumption = parseFloat(kvahConsMatch[1]);

  // Power Quality - APCPDCL format
  // Pattern 1: KVA in table (look for "KVA" header followed by value like "187.20")
  let kvaMatch = text.match(/\bKVA\b[\s\S]{0,100}?([\d.]+)/i);
  if (!kvaMatch) kvaMatch = text.match(/Maximum\s+Demand[\s\S]{0,50}?([\d.]+)/i);
  if (!kvaMatch) kvaMatch = text.match(/Main\s+Consumption[\s\S]{0,50}?KVA[\s\S]{0,50}?([\d.]+)/i);
  if (kvaMatch) extracted.bill.kva_demand = parseFloat(kvaMatch[1]);

  // Pattern 2: PF in table (look for "PF" header followed by value like "0.93")
  let pfMatch = text.match(/\bPF\b[\s\S]{0,100}?(0\.\d+)/i);
  if (!pfMatch) pfMatch = text.match(/Power\s+Factor[:\s]+(0\.\d+)/i);
  if (pfMatch) extracted.bill.power_factor = parseFloat(pfMatch[1]);

  // Charges - APCPDCL format with better number extraction
  // Demand Charges: "Demand Charges Normal Rs. 475.00 192.00 91200.00"
  let demandChargeRateMatch = text.match(/Demand\s+Charges\s+Normal[\s\S]{0,50}?Rs\.?\s*([\d.]+)/i);
  if (demandChargeRateMatch) extracted.bill.demand_charges_rate = parseFloat(demandChargeRateMatch[1]);

  let demandChargesMatch = text.match(/Demand\s+Charges\s+Normal[\s\S]{0,100}?([\d,]+\.?\d*)\s*$/im);
  if (!demandChargesMatch) demandChargesMatch = text.match(/Demand\s+Charges[\s\S]{0,100}AMOUNT\s+Rs\.[\s\S]{0,50}?([\d,]+\.?\d*)/i);
  if (demandChargesMatch) extracted.bill.demand_charges_amount = parseFloat(demandChargesMatch[1].replace(/,/g, ''));

  // Energy Charges: "Energy Charges Rs. 6.30 57134.00 359944.20"
  let energyRateMatch = text.match(/Energy\s+Charges[\s\S]{0,50}?Rs\.?\s*([\d.]+)/i);
  if (energyRateMatch) extracted.bill.energy_charges_rate = parseFloat(energyRateMatch[1]);

  let energyChargesMatch = text.match(/Energy\s+Charges[\s\S]{0,100}?([\d,]+\.?\d*)\s*$/im);
  if (energyChargesMatch) extracted.bill.energy_charges_amount = parseFloat(energyChargesMatch[1].replace(/,/g, ''));

  // TOD Charges with complex calculation string
  let todChargesMatch = text.match(/TOD\s+Charges[\s\S]{0,200}?([\d,]+\.?\d*)\s*$/im);
  if (!todChargesMatch) todChargesMatch = text.match(/TOD[\s\S]{0,100}?([\d,]+\.?\d*)/i);
  if (todChargesMatch) extracted.bill.tod_charges = parseFloat(todChargesMatch[1].replace(/,/g, ''));

  // Electricity Duty
  let dutyMatch = text.match(/Electricity\s+Duty[\s\S]{0,100}?([\d,]+\.?\d*)/i);
  if (dutyMatch) extracted.bill.electricity_duty = parseFloat(dutyMatch[1].replace(/,/g, ''));

  // FPPCA Charges - with comma support
  let fppca1Match = text.match(/FPPCA\s+Charges\s*\(JAN-2023\)[\s\S]{0,100}?([\d,]+\.?\d*)/i);
  if (fppca1Match) extracted.bill.fppca_jan_2023 = parseFloat(fppca1Match[1].replace(/,/g, ''));

  let fppca2Match = text.match(/FPPCA\s+Charges\s*\(AUG-2023\)[\s\S]{0,100}?([\d,]+\.?\d*)/i);
  if (fppca2Match) extracted.bill.fppca_aug_2023 = parseFloat(fppca2Match[1].replace(/,/g, ''));

  let fppca3Match = text.match(/FPPCA\s+Charges\s*\(AUG-2025\)[\s\S]{0,100}?([\d,]+\.?\d*)/i);
  if (fppca3Match) extracted.bill.fppca_aug_2025 = parseFloat(fppca3Match[1].replace(/,/g, ''));

  // Additional charges - with comma support
  let customerChargesMatch = text.match(/Customer\s+Charges[\s\S]{0,50}?([\d,]+\.?\d*)/i);
  if (customerChargesMatch) extracted.bill.customer_charges = parseFloat(customerChargesMatch[1].replace(/,/g, ''));

  let latePaymentMatch = text.match(/Late\s+Payment\s+Charges[\s\S]{0,50}?([\d,]+\.?\d*)/i);
  if (latePaymentMatch) extracted.bill.late_payment_charges = parseFloat(latePaymentMatch[1].replace(/,/g, ''));

  let interestMatch = text.match(/Interest\s+On\s+E[DN]D?[\s\S]{0,50}?([\d,]+\.?\d*)/i);
  if (interestMatch) extracted.bill.interest_on_edd = parseFloat(interestMatch[1].replace(/,/g, ''));

  // Arrears - APCPDCL format
  let arrearsMatch = text.match(/Arrears\s+as\s+on[\s\S]{0,100}?Sub\s+Total[\s\S]{0,50}?([\d,]+\.?\d*)/i);
  if (!arrearsMatch) arrearsMatch = text.match(/Arrears[\s\S]{0,100}?Total[\s\S]{0,50}?Rs[\s\S]{0,20}?([\d,]+\.?\d*)/i);
  if (arrearsMatch) extracted.bill.arrears_total = parseFloat(arrearsMatch[1].replace(/,/g, ''));

  let ccChargeMatch = text.match(/C\.?C\.?\s*Charge[\s\S]{0,50}?([\d,]+\.?\d*)/i);
  if (ccChargeMatch) extracted.bill.arrears_cc_charge = parseFloat(ccChargeMatch[1].replace(/,/g, ''));

  let surchargeMatch = text.match(/Surcharge[\s\S]{0,50}?([\d,]+\.?\d*)/i);
  if (surchargeMatch) extracted.bill.arrears_surcharge = parseFloat(surchargeMatch[1].replace(/,/g, ''));

  let courtCasesMatch = text.match(/Court\s+Cases[\s\S]{0,50}?Rs[\s\S]{0,20}?([\d,]+\.?\d*)/i);
  if (courtCasesMatch) extracted.bill.arrears_court_cases = parseFloat(courtCasesMatch[1].replace(/,/g, ''));

  let othersMatch = text.match(/Others[\s\S]{0,50}?Rs[\s\S]{0,20}?([\d,]+\.?\d*)/i);
  if (othersMatch) extracted.bill.arrears_others = parseFloat(othersMatch[1].replace(/,/g, ''));

  // Bill totals - multiple patterns with comma handling
  let subTotalMatch = text.match(/Sub Total[:\s]*Rs?[.\s]*([\d,]+)/i);
  if (!subTotalMatch) subTotalMatch = text.match(/Subtotal[:\s]*Rs?[.\s]*([\d,]+)/i);
  if (subTotalMatch) extracted.bill.sub_total = parseFloat(subTotalMatch[1].replace(/,/g, ''));

  let netBillMatch = text.match(/Net Bill Amount[:\s]*Rs?[.\s]*([\d,]+)/i);
  if (!netBillMatch) netBillMatch = text.match(/Net Amount[:\s]*Rs?[.\s]*([\d,]+)/i);
  if (!netBillMatch) netBillMatch = text.match(/Bill Amount[:\s]*Rs?[.\s]*([\d,]+)/i);
  if (netBillMatch) extracted.bill.net_bill_amount = parseFloat(netBillMatch[1].replace(/,/g, ''));

  let totalPayableMatch = text.match(/Total Amount Payable[:\s]*Rs?[.\s]*([\d,]+)/i);
  if (!totalPayableMatch) totalPayableMatch = text.match(/Total Payable[:\s]*Rs?[.\s]*([\d,]+)/i);
  if (!totalPayableMatch) totalPayableMatch = text.match(/Amount Payable[:\s]*Rs?[.\s]*([\d,]+)/i);
  if (!totalPayableMatch) totalPayableMatch = text.match(/Total Amount[:\s]*Rs?[.\s]*([\d,]+)/i);
  if (totalPayableMatch) extracted.bill.total_amount_payable = parseFloat(totalPayableMatch[1].replace(/,/g, ''));

  const lastPaidMatch = text.match(/Last Paid Amount Rs\.\s*([\d.]+)\((\d{2}-[A-Z]{3}-\d{4})\)/i);
  if (lastPaidMatch) {
    extracted.bill.last_paid_amount = parseFloat(lastPaidMatch[1]);
    extracted.bill.last_paid_date = convertDateFormat(lastPaidMatch[2]);
  }

  // Extract TOD Readings (Time of Day) - New Meter
  const todPattern = /TOD\s*(\d+)\s*:\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})[^\d]+(\d+)[^\d]+(\d+)[^\d]+(\d+)[^\d]+(\d+)[^\d]+(\d+)/gi;
  let todMatch;
  const todNew: any = { meter_change: 1 };
  
  while ((todMatch = todPattern.exec(text)) !== null) {
    const slotNum = todMatch[1];
    const opening = parseFloat(todMatch[4]);
    const closing = parseFloat(todMatch[5]);
    const consumption = parseFloat(todMatch[6]);
    const multiplier = parseInt(todMatch[7]);
    
    todNew[`tod${slotNum}_opening`] = opening;
    todNew[`tod${slotNum}_closing`] = closing;
    todNew[`tod${slotNum}_consumption`] = consumption;
    todNew[`tod${slotNum}_multiplier`] = multiplier;
  }
  
  if (Object.keys(todNew).length > 1) {
    extracted.todReadings.push(todNew);
  }

  // Log what was extracted for debugging
  console.log('=== APCPDCL Bill Parser Debug ===');
  console.log('Bill Number:', extracted.bill.bill_number || '❌ NOT FOUND');
  console.log('Bill Month:', extracted.bill.bill_month || '❌ NOT FOUND');
  console.log('Bill Date:', extracted.bill.bill_date || '❌ NOT FOUND');
  console.log('Consumer No:', extracted.bill.consumer_number || '❌ NOT FOUND');
  console.log('Contracted Demand:', extracted.bill.contracted_demand || '❌ NOT FOUND');
  console.log('Category:', extracted.bill.category || '❌ NOT FOUND');
  console.log('KWH Consumption:', extracted.bill.kwh_consumption || '❌ NOT FOUND');
  console.log('KVA Demand:', extracted.bill.kva_demand || '❌ NOT FOUND');
  console.log('Power Factor:', extracted.bill.power_factor || '❌ NOT FOUND');
  console.log('Total Amount:', extracted.bill.total_amount_payable || '❌ NOT FOUND');
  console.log('===============================');

  return extracted;
}

// Helper function to convert date format
function convertDateFormat(dateStr: string): string {
  // Convert "04-OCT-2025" to "2025-10-04"
  const months: Record<string, string> = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
  };
  
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = months[parts[1].toUpperCase()];
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
}

/**
 * POST /api/electricity-bills/parse
 * Accepts PDF file or text and parses electricity bill data
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const textInput = formData.get('text') as string;

    let billText = textInput || '';

    if (file) {
      // Read file as text (works for text-based PDFs)
      // For image-based PDFs, you would need OCR library like Tesseract.js
      billText = await file.text();
      
      // Alternative: Use pdf-parse library
      // const pdfParse = require('pdf-parse');
      // const buffer = await file.arrayBuffer();
      // const pdfData = await pdfParse(Buffer.from(buffer));
      // billText = pdfData.text;
    }

    if (!billText) {
      return NextResponse.json(
        { error: 'No file or text provided' },
        { status: 400 }
      );
    }

    // Parse the bill text
    const parsedData = parseElectricityBillText(billText);

    // Auto-generate bill number if extraction failed but we have month and consumer
    if (!parsedData.bill.bill_number) {
      if (parsedData.bill.bill_month && parsedData.bill.consumer_number) {
        // Generate bill number: CONSUMER-MONTH (e.g., 123456789-OCT-2025)
        parsedData.bill.bill_number = `${parsedData.bill.consumer_number}-${parsedData.bill.bill_month}`;
      } else if (parsedData.bill.bill_month) {
        // Use timestamp if no consumer number
        parsedData.bill.bill_number = `BILL-${parsedData.bill.bill_month}-${Date.now()}`;
      } else {
        return NextResponse.json(
          { 
            error: 'Could not extract enough information to create a bill. Please ensure the file is a valid electricity bill or enter details manually.',
            parsedData 
          },
          { status: 400 }
        );
      }
    }

    // Check if bill already exists
    const { data: existingBill } = await supabaseAdmin
      .from('electricity_bills')
      .select('id, bill_number')
      .eq('bill_number', parsedData.bill.bill_number)
      .single();

    if (existingBill) {
      return NextResponse.json(
        { 
          error: `Bill ${parsedData.bill.bill_number} already exists`,
          existing: true,
          billId: existingBill.id
        },
        { status: 409 }
      );
    }

    // Save to database
    const { data: bill, error: billError } = await supabaseAdmin
      .from('electricity_bills')
      .insert([parsedData.bill])
      .select()
      .single();

    if (billError) throw billError;

    // Save TOD readings
    if (parsedData.todReadings && parsedData.todReadings.length > 0) {
      const todData = parsedData.todReadings.map((tod: any) => ({
        ...tod,
        bill_id: bill.id
      }));

      await supabaseAdmin
        .from('electricity_tod_readings')
        .insert(todData);
    }

    return NextResponse.json({
      success: true,
      bill,
      message: 'Bill parsed and saved successfully',
      parsedData
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error parsing electricity bill:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse bill' },
      { status: 500 }
    );
  }
}
