// Trigger CDN sync via the edge function API
const SUPABASE_URL = 'https://bqtzxoteoucvioxqgfpc.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1/make-server-d1fbc049`;

// Use the admin API key (same as X-API-Key in admin panel)
const API_KEY = 'costplus-admin-2024';

async function main() {
  console.log('Triggering CDN sync...');

  const res = await fetch(`${API_BASE}/sync-products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjYwMDIsImV4cCI6MjA4ODM0MjAwMn0.pA7ee5_HGRPZ0WqB-hYVEKS_-mNEZ3iQqXgqkCFt_Ds`
    },
    body: JSON.stringify({})
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);

  if (res.status === 200 || res.status === 202) {
    console.log('\nSync started! Checking status...');
    await new Promise(r => setTimeout(r, 3000));

    const status = await fetch(`${API_BASE}/sync-products/status`, {
      headers: { 'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjYwMDIsImV4cCI6MjA4ODM0MjAwMn0.pA7ee5_HGRPZ0WqB-hYVEKS_-mNEZ3iQqXgqkCFt_Ds` }
    });
    const statusText = await status.text();
    console.log('Sync status:', statusText);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
