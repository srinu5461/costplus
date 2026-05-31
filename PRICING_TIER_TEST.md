# Pricing Tier Test Results

## How to Test:

1. **Go to Admin → Pricing Tiers**
2. **Test Single Product** - Use the test box to test individual products
3. **Update Pricing Tiers** - Modify markup percentages and save
4. **Run Bulk Update** - Click "Recalculate All Prices" to apply new tiers to all products

---

## Tier Boundaries Verification

Test these cost values to verify tier boundaries work correctly:

| Cost Price | Expected Tier | Expected Markup | Expected Selling Price |
|------------|---------------|-----------------|------------------------|
| $49.99 | Under $50 | 50% | $74.99 |
| $50.00 | $50-$99 | 45% | $72.50 |
| $99.99 | $50-$99 | 45% | $144.99 |
| $100.00 | $100-$499 | 40% | $140.00 |
| $499.99 | $100-$499 | 40% | $699.99 |
| $500.00 | $500-$999 | 30% | $650.00 |
| $999.99 | $500-$999 | 30% | $1,299.99 |
| $1,000.00 | $1000-$1999 | 20% | $1,200.00 |
| $1,999.99 | $1000-$1999 | 20% | $2,399.99 |
| $2,000.00 | $2000-$4999 | 15% | $2,300.00 |
| $4,999.99 | $2000-$4999 | 15% | $5,749.99 |
| $5,000.00 | $5000+ | 12% | $5,600.00 |
| $10,000.00 | $5000+ | 12% | $11,200.00 |

---

## Fixed Issue:

**Problem:** Tier boundary matching used `<` instead of `<=` for max value comparison, causing costs that exactly matched tier boundaries (like $50.00, $100.00, $500.00) to potentially fall into wrong tiers.

**Fix:** Changed comparison from:
```typescript
if (baseCost >= tier.min && baseCost < tier.max)
```

To:
```typescript
if (baseCost >= tier.min && baseCost <= tier.max)
```

**Impact:** Now tier boundaries are inclusive on both ends, ensuring costs like $99.99, $499.99, $999.99, etc. correctly match their respective tiers.

---

## How Pricing Works:

1. **Admin saves pricing config** → Stored in `pricing:config` in database
2. **Bulk update triggered** → Job processes all products in batches of 500
3. **For each product:**
   - Gets `tradePrice` (supplier cost)
   - Finds matching tier based on cost
   - Calculates: `sellingPrice = cost × (1 + markup%)`
   - Applies 15% minimum margin floor
   - Updates product with new price + metadata

4. **Test single product** → Preview mode, doesn't save to database

---

## Troubleshooting:

❌ **Prices not updating after tier change?**
- Make sure you clicked "Save Configuration" first
- Then click "Recalculate All Prices"
- Check job progress - it processes 500 products at a time

❌ **Wrong tier applied?**
- Use "Test Single Product" feature to verify
- Check the `tradePrice` field (this is the cost used for calculation)
- Verify tier boundaries don't overlap

✅ **Verification:**
- Test boundary values (50.00, 100.00, 500.00, etc.)
- Check that selling price = cost × (1 + markup%)
- Verify minimum 15% margin is applied
