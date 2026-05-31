// ID Generator for Quotations and Invoices
// Generates short, readable IDs like QT-0001, INV-0001

import * as kv from './kv_custom.tsx';

// Generate next quotation number
export async function generateQuotationNumber(): Promise<string> {
  const counterKey = 'counter:quotation';
  const currentCount = await kv.get(counterKey) || 0;
  const nextCount = currentCount + 1;
  await kv.set(counterKey, nextCount);
  
  // Format as QT-0001, QT-0002, etc.
  return `QT-${String(nextCount).padStart(4, '0')}`;
}

// Generate next invoice number
export async function generateInvoiceNumber(): Promise<string> {
  const counterKey = 'counter:invoice';
  const currentCount = await kv.get(counterKey) || 0;
  const nextCount = currentCount + 1;
  await kv.set(counterKey, nextCount);
  
  // Format as INV-0001, INV-0002, etc.
  return `INV-${String(nextCount).padStart(4, '0')}`;
}

// Generate unique ID for storage
export function generateUniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate next order number (6 digits)
export async function generateOrderNumber(): Promise<string> {
  const counterKey = 'counter:order';
  const currentCount = await kv.get(counterKey) || 0;
  const nextCount = currentCount + 1;
  await kv.set(counterKey, nextCount);

  // Format as 6-digit number: 000001, 000002, etc.
  return String(nextCount).padStart(6, '0');
}
