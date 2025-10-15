# Deployment Guide for Avenir Granites

## 🚀 Vercel Deployment Checklist

### 1. **Set Environment Variables in Vercel**

Go to your Vercel project → **Settings** → **Environment Variables** and add:

| Variable Name | Value | Where to get it |
|--------------|-------|-----------------|
| `SUPABASE_URL` | `https://kgwlobhnquaknqurjsqv.supabase.co` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE` | Your service role key | Supabase Dashboard → Settings → API → service_role (secret key) |
| `JWT_SECRET` | `your-super-secret-jwt-key-change-this-in-production-avenir-granites-2024` | Use the same value from your `.env.local` |

**IMPORTANT:** 
- ✅ Add these variables to **Production**, **Preview**, AND **Development** environments
- ✅ Click "Save" after adding each variable
- ✅ Redeploy your project after adding variables

### 2. **Create Users Table in Production Database**

Your production Supabase database needs the `users` table. Run this SQL in your **production** Supabase:

1. Go to your Supabase Dashboard
2. Click on **SQL Editor**
3. Copy and paste the contents of `insert_user_bala.sql`
4. Click **Run** or press `Cmd+Enter`

This will:
- Create the `users` table
- Create necessary indexes
- Insert the admin user (Bala) with password `Avenir@9669`

### 3. **Verify the Deployment**

After setting environment variables and creating the table:

1. Go to your Vercel deployment URL
2. Try logging in with:
   - **Username**: `Bala`
   - **Password**: `Avenir@9669`
3. You should be redirected to the customers page

### 4. **Common Issues and Solutions**

#### Issue: Login stays on same page (not redirecting)

**Causes:**
- ❌ Environment variables not set in Vercel
- ❌ Users table doesn't exist in production database
- ❌ Wrong JWT_SECRET or Supabase credentials

**Solutions:**
1. Check Vercel logs: `Deployments` → Click on your deployment → `Runtime Logs`
2. Look for error messages like:
   - `relation "users" does not exist` → Run the SQL to create users table
   - `JWT_SECRET is not defined` → Add JWT_SECRET to Vercel environment variables
   - `Invalid API key` → Check SUPABASE_SERVICE_ROLE is correct

#### Issue: "Invalid credentials" error

**Causes:**
- ❌ User not created in production database
- ❌ Password hash doesn't match

**Solution:**
Run `insert_user_bala.sql` in your production Supabase SQL Editor

#### Issue: 500 Internal Server Error

**Causes:**
- ❌ Database connection failed
- ❌ Missing environment variables

**Solution:**
1. Check Vercel Runtime Logs
2. Verify all environment variables are set
3. Test Supabase connection from SQL Editor

### 5. **How to View Vercel Logs**

1. Go to Vercel Dashboard
2. Select your project
3. Click **Deployments**
4. Click on the latest deployment
5. Click **Runtime Logs** tab
6. Filter by "Error" or search for specific issues

### 6. **Security Recommendations**

Before going live:

- [ ] Change `JWT_SECRET` to a strong random value
  ```bash
  # Generate a secure secret:
  openssl rand -base64 32
  ```
- [ ] Enable RLS (Row Level Security) in Supabase
- [ ] Set up proper database backups
- [ ] Review Supabase API keys permissions
- [ ] Enable 2FA for Supabase and Vercel accounts

---

## 📝 Quick Deployment Commands

```bash
# 1. Commit your changes
git add .
git commit -m "Prepare for deployment"
git push

# 2. Vercel will automatically deploy when you push to main branch

# 3. Or deploy manually:
vercel --prod
```

---

## 🔍 Testing Production

After deployment, test these flows:

1. ✅ Login with correct credentials → Should redirect to customers page
2. ✅ Login with wrong credentials → Should show error message
3. ✅ Access `/customers` without login → Should redirect to login page
4. ✅ Logout → Should clear session and redirect to login

---

## 📞 Support

If you encounter issues:

1. Check Vercel Runtime Logs first
2. Check Supabase SQL Editor for database connection
3. Verify all environment variables are set correctly
4. Make sure users table exists with the admin user

---

**Last Updated:** January 2025
