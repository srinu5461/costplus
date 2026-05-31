import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';

const app = new Hono();

const PICKUP_LOCATIONS_KEY = 'pickup_locations_list';

// Get all pickup locations
app.get('/', async (c) => {
  try {
    const locations = await kv.get(PICKUP_LOCATIONS_KEY);
    
    if (!locations) {
      // Return default locations if none exist
      const defaultLocations = [
        { 
          id: '1', 
          name: 'Sydney Warehouse', 
          address: '123 Industrial Ave, Sydney NSW 2000',
          state: 'NSW',
          hours: 'Mon-Fri: 8AM-5PM',
          active: true
        },
        { 
          id: '2', 
          name: 'Melbourne Distribution Center', 
          address: '456 Commerce St, Melbourne VIC 3000',
          state: 'VIC',
          hours: 'Mon-Fri: 9AM-6PM',
          active: true
        },
        { 
          id: '3', 
          name: 'Brisbane Depot', 
          address: '789 Logistics Rd, Brisbane QLD 4000',
          state: 'QLD',
          hours: 'Mon-Fri: 8AM-4PM',
          active: true
        },
      ];
      
      // Store default locations
      await kv.set(PICKUP_LOCATIONS_KEY, defaultLocations);
      
      return c.json({ success: true, locations: defaultLocations });
    }
    
    return c.json({ success: true, locations });
  } catch (error) {
    console.error('Error fetching pickup locations:', error);
    return c.json({ error: 'Failed to fetch pickup locations' }, 500);
  }
});

// Get active pickup locations only (for customer-facing checkout)
app.get('/active', async (c) => {
  try {
    const state = c.req.query('state'); // Get state from query parameter
    let locations = await kv.get(PICKUP_LOCATIONS_KEY);
    
    // If no locations exist, create default ones
    if (!locations || locations.length === 0) {
      const defaultLocations = [
        { 
          id: '1', 
          name: 'Sydney Warehouse', 
          address: '123 Industrial Ave, Sydney NSW 2000',
          state: 'NSW',
          hours: 'Mon-Fri: 8AM-5PM',
          active: true
        },
        { 
          id: '2', 
          name: 'Melbourne Distribution Center', 
          address: '456 Commerce St, Melbourne VIC 3000',
          state: 'VIC',
          hours: 'Mon-Fri: 9AM-6PM',
          active: true
        },
        { 
          id: '3', 
          name: 'Brisbane Depot', 
          address: '789 Logistics Rd, Brisbane QLD 4000',
          state: 'QLD',
          hours: 'Mon-Fri: 8AM-4PM',
          active: true
        },
      ];
      await kv.set(PICKUP_LOCATIONS_KEY, defaultLocations);
      locations = defaultLocations;
    }
    
    let activeLocations = locations.filter((loc: any) => loc.active !== false);
    
    console.log('All active locations:', activeLocations);
    console.log('Filtering by state:', state);
    
    // Filter by state if provided
    if (state) {
      const stateUpper = state.toUpperCase().trim();
      activeLocations = activeLocations.filter((loc: any) => {
        const locState = loc.state ? loc.state.toUpperCase().trim() : '';
        console.log(`Comparing location state "${locState}" with requested "${stateUpper}"`);
        return locState === stateUpper;
      });
      console.log('Filtered locations:', activeLocations);
    }
    
    return c.json({ success: true, locations: activeLocations });
  } catch (error) {
    console.error('Error fetching active pickup locations:', error);
    return c.json({ error: 'Failed to fetch active pickup locations' }, 500);
  }
});

// Add new pickup location
app.post('/', async (c) => {
  try {
    const { name, address, state, hours, active } = await c.req.json();
    
    if (!name || !address || !state || !hours) {
      return c.json({ error: 'Name, address, state, and hours are required' }, 400);
    }
    
    const locations = await kv.get(PICKUP_LOCATIONS_KEY) || [];
    
    const newLocation = {
      id: Date.now().toString(),
      name,
      address,
      state: state.toUpperCase(),
      hours,
      active: active !== false,
      createdAt: new Date().toISOString()
    };
    
    locations.push(newLocation);
    await kv.set(PICKUP_LOCATIONS_KEY, locations);
    
    return c.json({ success: true, location: newLocation });
  } catch (error) {
    console.error('Error adding pickup location:', error);
    return c.json({ error: 'Failed to add pickup location' }, 500);
  }
});

// Update pickup location
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { name, address, state, hours, active } = await c.req.json();
    
    const locations = await kv.get(PICKUP_LOCATIONS_KEY) || [];
    
    const index = locations.findIndex((loc: any) => loc.id === id);
    
    if (index === -1) {
      return c.json({ error: 'Location not found' }, 404);
    }
    
    locations[index] = {
      ...locations[index],
      name: name || locations[index].name,
      address: address || locations[index].address,
      state: state ? state.toUpperCase() : locations[index].state,
      hours: hours || locations[index].hours,
      active: active !== undefined ? active : locations[index].active,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(PICKUP_LOCATIONS_KEY, locations);
    
    return c.json({ success: true, location: locations[index] });
  } catch (error) {
    console.error('Error updating pickup location:', error);
    return c.json({ error: 'Failed to update pickup location' }, 500);
  }
});

// Delete pickup location
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const locations = await kv.get(PICKUP_LOCATIONS_KEY) || [];
    
    const filteredLocations = locations.filter((loc: any) => loc.id !== id);
    
    if (filteredLocations.length === locations.length) {
      return c.json({ error: 'Location not found' }, 404);
    }
    
    await kv.set(PICKUP_LOCATIONS_KEY, filteredLocations);
    
    return c.json({ success: true, message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting pickup location:', error);
    return c.json({ error: 'Failed to delete pickup location' }, 500);
  }
});

export default app;