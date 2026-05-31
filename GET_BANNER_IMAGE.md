# Get Your Existing Banner Image

## Finding Your Current Banner

Your existing banner that says **"Catering for Sydney, Melbourne and Brisbane"** is already stored in your database!

### Step 1: Check Current Banners

**Option A: Via Admin Panel (Easiest)**
1. Go to: **Admin Panel** → **Banners**
2. You should see your existing banner(s)
3. Copy the **Image URL** from the first banner
4. This is your landing page hero image!

**Option B: Via Browser Console**
1. Open your homepage: `https://costplus100.com.au`
2. Open browser console (F12 or right-click → Inspect)
3. Go to **Network** tab
4. Refresh the page
5. Find the request to `/banners`
6. Click on it and view the **Response**
7. Copy the `image` URL from the first banner

---

## Using Your Banner as Open Graph Image

Once you have the banner URL, update the SEO configuration:

### Update `/src/app/utils/seo.tsx`:

Find this line:
```tsx
image = 'https://images.unsplash.com/photo-1771360963016-1408c2de12c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920',
```

Replace it with your banner URL:
```tsx
image = 'YOUR_BANNER_IMAGE_URL_HERE',
```

Also update the `homepageSEO` object at the bottom of the file:
```tsx
export const homepageSEO: SEOConfig = {
  title: 'Costplus100 - Professional Catering Equipment Supplier Australia',
  description: 'Catering for Sydney, Melbourne and Brisbane. Shop 13,777+ professional catering equipment products. Leading brands: Polar, Thor, Apuro.',
  image: 'YOUR_BANNER_IMAGE_URL_HERE',  // ← Your banner URL
  url: 'https://costplus100.com.au',
  type: 'website',
  siteName: 'Costplus100'
};
```

---

## If You Don't Have a Banner Yet

If the banners array is empty, you can create your "Sydney, Melbourne, Brisbane" banner:

### Create the Banner via Admin Panel:

1. **Go to**: Admin → Banners → "Add New Banner"

2. **Fill in**:
   - **Title**: "Catering for Sydney, Melbourne and Brisbane"
   - **Description**: "Professional Equipment for Commercial Kitchens"
   - **Badge**: "Australia Wide" (optional)
   - **Image URL**: Upload or paste image URL
   - **Link**: `/products`
   - **Active**: ✅ Check

3. **Upload Image Options**:
   - Use the upload button to add your existing banner image
   - OR use a high-quality image with this text
   - Recommended size: 1920x1080px (16:9)

---

## Banner Image Requirements

For Google Search Results (Open Graph):
- **Minimum Size**: 1200x630px
- **Recommended Size**: 1920x1080px (16:9 aspect ratio)
- **Format**: JPG or PNG
- **Text**: Should be readable on mobile
- **File Size**: Under 2MB

---

## Quick Script to Get Banner URL

Open your browser console on your website and run:

```javascript
// Fetch current banners
fetch('/make-server-d1fbc049/banners', {
  headers: {
    'Authorization': 'Bearer YOUR_ANON_KEY'
  }
})
.then(r => r.json())
.then(banners => {
  console.log('=== YOUR BANNERS ===');
  banners.forEach((b, i) => {
    console.log(`\nBanner ${i + 1}:`);
    console.log(`Title: ${b.title}`);
    console.log(`Image URL: ${b.image}`);
    console.log(`Active: ${b.active}`);
  });
  
  if (banners.length > 0 && banners[0].image) {
    console.log('\n✅ COPY THIS URL FOR OPEN GRAPH:');
    console.log(banners[0].image);
  }
});
```

---

## After Getting the URL

1. **Copy the banner image URL**
2. **Update `/src/app/utils/seo.tsx`** with your URL
3. **Test the image**:
   - Go to: https://www.opengraph.xyz/
   - Enter: https://costplus100.com.au
   - Verify: Your "Sydney, Melbourne, Brisbane" banner appears!

4. **Submit to Google**:
   - Google Search Console → Sitemaps
   - Add: https://costplus100.com.au/sitemap.xml

---

## Alternative: Use Existing Banner Path

If your banner is stored in Supabase Storage or your server, you might have a path like:

```
https://YOUR_PROJECT.supabase.co/storage/v1/object/public/banners/hero-banner.jpg
```

Or if stored as base64 in the database, you'll see:
```
data:image/jpeg;base64,/9j/4AAQSkZJRg...
```

Both work! Just copy the full URL and use it in the SEO config.

---

**Your "Catering for Sydney, Melbourne and Brisbane" banner will then appear:**
- ✅ On your homepage (already working)
- ✅ In Google search results (new!)
- ✅ When shared on social media (new!)
- ✅ In Twitter/Facebook cards (new!)
