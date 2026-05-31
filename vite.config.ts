import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Plugin to handle figma:asset imports for localhost development
function figmaAssetPlugin() {
  return {
    name: 'figma-asset-resolver',
    enforce: 'pre' as const, // Run before other plugins
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        // Return a virtual module ID with null character to prevent Vite from trying to load it as a file
        return '\0' + id
      }
    },
    load(id: string) {
      if (id.startsWith('\0figma:asset/')) {
        // Remove the null character prefix
        const assetId = id.slice(1)
        // Return a placeholder image URL or data URI
        // For localhost, we'll use a placeholder from Unsplash
        const placeholders: Record<string, string> = {
          // Logo images (Costplus100 logo) - matches various logo asset hashes
          '2f423d8babbd0bd599e3440c35f6aab4dd9f54a0.png': 'https://via.placeholder.com/200x60/2D3748/FFFFFF?text=Costplus100',
          '1cd922824a5418f9ad0358d3fe1d474395d2a7ff.png': 'https://via.placeholder.com/200x60/2D3748/FFFFFF?text=Costplus100',
          '1c0922824a5418f0ad0355d1fe1dd74395d2a7ff.png': 'https://via.placeholder.com/200x60/2D3748/FFFFFF?text=Costplus100',
          // Banner image
          '4b2ef7ba2ca8c7c628363f35b53b2c502b882d0b.png': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&h=400&fit=crop',
        }
        
        const filename = assetId.replace('figma:asset/', '')
        
        // Default placeholder based on file extension
        const defaultPlaceholder = filename.includes('logo') || filename.endsWith('.png')
          ? 'https://via.placeholder.com/200x60/2D3748/FFFFFF?text=Costplus100'
          : 'https://via.placeholder.com/800x400/2D3748/FFFFFF?text=Image'
        
        const placeholderUrl = placeholders[filename] || defaultPlaceholder
        
        return `export default "${placeholderUrl}"`
      }
    },
  }
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    figmaAssetPlugin(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv', '**/*.gif', '**/*.eot', '**/*.ttf', '**/*.woff', '**/*.woff2'],

  // Dependency optimization
  optimizeDeps: {
    exclude: ['slick-carousel'], // Exclude slick-carousel from optimization due to font asset issues
  },

  // Build optimizations
  build: {
    // Production optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // TEMPORARILY keep console.log for debugging
        drop_debugger: true,
      },
    },

    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - split large libraries
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-popover',
          ],
          'mui-vendor': [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled',
          ],
          'editor-vendor': ['react-quill'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },

    // Increase chunk size warning limit to 1000kb (we're splitting now)
    chunkSizeWarningLimit: 1000,

    // Source maps for production debugging (optional - set to false for smaller builds)
    sourcemap: false,

    // Asset optimization
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb as base64
  },
})