# Square Payment Gateway Setup

## Environment Variables Required

Add these environment variables to your Supabase project:

### 1. Square Application ID (Public Key)
```
SQUARE_APPLICATION_ID=your_square_application_id_here
```
- **Sandbox:** Get from https://developer.squareup.com/apps → Your App → Credentials → Sandbox Application ID
- **Production:** Get from https://developer.squareup.com/apps → Your App → Credentials → Production Application ID

### 2. Square Access Token (Secret Key)
```
SQUARE_ACCESS_TOKEN=your_square_access_token_here
```
- **Sandbox:** Get from https://developer.squareup.com/apps → Your App → Credentials → Sandbox Access Token
- **Production:** Get from https://developer.squareup.com/apps → Your App → Credentials → Production Access Token

### 3. Square Location ID (REQUIRED for Australian Postcodes)
```
SQUARE_LOCATION_ID=your_square_location_id_here
```
- **IMPORTANT:** This tells Square to use Australian format (4-digit postcodes instead of 5-digit US ZIP codes)
- **Sandbox:** Get from https://developer.squareup.com/apps → Your App → Locations → Select your Australian location → Copy Location ID
- **Production:** Get from Square Dashboard → Locations → Select your Australian location → Settings → Location ID
- If you don't have an Australian location yet:
  1. Go to Square Dashboard
  2. Navigate to Account & Settings → Business → Locations
  3. Add a new location with an Australian address
  4. Copy the Location ID

### 4. Square Sandbox Mode (Optional)
```
SQUARE_SANDBOX=true
```
- Set to `true` for sandbox/test mode
- Set to `false` or remove for production mode
- Can also be toggled in Admin → Payment Settings

## How to Add Environment Variables to Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions**
3. Click **Add Secret**
4. Add each environment variable:
   - Name: `SQUARE_APPLICATION_ID`
   - Value: Your Square application ID
   - Click **Create Secret**
5. Repeat for `SQUARE_ACCESS_TOKEN`
6. **IMPORTANT:** Add `SQUARE_LOCATION_ID` with your Australian location ID
   - This is REQUIRED for 4-digit Australian postcode support
   - Without this, Square will expect US 5-digit ZIP codes
7. Optionally add `SQUARE_SANDBOX` (defaults to `true` if not set)

## Admin Panel Configuration

After adding environment variables, configure Square in the admin panel:

1. Go to **Admin → Payment Settings**
2. Find the **Square Payment Gateway** section
3. Toggle **Enable** to activate Square payments
4. Toggle **Sandbox Mode** to switch between test and live environments
   - **Sandbox Mode ON:** Uses Square sandbox environment (test payments)
   - **Sandbox Mode OFF:** Uses Square production environment (real payments)
5. Click **Save Payment Settings**

## Testing Square Payments

### Sandbox Test Cards

When in Sandbox mode, use these test card numbers:

**Successful Payment:**
- Card: `4111 1111 1111 1111`
- CVV: Any 3 digits (e.g., `123`)
- Expiry: Any future date (e.g., `12/25`)
- Postcode: **Enter a valid 4-digit Australian postcode** (e.g., `2000`, `3000`, `4000`)
  - The postcode field accepts Australian 4-digit format
  - Match it with your shipping address state for consistency
  - The billing address with AU country code is sent automatically

**Card Declined:**
- Card: `4000 0000 0000 0002`
- Will be declined by Square

**More test cards:** https://developer.squareup.com/docs/devtools/sandbox/payments

### Testing Flow

1. Enable Square in Admin → Payment Settings
2. Ensure Sandbox Mode is ON
3. Add products to cart and proceed to checkout
4. Select **Square Payment** as payment method
5. Enter test card details
6. Complete payment
7. Verify order appears in Admin → Orders

## Going Live

Before accepting real payments:

1. **Get Production Credentials:**
   - Go to https://developer.squareup.com/apps
   - Select your app
   - Switch to **Production** tab
   - Copy Production Application ID and Access Token

2. **Update Environment Variables:**
   - Update `SQUARE_APPLICATION_ID` with production ID
   - Update `SQUARE_ACCESS_TOKEN` with production token

3. **Update Admin Settings:**
   - Go to Admin → Payment Settings
   - Turn OFF Sandbox Mode
   - Click Save

4. **Test with Real Card:**
   - Make a small test purchase with a real card
   - Verify payment processes correctly
   - Check Square dashboard for the transaction

## Troubleshooting

### "Square is not configured"
- Check that `SQUARE_APPLICATION_ID` environment variable is set
- Check that `SQUARE_ACCESS_TOKEN` environment variable is set
- Check that `SQUARE_LOCATION_ID` environment variable is set
- Redeploy Edge Functions after adding variables

### "Invalid postcode" or "ZIP code must be 5 digits"
- **This means SQUARE_LOCATION_ID is missing or incorrect**
- Add your Australian Square Location ID to environment variables
- The location ID tells Square to use Australian format (4 digits)
- Without it, Square defaults to US format (5 digits)
- Get Location ID from Square Dashboard → Locations → Your Australian Location → Settings

### Payment fails with "Invalid credentials"
- Verify you're using the correct credentials for the mode (sandbox vs production)
- Ensure Application ID matches Access Token environment (both sandbox or both production)
- Check Admin panel Sandbox Mode matches your environment variables

### "verificationDetails.intent is required" error
- This error has been fixed in the latest version
- The tokenization now includes all required verification details:
  - `intent: 'CHARGE'` - indicates payment charge
  - `customerInitiated: true` - customer is initiating payment
  - `sellerKeyedIn: false` - customer enters card details (not seller)
- If you still see this error, clear browser cache and refresh

### Square payment form doesn't load
- Check browser console for errors
- Verify Square SDK is loading (check Network tab)
- Clear browser cache and try again

### Payment processes but order doesn't save
- Check Edge Function logs in Supabase
- Verify database permissions
- Check email configuration if confirmation emails aren't sending

## Security Notes

- **Never commit** your Square Access Token to version control
- Store credentials only in Supabase environment variables
- Use Sandbox mode for all development and testing
- Monitor your Square dashboard for suspicious activity
- Rotate credentials if compromised

## Support

- Square Developer Docs: https://developer.squareup.com/docs
- Square Support: https://squareup.com/help
- Test your integration: https://developer.squareup.com/docs/testing/test-values
