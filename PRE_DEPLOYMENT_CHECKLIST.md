# ✅ Pre-Deployment Checklist

## 🔍 **Run This Before Going Live**

---

## 1️⃣ **Build Test**

```bash
npm run build
```

**Expected:** Build completes without errors

❌ **If fails:** Fix the errors shown, then try again

---

## 2️⃣ **Preview Test**

```bash
npm run preview
```

**Expected:** Site opens at http://localhost:4173

### **Test These Pages:**

- [ ] Homepage loads correctly
- [ ] Product listings show all items
- [ ] Product detail page works
- [ ] Search functionality works
- [ ] Category navigation works
- [ ] Shopping cart adds/removes items
- [ ] Checkout form displays
- [ ] Customer login/signup works
- [ ] Admin panel accessible
- [ ] No console errors (press F12)

---

## 3️⃣ **API Connection Test**

Open browser console (F12) and run:

```javascript
fetch('https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/health')
  .then(r => r.json())
  .then(console.log)
```

**Expected:** `{status: "ok"}`

❌ **If fails:** Check Supabase dashboard - Edge Function might be down

---

## 4️⃣ **Environment Check**

### **Supabase Keys:**

Check `/utils/supabase/info.tsx`:

```typescript
export const projectId = "bqtzxoteoucvioxqgfpc"
export const publicAnonKey = "eyJ..."
```

**Expected:** Both values present and not empty

---

## 5️⃣ **Payment Gateway Test**

### **eWay Configuration:**

- [ ] EWAY_API_KEY set in Supabase secrets ✅
- [ ] EWAY_API_PASSWORD set in Supabase secrets ✅
- [ ] EWAY_PUBLIC_API_KEY set in Supabase secrets ✅
- [ ] EWAY_SANDBOX set in Supabase secrets ✅

Test in browser:
1. Add product to cart
2. Go to checkout
3. Click "Pay Now"
4. Should redirect to eWay payment page

---

## 6️⃣ **Email System Test**

### **SMTP Configuration:**

- [ ] SMTP_HOST set in Supabase secrets ✅
- [ ] SMTP_PORT set in Supabase secrets ✅
- [ ] SMTP_USER set in Supabase secrets ✅
- [ ] SMTP_PASSWORD set in Supabase secrets ✅

Test:
1. Complete a test order
2. Check email for order confirmation
3. Check admin email for order notification

---

## 7️⃣ **Database Check**

Visit: http://localhost:4173/admin/products

**Expected:** Products load from database

❌ **If empty:** Import products via CSV in admin panel

---

## 8️⃣ **Mobile Responsiveness**

In browser:
1. Press F12 (Developer Tools)
2. Click device icon (mobile view)
3. Test on different screen sizes:
   - [ ] 375px (iPhone SE)
   - [ ] 768px (iPad)
   - [ ] 1920px (Desktop)

**Expected:** Everything looks good on all sizes

---

## 9️⃣ **Performance Check**

Run Lighthouse audit:
1. Open DevTools (F12)
2. Go to "Lighthouse" tab
3. Run audit

**Expected Scores:**
- Performance: >80
- Accessibility: >90
- Best Practices: >90
- SEO: >90

---

## 🔟 **Security Check**

### **Verify These:**

- [ ] No sensitive keys in frontend code
- [ ] API keys stored in Supabase secrets
- [ ] HTTPS will be enabled after deploy
- [ ] Admin routes protected
- [ ] Form inputs validated

---

## 🎯 **Final Checks**

### **Content:**
- [ ] Logo and branding correct
- [ ] Contact information accurate
- [ ] Shipping rates configured
- [ ] Tax rates configured
- [ ] Privacy policy updated
- [ ] Terms & conditions updated
- [ ] About page content complete

### **Products:**
- [ ] All products have images
- [ ] Prices are correct
- [ ] Stock levels accurate
- [ ] Categories assigned
- [ ] Descriptions complete

### **Settings:**
- [ ] Company name set
- [ ] Company email set
- [ ] Payment methods enabled
- [ ] Shipping methods configured
- [ ] Email templates customized

---

## 🚀 **Ready to Deploy?**

### **If All Checks Pass:**

✅ **Vercel:**
```bash
vercel --prod
```

✅ **Netlify:**
```bash
netlify deploy --prod
```

✅ **Manual:**
```bash
npm run build
# Upload 'dist' folder contents to your host
```

---

## 🧪 **Post-Deployment Tests**

After deploying, test on your live site:

### **1. Homepage Test**
- [ ] Visit your domain
- [ ] Page loads correctly
- [ ] Images load
- [ ] No console errors

### **2. Product Test**
- [ ] Click on a product
- [ ] Product details load
- [ ] Images display
- [ ] "Add to Cart" works

### **3. Checkout Test**
- [ ] Add item to cart
- [ ] Proceed to checkout
- [ ] Fill in customer details
- [ ] Submit test order
- [ ] Verify email received

### **4. Admin Test**
- [ ] Login to /admin
- [ ] View products
- [ ] View orders
- [ ] Test all admin functions

### **5. Payment Test**
- [ ] Use eWay sandbox mode
- [ ] Process test payment
- [ ] Verify order created
- [ ] Verify email sent

---

## 📊 **Monitoring Setup**

### **After Deploy:**

1. **Set up Uptime Monitoring:**
   - Use UptimeRobot (free)
   - Monitor your domain
   - Get alerts if site goes down

2. **Set up Analytics:**
   - Google Analytics
   - Vercel Analytics
   - Track visitor behavior

3. **Set up Error Tracking:**
   - Sentry (free tier)
   - Track JavaScript errors
   - Get alerts for issues

4. **Set up Email Monitoring:**
   - Test emails weekly
   - Monitor SMTP logs
   - Check spam folder

---

## 🔄 **Update Workflow**

### **For Future Updates:**

```bash
# 1. Make changes locally
# 2. Test locally
npm run dev

# 3. Test production build
npm run build
npm run preview

# 4. Deploy
vercel --prod  # or netlify deploy --prod
```

---

## 🆘 **Rollback Plan**

### **If Something Breaks:**

**Vercel:**
```bash
# In Vercel dashboard, click "Promote to Production" on previous deployment
```

**Netlify:**
```bash
# In Netlify dashboard, click "Publish" on previous deploy
```

**Manual:**
```bash
# Re-upload previous dist folder backup
```

---

## 📝 **Important Notes**

### **Remember:**

⚠️ **Don't deploy if:**
- Build has errors
- Tests failing
- Console shows errors
- API not responding

⚠️ **Always:**
- Test locally first
- Backup database before major changes
- Keep previous dist folder as backup
- Deploy during low-traffic hours

⚠️ **Never:**
- Upload node_modules
- Commit API keys to Git
- Deploy without testing
- Change database directly in production

---

## 🎉 **You're Ready!**

### **Confidence Check:**

- [ ] ✅ All tests passed
- [ ] ✅ No errors in console
- [ ] ✅ Products loading correctly
- [ ] ✅ Payment gateway tested
- [ ] ✅ Emails working
- [ ] ✅ Mobile responsive
- [ ] ✅ Content complete

### **If All Checked:**

```bash
# Let's deploy! 🚀
vercel --prod
```

---

## 🌟 **Post-Launch Checklist**

### **First 24 Hours:**

- [ ] Monitor server logs
- [ ] Check email delivery
- [ ] Test all critical paths
- [ ] Monitor payment processing
- [ ] Watch error reports
- [ ] Check mobile traffic
- [ ] Verify search engines crawling

### **First Week:**

- [ ] Review analytics
- [ ] Check performance metrics
- [ ] Monitor uptime
- [ ] Review customer feedback
- [ ] Test under load
- [ ] Verify backups working
- [ ] Document any issues

---

## 📞 **Support Resources**

### **If Issues:**

- 📖 [DEPLOYMENT_GUIDE.md](/DEPLOYMENT_GUIDE.md)
- 🔧 [HTTP_ERRORS_FIXED.md](/HTTP_ERRORS_FIXED.md)
- 🌐 Vercel Support: https://vercel.com/support
- 🌐 Netlify Support: https://www.netlify.com/support
- 🌐 Supabase Support: https://supabase.com/dashboard/support

---

**Good luck with your launch!** 🎊🚀
