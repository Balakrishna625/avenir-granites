# 📱 Avenir Granites PWA - Installation Guide

## ✅ What Was Implemented

Your app is now a **Progressive Web App (PWA)** that can be installed on iPhone and Android like a native app!

### Changes Made:
1. ✅ Installed `next-pwa` package
2. ✅ Configured service worker for offline caching
3. ✅ Created web app manifest with "Avenir Granites" branding
4. ✅ Added iOS-specific meta tags for home screen install
5. ✅ Generated placeholder app icons (AG logo)
6. ✅ Updated build configuration
7. ✅ Successfully tested production build

### Files Created/Modified:
- `next.config.js` - Added PWA configuration
- `public/manifest.json` - App metadata (name, colors, icons)
- `app/layout.tsx` - Added PWA meta tags
- `public/icon-192x192.svg` - Android icon (can replace with PNG)
- `public/icon-512x512.svg` - Android icon large
- `public/apple-touch-icon.svg` - iOS home screen icon
- `tsconfig.json` - Fixed TypeScript configuration
- `.gitignore` - Excluded auto-generated service worker files

---

## 📲 How to Install on iPhone

### Step 1: Deploy to Vercel
```bash
git add .
git commit -m "feat: Add PWA support for Avenir Granites"
git push
```

### Step 2: Install on iPhone
1. Open Safari and go to your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Tap the **Share** button (box with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. You'll see "Avenir Granites" with the AG icon
5. Tap **"Add"** in the top right

### What Happens:
- ✅ "Avenir Granites" icon appears on your home screen
- ✅ Opens in full-screen mode (no Safari bars)
- ✅ Works like a native app
- ✅ Auto-updates on every deployment (no re-install needed)

---

## 📱 How to Install on Android

### Step 1: Open in Chrome
1. Open Chrome browser on Android
2. Go to your Vercel URL

### Step 2: Install
1. Chrome will show a banner: **"Add Avenir Granites to Home screen"**
2. Tap **"Add"** or **"Install"**
3. Alternatively: Tap the 3-dot menu → **"Install app"**

### What Happens:
- ✅ App appears in app drawer
- ✅ Opens in standalone window
- ✅ Works offline with cached data
- ✅ Auto-updates on deployment

---

## 🎨 Customizing App Icons (Optional)

The current icons show "AG" in a blue gradient. To replace with your logo:

### Replace These Files:
```bash
public/icon-192x192.svg  → Replace with icon-192x192.png (192x192 pixels)
public/icon-512x512.svg  → Replace with icon-512x512.png (512x512 pixels)
public/apple-touch-icon.svg → Replace with apple-touch-icon.png (180x180 pixels)
```

### Icon Requirements:
- **Format**: PNG (transparent or with background)
- **Sizes**: 
  - 192x192px for Android
  - 512x512px for Android (high-res)
  - 180x180px for iOS
- **Design**: Square with rounded corners (system adds corner radius)
- **Safe Area**: Keep important content 10% away from edges

### After Replacing Icons:
1. Update `public/manifest.json` to use `.png` instead of `.svg`
2. Update `app/layout.tsx` to reference `.png` files
3. Rebuild and redeploy

---

## 🚀 Features You Get

### iPhone Features:
- ✅ Full-screen app (no browser UI)
- ✅ App icon on home screen
- ✅ Splash screen on launch
- ✅ Native app feel
- ✅ Background updates
- ✅ Works in app switcher

### Android Features:
- ✅ App drawer icon
- ✅ Standalone window
- ✅ Full-screen mode
- ✅ Offline functionality (with caching)
- ✅ Add to home screen prompt
- ✅ Background sync

### Both Platforms:
- ✅ **Auto-updates**: Every Vercel deployment auto-updates the app (users don't need to reinstall)
- ✅ **Offline capable**: Cached pages work without internet
- ✅ **Fast loading**: Service worker caches assets
- ✅ **No App Store**: No need for App Store or Play Store approval
- ✅ **No signing**: No certificates or developer accounts needed

---

## 🔧 How It Works

### Service Worker:
- Auto-generated in `public/sw.js` (don't edit manually)
- Caches pages and assets for offline use
- Updates automatically on deployment

### Manifest:
- Defines app name: "Avenir Granites"
- Sets theme color: Blue (#1e40af)
- Configures display: Standalone (full-screen)
- Provides app shortcuts (Dashboard, Production, Sales)

### Caching Strategy:
- **Development**: PWA disabled (easier debugging)
- **Production**: Full PWA with caching enabled
- **Updates**: Automatic on every deployment

---

## 📊 Verification

### Check PWA Installation:
1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Check **Manifest** section - should show "Avenir Granites"
4. Check **Service Workers** - should show registered worker
5. Run **Lighthouse** audit - should score 100% on PWA

### Lighthouse PWA Checklist:
- ✅ Registers a service worker
- ✅ Responds with 200 when offline
- ✅ Contains web app manifest
- ✅ Has installable manifest
- ✅ Provides valid apple-touch-icon
- ✅ Configured for custom splash screen
- ✅ Sets theme color
- ✅ Content sized correctly for viewport

---

## ⚠️ Important Notes

### Data Safety:
- ✅ **No data changes**: All Supabase data remains untouched
- ✅ **No breaking changes**: All functionality works exactly as before
- ✅ **Desktop unchanged**: Works normally on laptop/desktop browsers
- ✅ **Authentication preserved**: Login/logout works the same

### Updates:
- Every time you deploy to Vercel, the PWA auto-updates
- Users see new version next time they open the app
- No need to uninstall/reinstall
- Background updates happen automatically

### Limitations:
- iOS Safari has limited PWA features (no push notifications)
- Android Chrome has full PWA support
- Offline mode only works for visited pages (cached content)
- First visit always requires internet

---

## 🎯 Next Steps

1. **Deploy to Vercel**: Push your changes
2. **Test on iPhone**: Install from Safari
3. **Test on Android**: Install from Chrome
4. **Customize Icons**: Replace placeholder AG icons with your logo
5. **Share**: Send Vercel URL to your team to install

---

## 🐛 Troubleshooting

### "Add to Home Screen" not showing on iPhone:
- Make sure you're using **Safari** (not Chrome)
- Must be on **HTTPS** (Vercel provides this automatically)
- Clear Safari cache and reload

### PWA not updating after deployment:
- Force refresh: Pull down to reload on iPhone
- Clear app data on Android
- Uninstall and reinstall (last resort)

### Service worker errors:
- Check browser console for errors
- Verify `public/sw.js` was generated
- Rebuild with `npm run build`

---

## 📚 Resources

- [Next PWA Documentation](https://github.com/shadowwalker/next-pwa)
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [iOS PWA Guide](https://web.dev/learn/pwa/ios/)
- [Android PWA Guide](https://web.dev/learn/pwa/installation/)

---

**Made with ❤️ for Avenir Granites**
