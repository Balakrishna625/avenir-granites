# WhatsApp Integration Setup Guide (Twilio Free Trial)

## 🎯 What This Does
- Forward WhatsApp messages from your expense group → Automatically creates pending expenses
- Includes receipt images
- You just approve in the app

---

## 📋 Step 1: Create Twilio Account (5 minutes)

1. **Sign up**: https://www.twilio.com/try-twilio
   - Use your email
   - Verify phone number
   - **Get $15 FREE credit** (no card required for trial)

2. **Get your credentials**:
   - Go to https://console.twilio.com
   - Copy these 2 values:
     - **Account SID** (starts with AC...)
     - **Auth Token** (click to reveal)

---

## 📋 Step 2: Enable WhatsApp Sandbox (2 minutes)

1. **Go to WhatsApp Sandbox**:
   - Navigate to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
   - Or: Console → Messaging → Try it out → Send a WhatsApp message

2. **Join Sandbox**:
   - Twilio will show: "Send 'join <your-code>' to +1 415 523 8886"
   - **Open WhatsApp** on your phone
   - Send that exact message to +1 415 523 8886
   - You'll get: "You are all set! Welcome to Twilio's WhatsApp sandbox"

3. **Copy Sandbox Number**:
   - It's: `whatsapp:+14155238886` (for US sandbox)

---

## 📋 Step 3: Update Your App Config (1 minute)

1. **Open** `.env.local` file in your project

2. **Replace** these values with your actual Twilio credentials:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx  # From Step 2
   TWILIO_AUTH_TOKEN=your_auth_token_here          # From Step 2
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886    # Sandbox number
   NEXT_PUBLIC_APP_URL=http://localhost:3002        # Your app URL
   ```

3. **Save** the file

4. **Restart dev server**:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

---

## 📋 Step 4: Expose Webhook to Internet (Choose One)

Your app is on `localhost:3002`, but Twilio needs a public URL. Pick one:

### **Option A: ngrok (Recommended for Testing)**

1. **Install ngrok**:
   ```bash
   brew install ngrok
   ```

2. **Create free account**: https://dashboard.ngrok.com/signup

3. **Get auth token**: https://dashboard.ngrok.com/get-started/your-authtoken

4. **Configure ngrok**:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

5. **Start tunnel**:
   ```bash
   ngrok http 3002
   ```

6. **Copy the URL** (looks like: `https://abc123.ngrok-free.app`)

### **Option B: Vercel Deploy (For Production)**

```bash
vercel deploy --prod
```

Copy the deployed URL (like: `https://your-app.vercel.app`)

---

## 📋 Step 5: Configure Twilio Webhook (2 minutes)

1. **Go to Sandbox Settings**:
   - https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
   - Scroll to "Sandbox Configuration"

2. **Set Webhook URL**:
   - **When a message comes in**: Paste your webhook URL
     ```
     https://abc123.ngrok-free.app/api/whatsapp/webhook
     ```
     (Replace with your ngrok or Vercel URL)
   
   - **HTTP Method**: POST
   - Click **Save**

---

## 📋 Step 6: Create Supabase Storage Bucket (1 minute)

1. **Go to**: https://supabase.com/dashboard/project/kgwlobhnquaknqurjsqv/storage/buckets

2. **Create bucket**:
   - Click "New bucket"
   - Name: `receipts`
   - **Public bucket**: ✅ YES (check the box)
   - Click "Create bucket"

3. **Set public policy** (if not auto-created):
   - Click on `receipts` bucket → Policies → New policy
   - Template: "Allow public read access"
   - Click "Review" → "Save policy"

---

## 🧪 Step 7: Test It!

### Test 1: Send Message (No Image)
1. Open WhatsApp on your phone
2. Go to chat with Twilio (+1 415 523 8886)
3. Send: `Paid 5000 for diesel at Indian Oil`
4. **Check your app**: http://localhost:3002/expenses/pending
5. Should see new pending expense!

### Test 2: Send Message with Receipt
1. Take photo of a receipt
2. Send to Twilio WhatsApp with caption: `Office supplies 3500`
3. Check app - should show image too!

### Test 3: Group Forwarding
1. In your expense WhatsApp group, send a message
2. **Forward it** to Twilio WhatsApp number
3. Check app - pending expense created!

---

## 🎉 Success Criteria

✅ Message sent → Appears in "Pending Approvals"  
✅ Receipt image → Displays in approval page  
✅ Amount/date parsed automatically  
✅ You edit & approve → Creates real expense  

---

## 💰 Cost Breakdown

**Twilio Free Trial**:
- $15 credit = ~3,000 messages
- Perfect for 2-3 months testing
- No credit card needed

**After trial**:
- WhatsApp messages: $0.005/message (₹0.40)
- 100 messages/month = ₹40
- 500 messages/month = ₹200

**Production** (when ready):
- Move from sandbox to approved sender (~1 week approval)
- Get your own Twilio number
- Or use Meta WhatsApp Business API (free tier 1,000/month)

---

## 🔧 Troubleshooting

### "Webhook not receiving messages"
- Check ngrok is still running
- Verify webhook URL in Twilio has `/api/whatsapp/webhook`
- Check dev server is running on port 3002

### "Receipt image not showing"
- Verify `receipts` bucket exists in Supabase
- Check bucket is set to PUBLIC
- Look at server logs for upload errors

### "Parser not extracting amount"
- Send clearer format: "Paid 5000 for diesel"
- Amount must have numbers: 5000, Rs 5000, ₹5000
- Check logs: http://localhost:3002/api/whatsapp/webhook

### "Sandbox expired"
- Sandbox sessions expire after 24 hours
- Re-send `join <code>` to Twilio WhatsApp
- Or upgrade to production WhatsApp sender

---

## 🚀 Next Steps

Once testing is successful:

1. **Deploy to production** (Vercel/Railway)
2. **Get permanent Twilio number** (₹700/month)
3. **Or** switch to Meta WhatsApp Business API (free 1000 msgs/month)
4. **Auto-forward** from your expense group to Twilio number
5. **Enjoy** hands-free expense tracking!

---

## 📞 Support

- Twilio Docs: https://www.twilio.com/docs/whatsapp
- ngrok Docs: https://ngrok.com/docs
- Supabase Storage: https://supabase.com/docs/guides/storage

Let me know if you hit any issues!
