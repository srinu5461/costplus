# 🔥 CRITICAL FIX: Correct Uropa API Endpoint for Features

## ❌ Problem: Wrong Endpoint

**Before:** Using `/products/{code}?fields=FULL`
- Returns basic product data
- `attributes` array exists but has different structure
- Missing `featureAttributes` organization

## ✅ Solution: Use Details Endpoint

**After:** Using `/orgUsers/current/products/details/{code}`
- Returns complete product page data
- **Has `product.featureAttributes` object!**
- Pre-organized into separate arrays

---

## 📊 featureAttributes Structure

```typescript
product.featureAttributes: {
  comparisonData: [      // Technical specs
    {
      fieldCode: "COMP CAPACITY",
      fieldName: "Capacity",
      fieldType: "COMPARISONDATA",
      value: "600Ltr",
      isFeature: true
    },
    ...
  ],
  attributesData: [      // Product features (marketing bullets)
    {
      fieldCode: "DATA 1",
      fieldType: "ATTRIBUTESDATA",
      value: "Six sturdy fixed shelves maximise storage efficiency",
      isFeature: true
    },
    ...
  ],
  facetData: [          // Filter/search facets
    {
      fieldCode: "COMP COLOUR",
      fieldName: "By Colour",
      fieldType: "FACETDATA",
      value: "Silver"
    },
    ...
  ],
  hazardData: [         // Safety warnings
    {
      fieldCode: "PLUG_AU",
      fieldName: "Plug fitted",
      fieldType: "HAZARDDATA",
      value: "1x 10amp Plug"
    },
    ...
  ]
}
```

---

## 🔧 Implementation

### ✅ Correct API Call
```typescript
// Use DETAILS endpoint
const url = `${UROPA_API_BASE}/orgUsers/current/products/details/${productCode}?lang=en&curr=AUD`;
const response = await fetch(url, { 
  method: 'GET',
  headers: {
    'Authorization': formatAuthHeader(token),
    'Content-Type': 'application/json'
  }
});

const uropaResponse = await response.json();

// Extract product object
const uropaProduct = uropaResponse.product || uropaResponse;

// Extract pre-organized arrays
const featureAttributes = uropaProduct.featureAttributes || {};
const comparisonDataArray = featureAttributes.comparisonData || [];
const attributesDataArray = featureAttributes.attributesData || [];
const facetDataArray = featureAttributes.facetData || [];
const hazardDataArray = featureAttributes.hazardData || [];
```

### ✅ Build Output
```typescript
// Build comparison data object (for display)
const comparisonData = {};
comparisonDataArray.forEach(attr => {
  comparisonData[attr.fieldName || attr.fieldCode] = attr.value;
});

// Build features array (for bullet points)
const features = attributesDataArray.map(attr => attr.value);

// Combine all for storage
const allAttributes = [
  ...comparisonDataArray,
  ...attributesDataArray,
  ...facetDataArray,
  ...hazardDataArray
];
```

---

## 📝 Why This Matters

### ❌ Old Way (Wrong)
- Manually filtering `attributes` array by `fieldType`
- Structure might vary per product
- No guarantee of organization
- Missing products that don't have flat array

### ✅ New Way (Correct)
- Uropa pre-organizes everything for us
- Consistent structure across all products
- Matches the JSON structure from the Uropa website
- More reliable and future-proof

---

## 🎯 Test with CD085-A

Expected results from details endpoint:
```json
{
  "product": {
    "code": "CD085-A",
    "description": "Designed to reliably keep...",
    "summary": "350W. Total usable capacity: 469 Ltr. R600a",
    "warranty": "2 Years On-Site Parts & Labour",
    "featureAttributes": {
      "comparisonData": [13 items],
      "attributesData": [12 items],
      "facetData": [18 items],
      "hazardData": [2 items]
    }
  },
  "breadcrumbs": [...],
  "galleryImages": [...],
  ...
}
```

**This matches EXACTLY the structure in the JSON file the user provided!** 🎉

---

## ✅ Status

- [x] Updated all `/description-sync/*` endpoints to use details endpoint
- [x] Extract from `product.featureAttributes`
- [x] Process pre-organized arrays
- [x] Fallback to old structure if needed
- [x] Variable naming fixed (`allAttributes` not `uropaAttributes`)
- [x] Database save uses correct variables

**Ready to test!** 🚀
