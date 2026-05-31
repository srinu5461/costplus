# Setup Default Hero Banner

## ✅ AUTOMATIC SYSTEM - Your Banner is Already Set!

**Good news!** Your system automatically uses your **first active banner** as the Open Graph image for Google search results.

Your banner that says **"Catering for Sydney, Melbourne and Brisbane"** will automatically appear in:
- ✅ Google search results
- ✅ Facebook shares
- ✅ LinkedIn shares
- ✅ Twitter cards
- ✅ Homepage hero carousel

---

## How It Works (Automatic)

The system automatically:
1. **Fetches** your first active banner from the database
2. **Caches** it for 1 hour for performance
3. **Sets** it as the Open Graph image in meta tags
4. **Updates** whenever you change banners in Admin Panel

**No manual configuration needed!**

---

## Your Current Banner Setup

### Check Your Banner:
Go to: **Admin → Banners**

You should see your banner with:
- **Title**: "Catering for Sydney, Melbourne and Brisbane"
- **Image**: Your hero banner image
- **Active**: ✅ (must be checked)
- **Order**: 0 (first position)

---

## If You Need to Update the Banner

### Option 1: Upload New Image
1. **Admin → Banners** → Select your first banner
2. Click **"Upload"** button
3. Choose your updated banner image
4. Click **"Save All"**
5. Clear cache: **Admin Dashboard → Clear Cache**

### Option 2: Use Image URL
1. **Admin → Banners** → Select your first banner
2. Paste image URL in the **"Image"** field
3. Click **"Save All"**
4. Clear cache: **Admin Dashboard → Clear Cache**

---

## Banner Image Requirements

For Google Search Results (Open Graph):
- **Minimum Size**: 1200x630px
- **Recommended Size**: 1920x1080px (16:9 aspect ratio)
- **Format**: JPG or PNG
- **File Size**: Under 2MB for fast loading
- **Text**: Should be readable on mobile devices
- **Content**: Clear brand message (e.g., "Catering for Sydney, Melbourne and Brisbane")

---

## Verify Your Setup

### Test Open Graph Image:
1. Go to: https://www.opengraph.xyz/
2. Enter: `https://costplus100.com.au`
3. Click **"Preview"**
4. Verify: Your "Sydney, Melbourne, Brisbane" banner appears!

### Test on Social Media:
1. **Facebook**: Share your homepage link
2. **LinkedIn**: Post your homepage link
3. **Twitter**: Tweet your homepage link
4. All should show your banner image!

---

## Multiple Banners (Carousel)

You can have multiple banners that rotate on the homepage:

### Add More Banners:
1. **Admin → Banners** → Click **"Add New Banner"**
2. Fill in details for Banner #2, #3, etc.
3. **Important**: The **FIRST** banner is used for Google/Social media
4. All active banners appear in homepage carousel

### Banner Ideas:
1. **"Catering for Sydney, Melbourne and Brisbane"** (Current - keep as #1!)
2. "Shop Polar Refrigeration - From $299"
3. "Thor Commercial Fryers - Premium Quality"
4. "Apuro Food Warmers - In Stock Now"
5. "13,777+ Products - FREE Shipping over $200"

---

## Troubleshooting

### Banner Not Showing in Google Preview?

**Solution 1: Clear Cache**
```
Admin Dashboard → Clear Cache → "Clear Homepage Cache"
```

**Solution 2: Ensure Banner is Active**
```
Admin → Banners → Check first banner has Active ✅
```

**Solution 3: Wait for Cache Refresh**
- OG image cache refreshes every 1 hour
- Or clear your browser cache and refresh

**Solution 4: Verify Image URL**
```
- Image must start with http:// or https://
- OR be a valid data:image/... base64 string
- No placeholder images allowed
```

---

## SEO Description Update

Your homepage now says:
> "**Catering for Sydney, Melbourne and Brisbane.** Shop 13,777+ professional catering equipment products..."

This includes your key cities in the SEO description for better local search results!

---

## Advanced: Manual Override

If you need to use a different image for OG (not the first banner):

Edit `/src/app/utils/seo.tsx`:
```tsx
export const homepageSEO: SEOConfig = {
  title: 'Costplus100 - Professional Catering Equipment Supplier Australia',
  description: 'Catering for Sydney, Melbourne and Brisbane...',
  image: 'YOUR_SPECIFIC_IMAGE_URL',  // ← Add this line
  url: 'https://costplus100.com.au',
  type: 'website',
  siteName: 'Costplus100'
};
```

---

## ✅ Summary

✨ **Your system is already configured!**

- ✅ First banner automatically used for Google/Social
- ✅ "Sydney, Melbourne, Brisbane" in SEO description
- ✅ 1-hour cache for performance
- ✅ Updates when you change banners
- ✅ Works for all pages (homepage, products, categories)

**Just make sure your first banner in Admin → Banners is active and has a valid image!**
