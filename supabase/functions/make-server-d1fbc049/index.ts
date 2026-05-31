// Edge function entry point for make-server-d1fbc049
// This imports the main application from the server directory and serves it

import { app } from "../server/index.tsx";

const DEPLOYED_VERSION = 'v1.0.0-ADD-PRODUCTS-DIAGNOSTIC-' + Date.now();
console.log('🚀 [Edge Function] Starting make-server-d1fbc049');
console.log('📦 [Edge Function] Version:', DEPLOYED_VERSION);

// Serve the Hono app using Deno's serve function
Deno.serve((req) => {
  return app.fetch(req);
});
