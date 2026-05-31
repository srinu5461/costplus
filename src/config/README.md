# Static Configuration Files

This folder contains static configuration files that control key parts of your website. These files load **instantly** without needing database/API calls.

## 📁 Files

### `header.ts` - Header/Menubar Configuration
Controls the top navigation bar, logo, phone number, and menu items.

**When to edit:**
- Change phone number or business hours
- Add/remove/reorder menu items
- Update logo URL

**Example:**
```typescript
export const headerConfig = {
  phone: '1300 667 676',
  workingHours: 'Mon-Fri: 9:00 AM - 5:00 PM AEST',
  navigation: [
    { label: 'Home', path: '/', enabled: true, order: 0 },
    { label: 'Products', path: '/products', enabled: true, order: 1 },
    // Add more menu items here...
  ],
};
```

---

### `hero.ts` - Homepage Hero Banner
Controls the hero section shown when no custom banners are configured.

**When to edit:**
- Change homepage title/subtitle
- Update hero background image
- Modify call-to-action buttons
- Edit feature highlights

**Example:**
```typescript
export const heroConfig = {
  title: 'Your Custom Title Here',
  subtitle: 'Your custom subtitle here',
  image: 'https://your-image-url.jpg',
  buttons: [
    { label: 'Shop Now', path: '/products', primary: true },
  ],
};
```

---

## 🚀 How Changes Work

1. **Edit the file** - Make your changes in `header.ts` or `hero.ts`
2. **Save the file** - Changes are instant (no database update needed)
3. **Refresh page** - Your changes appear immediately

## 🎯 Priority System

### Header (Menubar)
- ✅ **Always loads from** `header.ts` (static file)
- No API call = instant load

### Hero Banner
- **Custom banners exist?** → Shows custom banners from database
- **No custom banners?** → Shows static hero from `hero.ts`

## 💡 Tips

- Keep menu items concise (5-7 items max for best UX)
- Use high-quality images (min 1920x600 for hero)
- Test changes on mobile and desktop
- Phone number formatting: `1300 667 676` or `(03) 1234 5678`

## ⚠️ Important Notes

- These files are TypeScript (`.ts`) not JavaScript (`.js`)
- Syntax errors will break the build
- Always use proper TypeScript syntax
- Test your changes with `pnpm run build` before deploying

## 🔄 Reverting Changes

If you make a mistake:
1. Use Git to revert: `git checkout src/config/header.ts`
2. Or restore from the default configuration above

---

**Need help?** Check the inline comments in each config file for guidance.
