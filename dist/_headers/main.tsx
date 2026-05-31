# Security Headers for Netlify/Vercel Deployment

/*
  # Security Headers
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  
  # HTTPS enforcement
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Cache static assets for 1 year
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Cache images for 1 month
/*.jpg
  Cache-Control: public, max-age=2592000
/*.jpeg
  Cache-Control: public, max-age=2592000
/*.png
  Cache-Control: public, max-age=2592000
/*.webp
  Cache-Control: public, max-age=2592000
/*.svg
  Cache-Control: public, max-age=2592000

# Cache fonts for 1 year
/*.woff2
  Cache-Control: public, max-age=31536000, immutable
/*.woff
  Cache-Control: public, max-age=31536000, immutable

# Don't cache HTML
/*.html
  Cache-Control: public, max-age=0, must-revalidate

# Don't cache service worker
/sw.js
  Cache-Control: public, max-age=0, must-revalidate
