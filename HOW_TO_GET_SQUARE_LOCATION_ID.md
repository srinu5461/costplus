# How to Get Your Square Location ID (for Australian Postcodes)

## Why You Need This

Square needs a **Location ID** to know which country's postcode format to use. Without it, Square defaults to US format (5-digit ZIP codes) and rejects Australian 4-digit postcodes.

## Step-by-Step Instructions

### For Sandbox (Testing)

1. Go to https://developer.squareup.com/apps
2. Select your app
3. Click **Locations** in the left sidebar
4. You should see a list of test locations
5. **If you don't have an Australian location:**
   - Click **Add Location**
   - Enter an Australian address (any valid AU address will work for testing)
   - Example:
     ```
     Name: Test Store Sydney
     Address: 123 George Street
     City: Sydney
     State: NSW
     Postcode: 2000
     Country: Australia
     ```
   - Click **Save**
6. Click on your Australian location
7. Copy the **Location ID** (starts with something like `L...`)
8. Add this to Supabase:
   ```
   SQUARE_LOCATION_ID=L1234567890ABC
   ```

### For Production

1. Go to https://squareup.com/dashboard
2. Click on **Account & Settings** (gear icon)
3. Navigate to **Business** → **Locations**
4. **If you don't have an Australian location yet:**
   - Click **Add location**
   - Enter your real Australian business address
   - Click **Save**
5. Click on your Australian location
6. Click **Settings**
7. Copy the **Location ID** (starts with something like `L...`)
8. Add this to Supabase production environment:
   ```
   SQUARE_LOCATION_ID=L9876543210XYZ
   ```

## Common Mistakes

❌ **Using the wrong location ID:**
- If you use a US location ID, Square will expect 5-digit ZIP codes
- Make sure the location has an Australian address

❌ **Not adding to environment variables:**
- The Location ID must be in Supabase Edge Functions environment variables
- Just having it in Square dashboard doesn't help

❌ **Mixing sandbox and production:**
- Sandbox Location ID only works in sandbox mode
- Production Location ID only works in production mode
- Make sure they match!

## How to Verify It's Working

1. Add the `SQUARE_LOCATION_ID` environment variable to Supabase
2. Redeploy your Edge Functions (manually trigger `.deploy-trigger` files)
3. Go to your checkout page
4. Select Square payment method
5. The postcode field should now accept 4 digits (e.g., `2000`)
6. Try entering a test payment with:
   - Card: `4111 1111 1111 1111`
   - CVV: `123`
   - Expiry: `12/25`
   - **Postcode: `2000`** (4 digits - should work!)

## Still Having Issues?

Check the browser console (F12) for error messages:
- ✅ "Square payment form attached (AU location ID used)" = Working correctly
- ❌ "Invalid postcode" or "ZIP must be 5 digits" = Location ID missing or incorrect

## Quick Reference

**Sandbox Location ID Example:** `LTEST1234ABC`
**Production Location ID Example:** `L9876543XYZ`

Both start with `L` followed by alphanumeric characters.

---

**Need more help?**
- Square Location API Docs: https://developer.squareup.com/reference/square/locations-api
- Square Support: https://squareup.com/help/contact
