# Redirects for SPA routing on Netlify

# Redirect www to non-www (update domain as needed)
https://www.costplus100.com.au/*  https://costplus100.com.au/:splat  301!

# Proxy sitemap sub-files through main domain (required for Google Search Console)
/sitemap-static.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-static.xml  200
/sitemap-products-1.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-products-1.xml  200
/sitemap-products-2.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-products-2.xml  200
/sitemap-products-3.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-products-3.xml  200
/sitemap-products-4.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-products-4.xml  200
/sitemap-products-5.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-products-5.xml  200
/sitemap-products-6.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-products-6.xml  200
/sitemap-products-7.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-products-7.xml  200
/sitemap-products-8.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-products-8.xml  200
/sitemap-products-9.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-products-9.xml  200
/sitemap-products-10.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-products-10.xml  200
/sitemap-products-11.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-products-11.xml  200
/sitemap-products-12.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-products-12.xml  200
/sitemap-products-13.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-products-13.xml  200
/sitemap-products-14.xml  https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-products-14.xml  200

# Handle all routes for SPA
/*  /index.html  200
