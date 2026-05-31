# 📋 Uropa API JSON Structure - Complete Analysis

## 🔍 Based on Real Product: CD085-A (Polar Freezer 600L)

---

## 📦 Top-Level Structure

```json
{
  "breadcrumbs": [...],           // Category breadcrumb trail
  "galleryImages": [...],         // Additional gallery images
  "isClearance": false,
  "metatags": [...],             // SEO meta tags
  "pageTitle": "...",
  "pageType": "PRODUCT",
  "pdpUrl": "...",               // API URL for product details
  "product": {                   // ⭐ MAIN PRODUCT DATA HERE
    ...
  }
}
```

---

## 🎯 Product Object Structure (Key Fields)

### Basic Information
```json
{
  "code": "CD085-A",                           // Product code/SKU
  "name": "Polar C-Series Upright Freezer 600Ltr",
  "manufacturer": "Polar",
  "brand": "/polar/_/a33-1",
  "ageRestricted": false,
  "approved": true,
  "purchasable": true
}
```

### Description Fields
```json
{
  "description": "Designed to reliably keep large quantities...<br/><br/>...",  // ⭐ Main HTML description
  "summary": "350W. Total usable capacity: 469 Ltr. R600a",                    // ⭐ Short summary
  "warranty": "2 Years On-Site Parts & Labour"                                  // ⭐ Warranty info
}
```

**Note:** The description contains HTML formatting with `<br/><br/>` tags.

---

## 🏷️ Attributes Array Structure

This is the **MOST IMPORTANT** part for features/specs sync!

### Array Location
```json
product.attributes: [...]   // Array of attribute objects
```

### Attribute Types (fieldType)

#### 1️⃣ **COMPARISONDATA** (Technical Specifications)
Used in comparison tables and technical specs sections.

```json
{
  "fieldCode": "COMP CAPACITY",
  "fieldName": "Capacity",                    // ⭐ Display name
  "fieldType": "COMPARISONDATA",
  "id": "comp_capacity",
  "isFeature": true,                          // ⭐ Mark as important
  "value": "600Ltr"                           // ⭐ Actual value
}
```

**CD085-A has 13 COMPARISONDATA attributes:**
- Capacity, Dimensions, Dimensions - internal, Dimensions - insulation
- Finish - external, Power Type, Refrigerant, Temperature Range
- Voltage, Weight, Dimensions - Packed, Weight - Packed, Warranty

---

#### 2️⃣ **ATTRIBUTESDATA** (Product Features)
Marketing features and selling points - these are the bullet points!

```json
{
  "fieldCode": "DATA 1",                      // Generic code
  "fieldType": "ATTRIBUTESDATA",
  "id": "data_1",
  "isFeature": true,                          // ⭐ Always true
  "value": "Six sturdy fixed shelves maximise storage efficiency"  // ⭐ Feature text
}
```

**CD085-A has 12 ATTRIBUTESDATA features:**
1. "Six sturdy fixed shelves maximise storage efficiency"
2. "Accurate, user-friendly digital temperature controls and display"
3. "Fixed rear castors enable easy positioning for simpler cleaning and installation"
4. "Simple manual defrost function - choose when to defrost to keep fridge performing at its best"
5. "LED digital temperature display and electronic controller for easy operation"
6. "60mm insulation improves efficiency to further reduce running costs"
7. "Lockable, reversible door improves security and allows for easy access in cramped spaces"
8. "Net Usable Capacity: 469 Ltr"
9. "Ambient temperature range: 10°C to 32°C"
10. "60mm insulation reduces running costs, improves energy efficiency and boosts performance"
11. "Not suitable for use in outdoor & mobile environments including catering vehicles."
12. "Time-saving, easy-clean stainless steel construction"

**⚠️ Important:** ATTRIBUTESDATA items don't have `fieldName`, only `fieldCode` and `value`!

---

#### 3️⃣ **FACETDATA** (Filter/Facet Fields)
Used for filtering and search facets on category pages.

```json
{
  "fieldCode": "COMP FRIDGECAPACITY",
  "fieldName": "Refrigeration Capacity",
  "fieldType": "FACETDATA",                   // ⭐ Filter data
  "id": "comp_fridgecapacity",
  "value": "600"
}
```

**CD085-A has 22 FACETDATA attributes:**
- Clearance Category, Refrigeration Capacity, Number of Doors, Door Type
- Refrigeration Finish, Refrigeration Function, Fuel Type, By Colour
- By GN Size, Capacity in litres, Featured Product, Height
- Type, Width, Tropical Refrigeration, Cooling, Light Source
- Number of Shelves, Number of Reviews, Range, Brand Ranking
- Temperature Range, Wattage, Depth, Feet, Energy Rating, Mobility

---

#### 4️⃣ **HAZARDDATA** (Safety Warnings)
Safety and shipping information.

```json
{
  "fieldCode": "PLUG_AU",
  "fieldName": "Plug fitted",
  "fieldType": "HAZARDDATA",                  // ⭐ Safety info
  "id": "plug_au",
  "value": "1x 10amp Plug"
}
```

**CD085-A has 2 HAZARDDATA attributes:**
- Plug fitted: "1x 10amp Plug"
- Large Item: "Y"

---

## 🎨 Images Structure

```json
product.images: [
  {
    "altText": "CD085-A",
    "format": "product",                      // Options: product, thumbnail, thumbnail2, cartIcon, superZoom
    "imageType": "PRIMARY",                   // Options: PRIMARY, GALLERY
    "localisedAltText": "Polar C-Series Stainless Steel Upright Freezer - 600Ltr",
    "url": "https://media.nisbets.com/asset/core/prodimage/large_new/cd084_cd085-upd24-1.jpg",
    "galleryIndex": 0                         // Only for GALLERY images
  }
]
```

**CD085-A has:**
- 4 PRIMARY images (different formats of main image)
- 18 GALLERY images (6 gallery items × 3 formats each)

---

## 📄 Documents/Attachments

```json
product.documents: [
  {
    "altText": "Download User Manual",
    "format": "MEDIA ZMANUAL",                // Options: ZMANUAL, PRODINFOSHEET, ZDIAGRAM, ZSPEC SHEET
    "url": "https://media.nisbets.com/asset/au/media/user manual 600-400-150l series2.pdf"
  }
]
```

**CD085-A has 4 documents:**
- User Manual (PDF)
- Product Information Sheet (PDF)
- Exploded Diagram (PDF)
- Spec Sheet/CAD Drawing (PDF)

---

## 🏢 Brand/Category Information

```json
product.brandLogo: {
  "altText": "Polar",
  "format": "category-image",
  "url": "https://media.nisbets.com/asset/en/brand/large/polar.jpg"
}

product.categories: [
  {
    "code": "Polar",
    "isBrand": true,                          // ⭐ Brand category
    "name": "Polar",
    "url": "/polar/_/a33-1"
  },
  {
    "code": "12635",
    "isBrand": false,                         // ⭐ Regular category
    "name": "Upright Freezers",
    "url": "/refrigeration-and-ice-machines/freezers/upright-freezers/_/a33-3"
  }
]
```

---

## 💰 Price Structure

```json
product.priceDetail: {
  "currencyISOCode": "AUD",
  "formattedSalesPrice": "$1,899.90",
  "salesPrice": 1899.90,
  "wasPrice": "$2,749.90",
  "wasPriceValue": 2749.90,
  "calculatedSavingFlash": "31%",
  "hasPriceBreaks": false,
  "priceBreakdown": [...]
}
```

---

## 📊 Stock/Availability

```json
product.availabilityMessage: {
  "alternativesShown": false,
  "buyButtonShown": true,
  "imageURL": "https://media.nisbets.com/images/availability/en/inStock.png",
  "message": "In Stock",
  "messageEnum": "AM_IN_STOCK"
}

product.stock: {
  "stockLevelStatus": "inStock"
}
```

---

## 🚩 Important Flags

```json
{
  "hasFeatureAttributes": true,              // ⭐ Has ATTRIBUTESDATA items
  "hasWarranty": true,                       // ⭐ Has warranty info
  "ageRestricted": false,                    // ⭐ Age restriction (for knives, etc.)
  "isClearance": false,
  "isProductCompare": false,
  "newProduct": false,
  "variant": false
}
```

---

## 🎯 Key Insights for Description Sync

### ✅ What We Should Sync

1. **Main Description**
   - `product.description` → Store as `description`
   - HTML formatted with `<br/><br/>` tags

2. **Summary**
   - `product.summary` → Store as `shortDescription`

3. **Features (from ATTRIBUTESDATA)**
   ```typescript
   const features = product.attributes
     .filter(attr => attr.fieldType === 'ATTRIBUTESDATA' && attr.isFeature === true)
     .map(attr => attr.value);
   ```
   Store as: `features[]` array

4. **Comparison Data (from COMPARISONDATA)**
   ```typescript
   const comparisonData = {};
   product.attributes
     .filter(attr => attr.fieldType === 'COMPARISONDATA' && attr.isFeature === true)
     .forEach(attr => {
       comparisonData[attr.fieldName] = attr.value;
     });
   ```
   Store as: `comparisonData{}` object

5. **Raw Attributes**
   - Store complete `product.attributes` array for future use

6. **Warranty**
   - `product.warranty` → Store separately or in comparisonData

---

## ⚠️ Common Pitfalls

### ❌ WRONG: Looking for top-level fields
```typescript
const features = uropaProduct.features;  // ❌ Doesn't exist!
const shortDescription = uropaProduct.shortDescription;  // ❌ Doesn't exist!
```

### ✅ CORRECT: Parse from attributes array
```typescript
const features = uropaProduct.attributes
  .filter(attr => attr.fieldType === 'ATTRIBUTESDATA' && attr.isFeature === true)
  .map(attr => attr.value);

const shortDescription = uropaProduct.summary || '';
```

---

## 📊 CD085-A Product Summary

| Field | Count/Value |
|-------|-------------|
| **Total Attributes** | 45 |
| - COMPARISONDATA | 13 (technical specs) |
| - ATTRIBUTESDATA | 12 (features) ⭐ |
| - FACETDATA | 18 (filters) |
| - HAZARDDATA | 2 (safety) |
| **Images** | 22 (4 primary + 18 gallery) |
| **Documents** | 4 (manuals, diagrams, specs) |
| **Categories** | 3 (1 brand + 2 regular) |
| **Description Length** | 793 characters (HTML) |
| **Has Features** | true |
| **Has Warranty** | true |

---

## 🎯 Implementation Status

### ✅ Currently Implemented (Fixed)
```typescript
// Extract attributes by fieldType
const allAttributes = uropaProduct.attributes || [];

// COMPARISONDATA → comparisonData object
const comparisonAttributes = allAttributes.filter(attr => 
  attr.fieldType === 'COMPARISONDATA' && attr.isFeature === true
);

// ATTRIBUTESDATA → features array
const featureAttributes = allAttributes.filter(attr => 
  attr.fieldType === 'ATTRIBUTESDATA' && attr.isFeature === true
);

// Build outputs
const comparisonData = {};
comparisonAttributes.forEach(attr => {
  comparisonData[attr.fieldName] = attr.value;
});

const features = featureAttributes.map(attr => attr.value);
```

### 📝 Database Storage
```typescript
{
  ...product,
  description: uropaProduct.description,              // Main HTML description
  shortDescription: uropaProduct.summary,             // Short summary
  features: features,                                 // Array of feature strings
  attributes: allAttributes,                          // Raw attributes array
  comparisonData: comparisonData,                     // Object with comparison fields
  warranty: uropaProduct.warranty                     // Warranty string
}
```

---

## 🧪 Test with CD085-A

Expected results when testing product **CD085-A**:

```json
{
  "code": "CD085-A",
  "name": "Polar C-Series Upright Freezer 600Ltr",
  "description": "Designed to reliably keep large quantities of foods...",
  "descriptionLength": 793,
  "shortDescription": "350W. Total usable capacity: 469 Ltr. R600a",
  "features": [
    "Six sturdy fixed shelves maximise storage efficiency",
    "Accurate, user-friendly digital temperature controls and display",
    // ... 10 more features
  ],
  "featuresCount": 12,
  "comparisonData": {
    "Capacity": "600Ltr",
    "Dimensions": "1890(H) x 780(W) x 695(D)mm",
    "Temperature Range": "-25°C to -10°C",
    // ... 10 more fields
  },
  "comparisonDataCount": 13,
  "attributes": [...],  // All 45 raw attributes
  "warranty": "2 Years On-Site Parts & Labour"
}
```

---

## 🎉 Summary

The Uropa API uses a **structured attributes array** with different `fieldType` values:
- **COMPARISONDATA** → Technical specs for comparison tables
- **ATTRIBUTESDATA** → Marketing features (bullet points) ⭐
- **FACETDATA** → Filter/search facets
- **HAZARDDATA** → Safety warnings

Our Description Sync now correctly parses this structure and extracts the right data! 🚀
