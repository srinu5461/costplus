# 🔍 PRICE SYNC: EXACT FIELD COMPARISON

## The 3 Key Fields

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRICE SYNC FLOW                         │
└─────────────────────────────────────────────────────────────────┘

STEP 1: Get Database Cost
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Database Product:
   {
     baseCost: 120.00      ← WE GET THIS (primary)
     costPrice: 120.00     ← Or this (fallback)
     cost: 120.00          ← Or this (fallback)
     price: 245.00         ← NOT THIS! (selling price, not cost)
   }
   
   dbCost = 120.00 ✅


STEP 2: Get Uropa API Cost
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Uropa API Response:
   {
     priceDetail: {
       priceBreakdown: [
         {
           priceB: 125.00  ← WE GET THIS! (wholesale/B2B price)
           quantity: 1
         }
       ],
       salesPrice: 250.00  ← Not this (retail price)
     }
   }
   
   uropaCost = 125.00 ✅


STEP 3: Compare
━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Database Cost:  $120.00
   Uropa Cost:     $125.00
   ─────────────────────────
   Difference:     $5.00     ← CHANGED! ✅ Update needed
   
   
STEP 4: Recalculate Selling Price
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   New Cost:       $125.00
   Tier:           $100-$300 → Add $125 markup
   ─────────────────────────
   Selling Price:  $125 + $125 = $250.00 ✅
   

STEP 5: Update Database
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Updated Product:
   {
     // COST FIELDS (Uropa wholesale price)
     baseCost: 125.00      ← UPDATED ✅
     costPrice: 125.00     ← UPDATED ✅
     cost: 125.00          ← UPDATED ✅
     
     // SELLING PRICE FIELDS (cost + markup)
     price: 250.00         ← UPDATED ✅
     salePrice: 250.00     ← UPDATED ✅
     sellingPrice: 250.00  ← UPDATED ✅
     
     // METADATA
     markup: 125.00
     markupPercent: 100
     marginPercent: 50
     
     // TIMESTAMPS
     lastPriceUpdate: "2026-03-28T10:30:00Z"
   }
```

## Visual Comparison

```
╔═══════════════════════════════════════════════════════════════╗
║                    BEFORE vs AFTER                            ║
╚═══════════════════════════════════════════════════════════════╝

Product: Commercial Oven (CW933)

BEFORE SYNC:
┏━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━┓
┃ DATABASE        ┃ UROPA API       ┃
┣━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━┫
┃ baseCost: $120  ┃ priceB: $125    ┃ ← DIFFERENT!
┃ price: $245     ┃                 ┃
┗━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━┛
         ↓
    COMPARISON
         ↓
   $125 ≠ $120  → UPDATE NEEDED!
         ↓
    RECALCULATE
         ↓
  $125 + $125 = $250
         ↓
AFTER SYNC:
┏━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━┓
┃ DATABASE        ┃ UROPA API       ┃
┣━━━━━━━━━━━━━━━━━╋━━━━━━━━━━━━━━━━━┫
┃ baseCost: $125  ┃ priceB: $125    ┃ ← MATCHING! ✅
┃ price: $250     ┃                 ┃
┗━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━┛
```

## The Critical Fix We Made

```
❌ OLD LOGIC (WRONG):
   Compare: Uropa Cost ($125) vs Database SELLING Price ($245)
   Result: ALWAYS different, always updates!
   Problem: We were comparing wholesale cost to retail price!

✅ NEW LOGIC (CORRECT):
   Compare: Uropa Cost ($125) vs Database COST ($120)
   Result: Only updates when supplier changes their wholesale price
   Solution: We check "baseCost" field FIRST, not "price"!
```

## Field Priority Order

### 1. Database Cost (checked in order):
```javascript
const dbCost = parseFloat(
  product.baseCost ||    // ← Try this FIRST
  product.costPrice ||   // ← Then this
  product.cost ||        // ← Then this
  product.basePrice ||   // ← Then this
  product.price ||       // ← LAST RESORT (might be selling price!)
  0
);
```

### 2. Uropa API Cost (checked in order):
```javascript
const uropaCost = 
  uropaProduct.priceDetail?.priceBreakdown?.[0]?.priceB ||  // ← Try this FIRST (B2B)
  uropaProduct.priceDetail?.salesPrice ||                   // ← Then this
  uropaProduct.priceDetail?.value ||                        // ← Then this
  uropaProduct.priceRange?.minPrice?.value ||               // ← Then this
  null;
```

## Why "priceB" is the Wholesale Cost

```
Uropa API uses Hybris/SAP Commerce Cloud format:

priceBreakdown[0] = First price tier
  ├─ priceA = ???
  ├─ priceB = Business/Wholesale price (what B2B customers pay)
  └─ quantity = 1

We want "priceB" because:
  ✅ It's the actual wholesale/cost price
  ✅ It's what we'd pay when buying from Uropa
  ✅ It's lower than retail (salesPrice)
  
If priceB = $125 and salesPrice = $250:
  → We use $125 (the cost)
  → We add our markup: $125 + $125 = $250 (our selling price)
```

## Summary

| Field | Location | Type | Value Example |
|-------|----------|------|---------------|
| `baseCost` | Database | Cost | $120.00 |
| `priceB` | Uropa API | Cost | $125.00 |
| `price` | Database | Selling | $245.00 → $250.00 |

**What we compare:** `baseCost` ($120) vs `priceB` ($125)  
**What we DON'T compare:** `price` ($245) vs `priceB` ($125)  
**Why:** We compare cost-to-cost, not selling-to-cost!
