import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  // Extract Bill Number
  const billNoMatch = text.match(/Bill No[:\s]+(\d+)/i);
  if (billNoMatch) extracted.bill.bill_number = billNoMatch[1];

  // Extract Bill Month and Date
  const billMonthMatch = text.match(/Bill for the month of[:\s]+([A-Z]{3}\s*-\s*\d{4})/i);
  if (billMonthMatch) extracted.bill.bill_month = billMonthMatch[1];

  const billDateMatch = text.match(/Dated[:\s]+(\d{2}-[A-Z]{3}-\d{4})/i);
  if (billDateMatch) {
    extracted.bill.bill_date = convertDateFormat(billDateMatch[1]);
  }

  const dueDateMatch = text.match(/Payable on or before[:\s]+(\d{2}-[A-Z]{3}-\d{4})/i);
  if (dueDateMatch) {
    extracted.bill.due_date = convertDateFormat(dueDateMatch[1]);
  }

  const disconnectionMatch = text.match(/Disconnection Date[:\s]+(\d{2}-[A-Z]{3}-\d{4})/i);
  if (disconnectionMatch) {
    extracted.bill.disconnection_date = convertDateFormat(disconnectionMatch[1]);
  }

  // Extract Consumer Details
  const consumerMatch = text.match(/Consumer No[:\s]+([A-Z0-9]+)/i);
  if (consumerMatch) extracted.bill.consumer_number = consumerMatch[1];

  const consumerNameMatch = text.match(/Consumer No[^A-Z]+([A-Z\s]+)/);
  if (consumerNameMatch) extracted.bill.consumer_name = consumerNameMatch[1].trim();

  const contractedMatch = text.match(/Contracted MD\(KVA\)[:\s]+([\d.]+)/i);
  if (contractedMatch) extracted.bill.contracted_demand_kva = parseFloat(contractedMatch[1]);

  const voltageMatch = text.match(/Voltage\(KV\)[:\s]+(\d+)\s*\(([^)]+)\)/i);
  if (voltageMatch) {
    extracted.bill.voltage_kv = parseFloat(voltageMatch[1]);
    extracted.bill.connection_type = voltageMatch[2];
  }

  const categoryMatch = text.match(/Category[:\s]+(\w+)/i);
  if (categoryMatch) extracted.bill.category = categoryMatch[1];

  // Extract Meter Readings
  const kwh_prev_match = text.match(/Reading On[:\s]+\d{2}-[A-Z]{3}-\d{4}[^\d]+(\d+)\.(\d+)/);
  if (kwh_prev_match) extracted.bill.previous_kwh_reading = parseFloat(kwh_prev_match[1] + kwh_prev_match[2]);

  const kwh_curr_match = text.match(/Reading On[:\s]+\d{2}-[A-Z]{3}-\d{4}[^\d]+\d+\.\d+[^\d]+(\d+)\.(\d+)/);
  if (kwh_curr_match) extracted.bill.current_kwh_reading = parseFloat(kwh_curr_match[1] + kwh_curr_match[2]);

  const consumptionMatch = text.match(/Total Consumption[:\s]+([\d.]+)/i);
  if (consumptionMatch) extracted.bill.kwh_consumption = parseFloat(consumptionMatch[1]);

  // KVAH readings
  const kvahPrevMatch = text.match(/KVAH[^\d]+(\d+)/);
  if (kvahPrevMatch) extracted.bill.previous_kvah_reading = parseFloat(kvahPrevMatch[1]);

  const kvahConsMatch = text.match(/KVAH[^\d]+\d+[^\d]+([\d.]+)/);
  if (kvahConsMatch) extracted.bill.kvah_consumption = parseFloat(kvahConsMatch[1]);

  // Power Quality
  const kvaMatch = text.match(/KVA[:\s]+([\d.]+)/i);
  if (kvaMatch) extracted.bill.maximum_demand_kva = parseFloat(kvaMatch[1]);

  const pfMatch = text.match(/PF[:\s]+([\d.]+)/i);
  if (pfMatch) extracted.bill.power_factor = parseFloat(pfMatch[1]);

  // Charges
  const demandChargeRateMatch = text.match(/Demand Charges Normal[:\s]+Rs\.\s*([\d.]+)/i);
  if (demandChargeRateMatch) extracted.bill.demand_charge_rate = parseFloat(demandChargeRateMatch[1]);

  const demandChargesMatch = text.match(/Demand Charges Normal[^\d]+([\d.]+)/i);
  if (demandChargesMatch) extracted.bill.demand_charges = parseFloat(demandChargesMatch[1]);

  const energyRateMatch = text.match(/Energy Charges[:\s]+Rs\.\s*([\d.]+)/i);
  if (energyRateMatch) extracted.bill.energy_charge_rate = parseFloat(energyRateMatch[1]);

  const energyChargesMatch = text.match(/Energy Charges[^\d]+([\d.]+)[^\d]+(\d+)/i);
  if (energyChargesMatch) extracted.bill.energy_charges = parseFloat(energyChargesMatch[2]);

  const todChargesMatch = text.match(/TOD Charges[^\d]+([\d.]+)/i);
  if (todChargesMatch) extracted.bill.tod_charges = parseFloat(todChargesMatch[1]);

  const dutyMatch = text.match(/Electricity Duty[^\d]+([\d.]+)/i);
  if (dutyMatch) extracted.bill.electricity_duty = parseFloat(dutyMatch[1]);

  // FPPCA Charges
  const fppca1Match = text.match(/FPPCA Charges[^A-Z]+\(JAN-2023\)[^\d]+([\d.]+)/i);
  if (fppca1Match) extracted.bill.fppca_jan_2023 = parseFloat(fppca1Match[1]);

  const fppca2Match = text.match(/FPPCA Charges[^A-Z]+\(AUG-2023\)[^\d]+([\d.]+)/i);
  if (fppca2Match) extracted.bill.fppca_aug_2023 = parseFloat(fppca2Match[1]);

  const fppca3Match = text.match(/FPPCA Charges[^A-Z]+\(AUG-2025\)[^\d]+([\d.]+)/i);
  if (fppca3Match) extracted.bill.fppca_aug_2025 = parseFloat(fppca3Match[1]);

  // Additional charges
  const customerChargesMatch = text.match(/Customer Charges[^\d]+([\d.]+)/i);
  if (customerChargesMatch) extracted.bill.customer_charges = parseFloat(customerChargesMatch[1]);

  const latePaymentMatch = text.match(/Late Payment Charges[^\d]+([\d.]+)/i);
  if (latePaymentMatch) extracted.bill.late_payment_charges = parseFloat(latePaymentMatch[1]);

  const interestMatch = text.match(/Interest On ED[^\d]+([\d.]+)/i);
  if (interestMatch) extracted.bill.interest_on_ed = parseFloat(interestMatch[1]);

  // Arrears
  const arrearsMatch = text.match(/Arrears as on[^R]+Rs[^\d]+([\d.]+)/i);
  if (arrearsMatch) extracted.bill.arrears_amount = parseFloat(arrearsMatch[1]);

  const ccChargeMatch = text.match(/C\.C\.Charge[^\d]+([\d.]+)/i);
  if (ccChargeMatch) extracted.bill.arrears_cc_charge = parseFloat(ccChargeMatch[1]);

  const surchargeMatch = text.match(/Surcharge[^\d]+([\d.]+)/i);
  if (surchargeMatch) extracted.bill.arrears_surcharge = parseFloat(surchargeMatch[1]);

  const courtCasesMatch = text.match(/Court Cases[^\d]+Rs[^\d]+([\d.]+)/i);
  if (courtCasesMatch) extracted.bill.court_cases = parseFloat(courtCasesMatch[1]);

  const othersMatch = text.match(/Others[^\d]+Rs[^\d]+([\d.]+)/i);
  if (othersMatch) extracted.bill.others_arrears = parseFloat(othersMatch[1]);

  // Bill totals
  const subTotalMatch = text.match(/Sub Total[^\d]+([\d.]+)/i);
  if (subTotalMatch) extracted.bill.sub_total = parseFloat(subTotalMatch[1]);

  const netBillMatch = text.match(/Net Bill Amount[^\d]+([\d.]+)/i);
  if (netBillMatch) extracted.bill.net_bill_amount = parseFloat(netBillMatch[1]);

  const totalPayableMatch = text.match(/Total Amount Payable[^\d]+([\d.]+)/i);
  if (totalPayableMatch) extracted.bill.total_amount_payable = parseFloat(totalPayableMatch[1]);

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

    // Validate required fields
    if (!parsedData.bill.bill_number) {
      return NextResponse.json(
        { 
          error: 'Could not extract bill number. Please check the file or enter manually.',
          parsedData 
        },
        { status: 400 }
      );
    }

    // Check if bill already exists
    const { data: existingBill } = await supabase
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
    const { data: bill, error: billError } = await supabase
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

      await supabase
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
