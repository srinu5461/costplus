# 📌 Static Configuration Guide

This guide explains how to edit your website's menubar and hero banner using static configuration files.

## ✅ What This Solves

**Problem:** Before, the menubar and hero banner loaded from the database via API calls, causing delays.

**Solution:** Now they load from static files in `/src/config/` - instant load, no API needed!

## 📂 Configuration Files Location

```
src/config/
├── header.ts    ← Menubar configuration
├── hero.ts      ← Hero banner configuration
└── README.md    ← Detailed documentation
```

## 🎯 Quick Edit Guide

### Edit Menubar (Header)

**File:** `src/config/header.ts`

```typescript
export const headerConfig = {
  phone: '1300 667 676',                    // ← Change phone number here
  workingHours: 'Mon-Fri: 9:00 AM - 5:00 PM AEST',  // ← Change hours here
  navigation: [
    { label: 'Home', path: '/', enabled: true, order: 0 },
    { label: 'Products', path: '/products', enabled: true, order: 1 },
    // Add more menu items here ↓
  ],
};
```

### Edit Hero Banner

**File:** `src/config/hero.ts`

```typescript
export const heroConfig = {
  title: 'Your Title Here',               // ← Change title
  subtitle: 'Your subtitle here',          // ← Change subtitle
  image: 'https://your-image.jpg',         // ← Change background image
  buttons: [
    { label: 'Shop Now', path: '/products', primary: true },
  ],
};
```

## 🔄 How Changes Apply

1. **Edit file** → Save changes
2. **Build** → Run `pnpm run build` (or your build will auto-trigger)
3. **Deploy** → Changes appear immediately on refresh

**No database update needed!** 🎉

## 💡 When Each Is Used

### Menubar (Header)
- **Always shows:** Content from `header.ts`
- **Loads:** Instantly (no API call)

### Hero Banner
- **Has custom banners in database?** → Shows those
- **No custom banners?** → Shows static hero from `hero.ts`

## 🛠️ Testing Your Changes

```bash
# Build and check for errors
pnpm run build

# If successful, you'll see:
# ✓ built in XXs
```

## ⚠️ Common Mistakes

❌ **Wrong:** Deleting commas or quotes  
✅ **Right:** Keep the syntax exactly as shown

❌ **Wrong:** Using wrong file extension (`.js` instead of `.ts`)  
✅ **Right:** Files must be `.ts` (TypeScript)

❌ **Wrong:** Breaking JSON/TypeScript syntax  
✅ **Right:** Run build to check for errors

## 🆘 Need Help?

- Check `/src/config/README.md` for detailed documentation
- Look at existing config files for examples
- Run `pnpm run build` to check for syntax errors

---

**Happy editing! 🚀**
