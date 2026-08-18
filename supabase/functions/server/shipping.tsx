// Shipping calculation logic based on postcode and order details

// Categories that require shipping quotes
const QUOTE_REQUIRED_CATEGORIES = [
  'Refrigeration',
  'Ice Machines',
  'Commercial Kitchen Machines',
  'Furniture'
];

// Postcode ranges for metro areas
const METRO_ZONES = {
  SYDNEY_METRO: { min: 2000, max: 2249, name: 'Sydney Metro', deliveryDays: '1-2 days' },
  MELBOURNE_METRO: { min: 3000, max: 3207, name: 'Melbourne Metro', deliveryDays: '1-2 days' },
  BRISBANE_METRO: { min: 4000, max: 4179, name: 'Brisbane Metro', deliveryDays: '1-2 days' }
};

// Regional zones with their postcode ranges
const REGIONAL_ZONES: Record<string, any> = {
  // NSW Regional
  NSW_REGIONAL_TOWN: {
    ranges: [
      { min: 2250, max: 2259 },
      { min: 2300, max: 2339 },
      { min: 2400, max: 2419 },
      { min: 2500, max: 2519 },
      { min: 2600, max: 2619 }
    ],
    name: 'NSW Regional Towns',
    deliveryDays: 'Next Day - 2 Days',
    state: 'NSW'
  },
  NSW_REGIONAL_AREA: {
    ranges: [
      { min: 2260, max: 2299 },
      { min: 2340, max: 2399 },
      { min: 2420, max: 2499 },
      { min: 2520, max: 2599 },
      { min: 2620, max: 2899 }
    ],
    name: 'NSW Regional Areas',
    deliveryDays: 'Next Day - 5 Days',
    state: 'NSW'
  },
  
  // QLD Regional
  QLD_REGIONAL_TOWN: {
    ranges: [
      { min: 4200, max: 4299 },
      { min: 4350, max: 4399 },
      { min: 4700, max: 4749 }
    ],
    name: 'QLD Regional Towns',
    deliveryDays: 'Next Day - 6 Days',
    state: 'QLD'
  },
  QLD_REGIONAL_AREA: {
    ranges: [
      { min: 4300, max: 4349 },
      { min: 4400, max: 4699 },
      { min: 4750, max: 4899 }
    ],
    name: 'QLD Regional Areas',
    deliveryDays: 'Next Day - 11 Days',
    state: 'QLD'
  },
  
  // VIC Regional
  VIC_REGIONAL_TOWN: {
    ranges: [
      { min: 3210, max: 3299 },
      { min: 3350, max: 3399 },
      { min: 3500, max: 3599 }
    ],
    name: 'VIC Regional Towns',
    deliveryDays: 'Next Day - 2 Days',
    state: 'VIC'
  },
  VIC_REGIONAL_AREA: {
    ranges: [
      { min: 3300, max: 3349 },
      { min: 3400, max: 3499 },
      { min: 3600, max: 3999 }
    ],
    name: 'VIC Regional Areas',
    deliveryDays: 'Next Day - 6 Days',
    state: 'VIC'
  },
  
  // SA
  SA_REGIONAL_TOWN: {
    ranges: [
      { min: 5000, max: 5199 }
    ],
    name: 'SA Regional Towns',
    deliveryDays: '2 Days',
    state: 'SA'
  },
  SA_REGIONAL_AREA: {
    ranges: [
      { min: 5200, max: 5799 }
    ],
    name: 'SA Regional Areas',
    deliveryDays: '2-4 Days',
    state: 'SA'
  },
  
  // NT
  NT_DARWIN: {
    ranges: [
      { min: 800, max: 822 }
    ],
    name: 'Darwin',
    deliveryDays: '4 Days',
    state: 'NT'
  },
  NT_REGIONAL: {
    ranges: [
      { min: 823, max: 899 }
    ],
    name: 'NT Regional Areas',
    deliveryDays: '4-12 Days',
    state: 'NT'
  },
  
  // WA
  WA_PERTH: {
    ranges: [
      { min: 6000, max: 6199 }
    ],
    name: 'Perth',
    deliveryDays: '5 Days',
    state: 'WA'
  },
  WA_REGIONAL: {
    ranges: [
      { min: 6200, max: 6799 }
    ],
    name: 'WA Regional Areas',
    deliveryDays: '5-14 Days',
    state: 'WA'
  },
  
  // TAS
  TAS_HOBART_LAUNCESTON: {
    ranges: [
      { min: 7000, max: 7049 },
      { min: 7100, max: 7199 }
    ],
    name: 'Hobart / Launceston',
    deliveryDays: '4 Days',
    state: 'TAS'
  },
  TAS_REGIONAL: {
    ranges: [
      { min: 7050, max: 7099 },
      { min: 7200, max: 7499 }
    ],
    name: 'TAS Regional Areas',
    deliveryDays: '4-12 Days',
    state: 'TAS'
  }
};

// Shipping rates based on zone and cart total
const SHIPPING_RATES: Record<string, any> = {
  SYDNEY_METRO: [
    { maxAmount: 300, cost: 30 },
    { maxAmount: Infinity, cost: 30 }
  ],
  MELBOURNE_METRO: [
    { maxAmount: 300, cost: 30 },
    { maxAmount: Infinity, cost: 30 }
  ],
  BRISBANE_METRO: [
    { maxAmount: 300, cost: 30 },
    { maxAmount: Infinity, cost: 30 }
  ],

  NSW_REGIONAL_TOWN: [
    { maxAmount: 300, cost: 30 },
    { maxAmount: 700, cost: 30 },
    { maxAmount: Infinity, cost: 30 }
  ],
  NSW_REGIONAL_AREA: [
    { maxAmount: 300, cost: 60 },
    { maxAmount: 700, cost: 30 },
    { maxAmount: Infinity, cost: 30 }
  ],

  QLD_REGIONAL_TOWN: [
    { maxAmount: 300, cost: 60 },
    { maxAmount: 700, cost: 30 },
    { maxAmount: Infinity, cost: 30 }
  ],
  QLD_REGIONAL_AREA: [
    { maxAmount: 300, cost: 120 },
    { maxAmount: 700, cost: 90 },
    { maxAmount: Infinity, cost: 30 }
  ],

  VIC_REGIONAL_TOWN: [
    { maxAmount: 300, cost: 40 },
    { maxAmount: 700, cost: 10 },
    { maxAmount: Infinity, cost: 30 }
  ],
  VIC_REGIONAL_AREA: [
    { maxAmount: 300, cost: 60 },
    { maxAmount: 700, cost: 30 },
    { maxAmount: Infinity, cost: 30 }
  ],

  SA_REGIONAL_TOWN: [
    { maxAmount: 300, cost: 40 },
    { maxAmount: 700, cost: 10 },
    { maxAmount: Infinity, cost: 30 }
  ],
  SA_REGIONAL_AREA: [
    { maxAmount: 300, cost: 60 },
    { maxAmount: 700, cost: 30 },
    { maxAmount: Infinity, cost: 30 }
  ],

  NT_DARWIN: [
    { maxAmount: 300, cost: 150 },
    { maxAmount: 700, cost: 120 },
    { maxAmount: Infinity, cost: 30 }
  ],
  NT_REGIONAL: [
    { maxAmount: 300, cost: 170 },
    { maxAmount: 700, cost: 140 },
    { maxAmount: Infinity, cost: 30 }
  ],

  WA_PERTH: [
    { maxAmount: 300, cost: 100 },
    { maxAmount: 700, cost: 70 },
    { maxAmount: Infinity, cost: 30 }
  ],
  WA_REGIONAL: [
    { maxAmount: 300, cost: 120 },
    { maxAmount: 700, cost: 90 },
    { maxAmount: Infinity, cost: 30 }
  ],

  TAS_HOBART_LAUNCESTON: [
    { maxAmount: 300, cost: 60 },
    { maxAmount: 700, cost: 30 },
    { maxAmount: Infinity, cost: 30 }
  ],
  TAS_REGIONAL: [
    { maxAmount: 300, cost: 80 },
    { maxAmount: 700, cost: 50 },
    { maxAmount: Infinity, cost: 30 }
  ]
};

/**
 * Determines shipping zone based on postcode
 */
export function getShippingZone(postcode: string): { zone: string; zoneName: string; deliveryDays: string; state: string } | null {
  const postcodeNum = parseInt(postcode);
  
  if (isNaN(postcodeNum)) {
    return null;
  }
  
  // Check metro zones first
  for (const [zone, data] of Object.entries(METRO_ZONES)) {
    if (postcodeNum >= data.min && postcodeNum <= data.max) {
      return { 
        zone, 
        zoneName: data.name, 
        deliveryDays: data.deliveryDays,
        state: zone.split('_')[0]
      };
    }
  }
  
  // Check regional zones
  for (const [zone, data] of Object.entries(REGIONAL_ZONES)) {
    for (const range of data.ranges) {
      if (postcodeNum >= range.min && postcodeNum <= range.max) {
        return { 
          zone, 
          zoneName: data.name, 
          deliveryDays: data.deliveryDays,
          state: data.state
        };
      }
    }
  }
  
  return null;
}

/**
 * Checks if cart contains categories that require shipping quote
 */
export function requiresShippingQuote(categories: string[]): { required: boolean; matchedCategories: string[] } {
  const matchedCategories: string[] = [];
  
  for (const category of categories) {
    // Check if category contains any of the quote-required keywords
    for (const quoteCategory of QUOTE_REQUIRED_CATEGORIES) {
      if (category.toLowerCase().includes(quoteCategory.toLowerCase()) || 
          quoteCategory.toLowerCase().includes(category.toLowerCase())) {
        matchedCategories.push(category);
        break;
      }
    }
  }
  
  return {
    required: matchedCategories.length > 0,
    matchedCategories
  };
}

/**
 * Calculates shipping cost based on postcode and cart total
 */
export function calculateShipping(
  postcode: string, 
  cartTotal: number, 
  categories: string[]
): {
  success: boolean;
  requiresQuote: boolean;
  cost: number;
  zone: string | null;
  zoneName: string | null;
  deliveryDays: string | null;
  message: string;
  matchedCategories?: string[];
} {
  // Check if requires quote first
  const quoteCheck = requiresShippingQuote(categories);
  
  if (quoteCheck.required) {
    return {
      success: true,
      requiresQuote: true,
      cost: 0,
      zone: null,
      zoneName: null,
      deliveryDays: null,
      message: 'This order contains heavy items that require a shipping quote. We will contact you within 24 hours with shipping costs.',
      matchedCategories: quoteCheck.matchedCategories
    };
  }
  
  // Get shipping zone
  const zoneInfo = getShippingZone(postcode);
  
  if (!zoneInfo) {
    return {
      success: false,
      requiresQuote: false,
      cost: 0,
      zone: null,
      zoneName: null,
      deliveryDays: null,
      message: 'Unable to calculate shipping for this postcode. Please contact us for a quote.'
    };
  }
  
  // Get shipping rates for this zone
  const rates = SHIPPING_RATES[zoneInfo.zone];
  
  if (!rates) {
    return {
      success: false,
      requiresQuote: false,
      cost: 0,
      zone: zoneInfo.zone,
      zoneName: zoneInfo.zoneName,
      deliveryDays: zoneInfo.deliveryDays,
      message: 'Unable to calculate shipping for this zone. Please contact us for a quote.'
    };
  }
  
  // Find applicable rate
  let shippingCost = 0;
  for (const rate of rates) {
    if (cartTotal < rate.maxAmount) {
      shippingCost = rate.cost;
      break;
    }
  }
  
  return {
    success: true,
    requiresQuote: false,
    cost: shippingCost,
    zone: zoneInfo.zone,
    zoneName: zoneInfo.zoneName,
    deliveryDays: zoneInfo.deliveryDays,
    message: `Shipping to ${zoneInfo.zoneName}: $${shippingCost.toFixed(2)} (${zoneInfo.deliveryDays})`
  };
}