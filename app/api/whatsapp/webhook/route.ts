import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

/**
 * POST /api/whatsapp/webhook
 * Receives incoming WhatsApp messages from Twilio
 * Automatically parses and creates pending expenses
 */
export async function POST(request: NextRequest) {
  try {
    // Parse Twilio webhook data (form-urlencoded)
    const formData = await request.formData();
    
    const from = formData.get('From') as string; // Sender's WhatsApp number
    const body = formData.get('Body') as string; // Message text
    const numMedia = parseInt(formData.get('NumMedia') as string || '0'); // Number of media attachments
    const profileName = formData.get('ProfileName') as string; // Sender's name
    
    console.log('📱 Incoming WhatsApp message:', {
      from,
      profileName,
      body,
      numMedia,
      timestamp: new Date().toISOString()
    });

    // Check for recent messages from same sender (within 60 seconds)
    const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentMessages } = await supabase
      .from('pending_expenses')
      .select('*')
      .eq('sender_phone', from)
      .eq('status', 'pending')
      .gte('created_at', sixtySecondsAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`Found ${recentMessages?.length || 0} recent messages from ${from}`);

    // Handle media attachments (receipt images)
    let imageUrl = null;
    if (numMedia > 0) {
      const mediaUrl = formData.get('MediaUrl0') as string;
      const mediaContentType = formData.get('MediaContentType0') as string;
      
      if (mediaUrl && mediaContentType?.startsWith('image/')) {
        try {
          imageUrl = await downloadAndUploadMedia(mediaUrl);
          console.log('✅ Receipt image uploaded:', imageUrl);
        } catch (error) {
          console.error('Failed to upload receipt image:', error);
        }
      }
    }

    const hasImage = imageUrl !== null;
    const hasText = body && body.trim().length > 0;
    
    // Smart grouping logic
    if (recentMessages && recentMessages.length > 0) {
      // Find the most recent primary expense (images waiting for description)
      const primaryExpense = recentMessages.find(msg => msg.is_primary && msg.image_url);
      
      // If this is a text-only message AND there are recent image messages, group them
      if (!hasImage && hasText && primaryExpense) {
        console.log('📝 Grouping text with recent image expense:', primaryExpense.id);
        
        // Parse the text message
        const parsed = await parseMessage(body);
        
        // Update the primary expense with the description
        const { error: updateError } = await supabase
          .from('pending_expenses')
          .update({
            message_text: body.trim(),
            description: parsed.description || body.trim(),
            amount: parsed.amount || primaryExpense.amount || 0,
            expense_date: parsed.date || primaryExpense.expense_date,
            parsed_text_amount: parsed.amount,
            confidence_score: Math.max(parsed.confidence || 0.5, primaryExpense.confidence_score || 0.5),
            notes: `${primaryExpense.notes}\nDescription: ${body.trim()}`
          })
          .eq('id', primaryExpense.id);

        if (updateError) {
          console.error('❌ Failed to update grouped expense:', updateError);
        } else {
          console.log('✅ Updated expense with description');
          return new NextResponse('Message grouped', { status: 200 });
        }
      }
    }

    // Parse the message to extract expense data
    const parsed = await parseMessage(body || 'WhatsApp expense');
    
    // Create new pending expense (first message in potential group)
    const messageGroupId = crypto.randomUUID();
    const pendingExpense = {
      message_text: body?.trim() || '',
      image_url: imageUrl,
      amount: parsed.amount || 0,
      description: parsed.description || `WhatsApp expense from ${profileName || 'Unknown'}`,
      expense_date: parsed.date || new Date().toISOString().split('T')[0],
      parsed_text_amount: parsed.amount,
      confidence_score: parsed.confidence || 0.5,
      notes: `Auto-imported from WhatsApp (${profileName || from})`,
      status: 'pending',
      sender_phone: from,
      message_group_id: messageGroupId,
      message_sequence: 1,
      is_primary: true
    };

    const { data, error } = await supabase
      .from('pending_expenses')
      .insert([pendingExpense])
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create pending expense:', error);
      return new NextResponse('Database error', { status: 500 });
    }

    console.log('✅ Pending expense created:', data.id);

    // Optional: Send confirmation reply to WhatsApp
    // (Requires Twilio API call - commented out for now)
    // await sendWhatsAppReply(from, `✅ Expense received! Amount: ₹${parsed.amount || 'Unknown'}. Check your app to approve.`);

    return new NextResponse('Message received', { status: 200 });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

/**
 * GET /api/whatsapp/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'active',
    service: 'WhatsApp Webhook',
    timestamp: new Date().toISOString()
  });
}

/**
 * Parse WhatsApp message to extract expense data
 */
async function parseMessage(message: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/api/expenses/parse-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Parser error:', error);
  }

  // Fallback: basic parsing
  return {
    amount: null,
    description: message.substring(0, 200),
    date: null,
    confidence: 0.3
  };
}

/**
 * Download media from Twilio and upload to Supabase Storage
 */
async function downloadAndUploadMedia(mediaUrl: string): Promise<string> {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

  if (!twilioAccountSid || !twilioAuthToken) {
    throw new Error('Twilio credentials not configured');
  }

  // Download from Twilio (requires Basic Auth)
  const authHeader = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
  
  const response = await fetch(mediaUrl, {
    headers: {
      'Authorization': `Basic ${authHeader}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to download media from Twilio');
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  
  // Generate unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = contentType.split('/')[1] || 'jpg';
  const fileName = `whatsapp_${timestamp}_${randomString}.${extension}`;
  const filePath = `expense-receipts/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(filePath, buffer, {
      contentType,
      upsert: false
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('receipts')
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Optional: Send reply message via Twilio API
 * Uncomment and implement if you want to send confirmations
 */
/*
async function sendWhatsAppReply(to: string, message: string) {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., 'whatsapp:+14155238886'

  if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
  const authHeader = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');

  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      From: twilioWhatsAppNumber,
      To: to,
      Body: message
    })
  });
}
*/
