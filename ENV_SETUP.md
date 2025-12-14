# 🔐 Environment Variables Setup

Your `.env.local` file is gitignored and never pushed to GitHub.

## For Local Development:
Copy `.env.example` to `.env.local` and fill in your actual values:
```bash
cp .env.example .env.local
```

## For Vercel Deployment:
Add these environment variables in Vercel dashboard:
https://vercel.com/balakrishna625/avenir-granites/settings/environment-variables

**Required variables:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE`
- `JWT_SECRET`
- `GOOGLE_CLOUD_VISION_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_APP_URL`

**After adding env vars, Vercel will automatically redeploy.**
