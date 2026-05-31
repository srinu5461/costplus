# Uropa Attributes Structure - FIXED ✅

## 🔍 Problem Identified
The attributes in Uropa API are **NOT a simple array**. They contain structured objects with:
- `fieldCode` - Internal code
- `fieldName` - Display name
- `fieldType` - Type of attribute
- `isFeature` - Whether it's a feature
- `value` - Actual value

## 📊 Uropa Attribute Types

### 1. **COMPARISONDATA** (Comparison Fields)
Used for technical specifications that appear in product comparison tables.

```json
{
  "fieldCode": "COMP CAPACITY",
  "fieldName": "Capacity",
  "fieldType": "COMPARISONDATA",
  "id": "comp_capacity",
  "isFeature": true,
  "value": "600Ltr"
}
```

**Examples:**
- Capacity: 600Ltr
- Dimensions: 1890(H) x 780(W) x 695(D)mm
- Power Type: 3.5A
- Temperature Range: -25°C to -10°C
- Weight: 95kg

**Purpose:** Technical specs for comparison tables

---

### 2. **ATTRIBUTESDATA** (Product Features)
These are the actual product features/selling points.

```json
{
  "fieldCode": "DATA 1",
  "fieldType": "ATTRIBUTESDATA",
  "id": "data_1",
  "isFeature": true,
  "value": "Six sturdy fixed shelves maximise storage efficiency"
}
```

**Examples:**
- "Six sturdy fixed shelves maximise storage efficiency"
- "Accurate, user-friendly digital temperature controls and display"
- "Fixed rear castors enable easy positioning for simpler cleaning"
- "LED digital temperature display and electronic controller"

**Purpose:** Marketing features and selling points

---

### 3. **FACETDATA** (Filter/Facet Fields)
Used for filtering and categorization on the frontend.

```json
{
  "fieldCode": "COMP CLEARANCECAT",
  "fieldName": "Clearance Category",
  "fieldType": "FACETDATA",
  "id": "comp_clearancecat",
  "value": "Refrigeration"
}
```

**Examples:**
- Refrigeration Capacity: 600
- Number of Doors: 1
- Door Type: Hinged
- Finish: Stainless Steel
- By Colour: Silver

**Purpose:** Frontend filtering and search facets

---

### 4. **HAZARDDATA** (Safety/Warning Info)
Safety information and warnings.

```json
{
  "fieldCode": "PLUG_AU",
  "fieldName": "Plug fitted",
  "fieldType": "HAZARDDATA",
  "id": "plug_au",
  "value": "1x 10amp Plug"
}
```

**Examples:**
- Plug fitted: 1x 10amp Plug
- Large Item: Y

**Purpose:** Safety warnings and special handling

---

## ✅ Fixed Implementation

### Backend Logic (routes-description-sync.tsx)

```typescript
const allAttributes = uropaProduct.attributes || [];

// 📊 COMPARISON DATA (Technical Specs)
const comparisonAttributes = allAttributes.filter((attr: any) => 
  attr.fieldType === 'COMPARISONDATA' && attr.isFeature === true
);

// Build comparison data object
const uropaComparisonData: any = {};
comparisonAttributes.forEach((attr: any) => {
  uropaComparisonData[attr.fieldName || attr.fieldCode] = attr.value;
});
// Result: { "Capacity": "600Ltr", "Dimensions": "1890(H)...", ... }

// 🏷️ PRODUCT FEATURES (Marketing Points)
const featureAttributes = allAttributes.filter((attr: any) => 
  attr.fieldType === 'ATTRIBUTESDATA' && attr.isFeature === true
);

// Build features array
const uropaFeatures = featureAttributes.map((attr: any) => attr.value);
// Result: ["Six sturdy fixed shelves...", "Accurate, user-friendly...", ...]

// 🔍 FACET DATA (Filters)
const facetAttributes = allAttributes.filter((attr: any) => 
  attr.fieldType === 'FACETDATA'
);
```

### Database Storage

Products are stored with:

```typescript
{
  ...product,
  
  // Raw attributes array (all types)
  attributes: allAttributes,
  
  // Extracted features array (ATTRIBUTESDATA only)
  features: ["Six sturdy fixed shelves...", "Accurate...", ...],
  
  // Comparison data object (COMPARISONDATA only)
  comparisonData: {
    "Capacity": "600Ltr",
    "Dimensions": "1890(H) x 780(W) x 695(D)mm",
    "Temperature Range": "-25°C to -10°C",
    ...
  }
}
```

---

## 🎯 How the Fixed Logic Works

### Full Sync Process:

1. **Fetch product from Uropa API**
   ```
   GET /products/{code}?lang=en&curr=AUD&fields=FULL
   ```

2. **Parse attributes by fieldType**
   - Filter `COMPARISONDATA` with `isFeature: true`
   - Filter `ATTRIBUTESDATA` with `isFeature: true`
   - Filter `FACETDATA` for search facets

3. **Store in database**
   - `attributes` → Full raw array
   - `features` → Array of feature values
   - `comparisonData` → Object with comparison fields

4. **Display on frontend**
   - Use `features[]` for bullet point features
   - Use `comparisonData{}` for specification tables
   - Use `attributes[]` for advanced filtering

---

## 🧪 Test Results

Before fix:
```
Database: Features: 0
Uropa API: Attributes: 0, Features: 0
```

After fix:
```
Database: Features: 12 (from previous sync)
Uropa API: 
  - Attributes (all): 45 total
  - COMPARISONDATA: 13 items
  - ATTRIBUTESDATA: 12 items  ← These become features!
  - FACETDATA: 18 items
  - HAZARDDATA: 2 items
```

---

## 📝 Example Product: CD085-A

### Raw Attributes Count
- Total attributes: 45
- COMPARISONDATA: 13 (Capacity, Dimensions, Power, etc.)
- ATTRIBUTESDATA: 12 (Features like "Six shelves", "LED display", etc.)
- FACETDATA: 18 (Filter fields)
- HAZARDDATA: 2 (Plug info, Large item)

### Extracted Features (ATTRIBUTESDATA only)
```
[
  "Six sturdy fixed shelves maximise storage efficiency",
  "Accurate, user-friendly digital temperature controls and display",
  "Fixed rear castors enable easy positioning for simpler cleaning",
  "Simple manual defrost function",
  "LED digital temperature display and electronic controller",
  "60mm insulation improves efficiency to further reduce running costs",
  "Lockable, reversible door improves security",
  "Net Usable Capacity: 469 Ltr",
  "Ambient temperature range: 10°C to 32°C",
  "60mm insulation reduces running costs",
  "Not suitable for use in outdoor & mobile environments",
  "Time-saving, easy-clean stainless steel construction"
]
```

### Extracted Comparison Data (COMPARISONDATA only)
```json
{
  "Capacity": "600Ltr",
  "Dimensions": "1890(H) x 780(W) x 695(D)mm",
  "Dimensions - internal": "1680(H) x 657(W) x 581(D)mm",
  "Dimensions - insulation": "60mm",
  "Finish - external": "Stainless steel",
  "Power Type": "3.5A",
  "Refrigerant": "R600a / GWP 3",
  "Temperature Range": "-25°C to -10°C",
  "Voltage": "230V",
  "Weight": "95kg",
  "Dimensions - Packed": "2100(H) x 840(W) x 760(D) mm",
  "Weight - Packed": "101 kg",
  "Warranty": "2 Years On-Site Parts & Labour"
}
```

---

## ✅ Summary

**Problem:** Was treating `attributes` as a simple array, missing the `fieldType` structure.

**Solution:** Parse attributes by `fieldType`:
- `COMPARISONDATA` → `comparisonData` object
- `ATTRIBUTESDATA` → `features` array
- `FACETDATA` → For filtering (stored in raw attributes)
- `HAZARDDATA` → For warnings (stored in raw attributes)

**Result:** Properly extracts 12 product features and 13 comparison specs from CD085-A!

🎉 **Your description sync now correctly parses Uropa attributes!**
