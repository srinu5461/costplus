// Utility script to reset pickup locations to default
// Run this once to ensure all locations have proper state fields

import * as kv from './kv_custom.tsx';

const PICKUP_LOCATIONS_KEY = 'pickup_locations_list';

const defaultLocations = [
  { 
    id: '1', 
    name: 'Sydney Warehouse', 
    address: '123 Industrial Ave, Sydney NSW 2000',
    state: 'NSW',
    hours: 'Mon-Fri: 8AM-5PM',
    active: true,
    createdAt: new Date().toISOString()
  },
  { 
    id: '2', 
    name: 'Melbourne Distribution Center', 
    address: '456 Commerce St, Melbourne VIC 3000',
    state: 'VIC',
    hours: 'Mon-Fri: 9AM-6PM',
    active: true,
    createdAt: new Date().toISOString()
  },
  { 
    id: '3', 
    name: 'Brisbane Depot', 
    address: '789 Logistics Rd, Brisbane QLD 4000',
    state: 'QLD',
    hours: 'Mon-Fri: 8AM-4PM',
    active: true,
    createdAt: new Date().toISOString()
  },
];

export async function resetPickupLocations() {
  try {
    await kv.set(PICKUP_LOCATIONS_KEY, defaultLocations);
    console.log('✅ Pickup locations reset successfully');
    console.log('Default locations:', defaultLocations);
    return { success: true, locations: defaultLocations };
  } catch (error) {
    console.error('❌ Failed to reset pickup locations:', error);
    return { success: false, error };
  }
}

// If running as standalone script
if (import.meta.main) {
  resetPickupLocations();
}
