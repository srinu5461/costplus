// PDF Invoice Generator for Costplus100
// Generates professional PDF invoices for orders and shipping quotes

// Import Buffer from Node.js for Deno environment
import { Buffer } from "node:buffer";

// Suppress PDFKit font loading warnings (this is expected behavior)
// PDFKit uses Deno.readFileSync for font loading which triggers a Deno warning
// This is an internal PDFKit limitation and does NOT affect functionality
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  // Filter out the known PDFKit warning
  if (message.includes('Deno.readFileSync') || message.includes('async callback') || message.includes('performance impacts')) {
    return; // Suppress this specific warning
  }
  originalWarn.apply(console, args);
};

console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  // Filter out the known PDFKit warning
  if (message.includes('Deno.readFileSync') || message.includes('async callback') || message.includes('performance impacts')) {
    return; // Suppress this specific warning
  }
  originalError.apply(console, args);
};

export async function generateOrderInvoicePDF(order: any, companyInfo: any): Promise<Uint8Array> {
  console.log('📄 ========== PDF GENERATOR DEBUG ==========');
  console.log('📄 Generating Order Invoice PDF for order:', order.id);
  console.log('📄 order.shippingMethod:', order.shippingMethod);
  console.log('📄 order.shipping_method:', order.shipping_method);
  console.log('📄 order.usePickup:', order.usePickup);
  console.log('📄 order.shipping_amount:', order.shipping_amount);
  console.log('📄 FULL ORDER OBJECT:', JSON.stringify(order, null, 2));
  console.log('📄 ==========================================');
  const PDFDocument = (await import('npm:pdfkit')).default;
  
  return new Promise((resolve, reject) => {
    try {
      // Create PDF with proper buffer handling for Deno environment
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        autoFirstPage: true,
        info: {
          Title: `Tax Invoice ${order.id}`,
          Author: companyInfo.name || 'Costplus100',
          Subject: `Tax Invoice for Order ${order.id}`,
          CreationDate: new Date(),
        }
      });

      const chunks: Uint8Array[] = [];
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(new Uint8Array(buffer));
      });
      doc.on('error', (error: any) => {
        console.error('PDF generation error:', error);
        reject(error);
      });

      // Helper function for drawing horizontal lines
      const drawLine = (y: number) => {
        doc.moveTo(50, y).lineTo(545, y).stroke();
      };

      // Header - Company Logo (Text-based since PDFKit in Deno doesn't support image imports easily)
      doc.fillColor('#2D3748')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('COSTPLUS', 50, 50, { continued: true })
         .fillColor('#E31837')
         .text('100', { continued: false });

      // Company Details - Now with ABN in header
      doc.fillColor('#2D3748')
         .fontSize(9)
         .font('Helvetica')
         .text(companyInfo.fullAddress || `${companyInfo.address}, ${companyInfo.city} ${companyInfo.state} ${companyInfo.postcode}` || '123 Industrial Drive, Sydney NSW 2000', 50, 85, { width: 250 })
         .text(`Email: ${companyInfo.email || 'info@costplus100.com.au'}`, 50, 100)
         .text(`ABN: ${companyInfo.abn || '12 345 678 901'}`, 50, 115);

      // TAX INVOICE Title
      doc.fillColor('#E31837')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('TAX INVOICE', 350, 50, { align: 'right' });

      // Invoice Number & Date
      doc.fillColor('#2D3748')
         .fontSize(10)
         .font('Helvetica')
         .text(`Invoice #: ${order.id}`, 350, 90, { align: 'right' })
         .text(`Date: ${new Date(order.created_at).toLocaleDateString('en-AU', {
           day: '2-digit',
           month: 'short',
           year: 'numeric'
         })}`, 350, 105, { align: 'right' })
         .text(`Payment Method: ${order.payment_method}`, 350, 120, { align: 'right' });

      drawLine(150);

      // Bill To Section
      let currentY = 170;
      doc.fillColor('#666666')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('BILL TO:', 50, currentY);

      currentY += 20;
      if (order.billing?.[0]) {
        const billing = order.billing[0];
        doc.fillColor('#2D3748')
           .font('Helvetica')
           .text(`${billing.first_name} ${billing.last_name}`, 50, currentY)
           .text(billing.email, 50, currentY + 15)
           .text(billing.phone, 50, currentY + 30);
        currentY += 45; // Update currentY to account for the 3 lines
      }

      // Ship To Section (with proper spacing)
      currentY += 30; // Add more space between Bill To and Ship To
      if (order.shipping?.[0]) {
        const shipping = order.shipping[0];
        doc.fillColor('#666666')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('SHIP TO:', 50, currentY);

        currentY += 20;
        
        // Safely handle all fields with fallback to empty string and filter out empty values
        const firstName = shipping.first_name || '';
        const lastName = shipping.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const address = shipping.address || '';
        const city = shipping.city || '';
        const state = shipping.state || '';
        const postcode = shipping.postcode || '';
        const country = shipping.country || '';
        const email = shipping.email || '';
        const phone = shipping.phone || '';
        
        // Only show name if we have at least one name component
        if (fullName) {
          doc.fillColor('#2D3748')
             .font('Helvetica')
             .text(fullName, 50, currentY);
          currentY += 15;
        }
        
        // Only show address if it exists
        if (address) {
          doc.text(address, 50, currentY);
          currentY += 15;
        }
        
        // Only show city/state/postcode line if at least one exists
        const cityStateLine = `${city}${city && (state || postcode) ? ', ' : ''}${state} ${postcode}`.trim();
        if (cityStateLine) {
          doc.text(cityStateLine, 50, currentY);
          currentY += 15;
        }
        
        // Only show country if it exists
        if (country) {
          doc.text(country, 50, currentY);
          currentY += 15;
        }
        
        // Only show email if it exists
        if (email) {
          doc.text(email, 50, currentY);
          currentY += 15;
        }
        
        // Only show phone if it exists
        if (phone) {
          doc.text(phone, 50, currentY);
          currentY += 15;
        }
      }

      currentY = 440;
      drawLine(currentY);

      // Order Items Table Header
      currentY += 20;
      doc.fillColor('#2D3748')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('PRODUCT', 50, currentY)
         .text('QTY', 330, currentY, { width: 50, align: 'center' })
         .text('UNIT PRICE', 380, currentY, { width: 80, align: 'right' })
         .text('TOTAL', 460, currentY, { width: 85, align: 'right' });

      currentY += 15;
      drawLine(currentY);

      // Order Items
      currentY += 15;
      doc.font('Helvetica').fontSize(9);

      for (const item of order.order_items || []) {
        // Handle both nested (item.product.name) and flat (item.name) structures
        const productName = item.product?.name || item.productName || item.name || 'Product';
        const productPrice = item.product?.price || item.price || 0;
        const quantity = item.quantity || 1;
        const itemTotal = productPrice * quantity;

        // Product name (with wrapping)
        doc.fillColor('#2D3748')
           .text(productName, 50, currentY, { width: 270, lineBreak: false });

        // Quantity
        doc.text(quantity.toString(), 330, currentY, { width: 50, align: 'center' });

        // Unit Price
        doc.text(`$${productPrice.toFixed(2)}`, 380, currentY, { width: 80, align: 'right' });

        // Total
        doc.text(`$${itemTotal.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });

        currentY += 25;

        // Add new page if needed
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
      }

      currentY += 10;
      drawLine(currentY);

      // Totals Section
      currentY += 20;
      const totalsX = 380;
      
      doc.fillColor('#666666')
         .fontSize(10)
         .font('Helvetica')
         .text('Subtotal:', totalsX, currentY)
         .text(`$${(order.subtotal || 0).toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });

      currentY += 20;
      doc.text('GST (10%):', totalsX, currentY)
         .text(`$${(order.tax_amount || 0).toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });

      currentY += 20;
      // Check shippingMethod first, then amount
      const isQuote = order.shippingMethod === 'quote' || order.shipping_method === 'quote';
      const isPickup = order.shippingMethod === 'pickup' || order.shipping_method === 'pickup' || order.usePickup;
      const shippingAmount = order.shipping_amount || 0;

      console.log('📄 PDF SHIPPING CHECK:', {
        'order.shippingMethod': order.shippingMethod,
        'order.shipping_method': order.shipping_method,
        'order.usePickup': order.usePickup,
        'order.shipping_amount': order.shipping_amount,
        'isQuote': isQuote,
        'isPickup': isPickup,
        'Will display': isQuote ? 'Quote Sent Separately' : isPickup ? 'FREE (Pickup)' : shippingAmount > 0 ? `$${shippingAmount}` : 'FREE'
      });

      if (isQuote) {
        doc.fillColor('#F97316')
           .text('Shipping:', totalsX, currentY)
           .text('Quote Sent Separately', 460, currentY, { width: 85, align: 'right' });
        currentY += 20;
      } else if (isPickup) {
        doc.fillColor('#15803D')
           .text('Shipping:', totalsX, currentY)
           .text('FREE (Pickup)', 460, currentY, { width: 85, align: 'right' });
        currentY += 20;
      } else if (shippingAmount > 0) {
        doc.fillColor('#666666')
           .text('Shipping:', totalsX, currentY)
           .text(`$${shippingAmount.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });
        currentY += 20;
      } else {
        doc.fillColor('#15803D')
           .text('Shipping:', totalsX, currentY)
           .text('FREE', 460, currentY, { width: 85, align: 'right' });
        currentY += 20;
      }

      drawLine(currentY);

      currentY += 15;
      doc.fillColor('#E31837')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('TOTAL:', totalsX, currentY)
         .text(`$${(order.total_amount || 0).toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });

      // Payment Status Badge
      currentY += 30;
      if (order.payment_status === 'completed') {
        doc.fillColor('#15803D')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('✓ PAYMENT RECEIVED', totalsX, currentY, { width: 165, align: 'center' });
      }

      // Add new page for footer if needed
      if (currentY > 700) {
        doc.addPage();
      }

      // Footer - positioned properly from bottom
      const footerStartY = 730;
      drawLine(footerStartY);
      
      doc.fillColor('#999999')
         .fontSize(7)
         .font('Helvetica')
         .text('Payment is due by the date specified above. Thank you for your business!', 50, footerStartY + 10, { align: 'center', width: 495 })
         .text(`Montalto Distribution Group trading as Costplus100`, 50, footerStartY + 22, { align: 'center', width: 495 })
         .text(`${companyInfo.email} | ABN: ${companyInfo.abn}`, 50, footerStartY + 32, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateShippingQuotePDF(
  order: any,
  shippingCost: number,
  shippingGST: number,
  totalShipping: number,
  notes: string,
  companyInfo: any,
  bankDetails?: string
): Promise<Uint8Array> {
  const PDFDocument = (await import('npm:pdfkit')).default;
  
  return new Promise((resolve, reject) => {
    try {
      // Create PDF with proper buffer handling for Deno environment
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        autoFirstPage: true,
        info: {
          Title: `Shipping Quote ${order.id}`,
          Author: companyInfo.name || 'Costplus100',
          Subject: `Shipping Quote for Order ${order.id}`,
          CreationDate: new Date(),
        }
      });

      const chunks: Uint8Array[] = [];
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(new Uint8Array(buffer));
      });
      doc.on('error', (error: any) => {
        console.error('Shipping PDF generation error:', error);
        reject(error);
      });

      // Helper function for drawing horizontal lines
      const drawLine = (y: number) => {
        doc.moveTo(50, y).lineTo(545, y).stroke();
      };

      // Header - Company Logo (Text-based since PDFKit in Deno doesn't support image imports easily)
      doc.fillColor('#2D3748')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('COSTPLUS', 50, 50, { continued: true })
         .fillColor('#E31837')
         .text('100', { continued: false });

      // Company Details - Now with ABN in header
      doc.fillColor('#2D3748')
         .fontSize(9)
         .font('Helvetica')
         .text(companyInfo.fullAddress || `${companyInfo.address}, ${companyInfo.city} ${companyInfo.state} ${companyInfo.postcode}` || '123 Industrial Drive, Sydney NSW 2000', 50, 85, { width: 250 })
         .text(`Email: ${companyInfo.email || 'info@costplus100.com.au'}`, 50, 100)
         .text(`ABN: ${companyInfo.abn || '12 345 678 901'}`, 50, 115);

      // TAX INVOICE Title
      doc.fillColor('#E31837')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('TAX INVOICE', 350, 50, { align: 'right' });

      doc.fillColor('#F97316')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('SHIPPING QUOTE', 350, 80, { align: 'right' });

      // Invoice Number & Date
      doc.fillColor('#2D3748')
         .fontSize(10)
         .font('Helvetica')
         .text(`Order #: ${order.id}`, 350, 105, { align: 'right' })
         .text(`Date: ${new Date().toLocaleDateString('en-AU', {
           day: '2-digit',
           month: 'short',
           year: 'numeric'
         })}`, 350, 120, { align: 'right' });

      drawLine(150);

      // Payment Status Badges
      let currentY = 170;
      
      // Product Payment - PAID
      doc.roundedRect(50, currentY, 240, 60, 5)
         .fillAndStroke('#D1FAE5', '#10B981');
      
      doc.fillColor('#15803D')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('✓ PRODUCT PAYMENT', 60, currentY + 10);
      
      doc.fillColor('#047857')
         .fontSize(20)
         .text('PAID', 60, currentY + 30);
      
      doc.fillColor('#065F46')
         .fontSize(10)
         .font('Helvetica')
         .text(`$${(order.total_amount || 0).toFixed(2)}`, 200, currentY + 35);

      // Shipping Payment - DUE
      doc.roundedRect(305, currentY, 240, 60, 5)
         .fillAndStroke('#FEF3C7', '#F59E0B');
      
      doc.fillColor('#92400E')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('🚚 SHIPPING PAYMENT', 315, currentY + 10);
      
      doc.fillColor('#B45309')
         .fontSize(20)
         .text('DUE', 315, currentY + 30);
      
      doc.fillColor('#92400E')
         .fontSize(10)
         .font('Helvetica')
         .text(`$${totalShipping.toFixed(2)}`, 455, currentY + 35);

      currentY = 260;
      drawLine(currentY);

      // Ship To Section
      currentY += 20;
      if (order.shipping?.[0]) {
        const shipping = order.shipping[0];
        doc.fillColor('#666666')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('SHIP TO:', 50, currentY);

        currentY += 20;
        
        // Safely handle all fields with fallback to empty string and filter out empty values
        const firstName = shipping.first_name || '';
        const lastName = shipping.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const address = shipping.address || '';
        const city = shipping.city || '';
        const state = shipping.state || '';
        const postcode = shipping.postcode || '';
        const country = shipping.country || '';
        const email = shipping.email || '';
        const phone = shipping.phone || '';
        
        // Only show name if we have at least one name component
        if (fullName) {
          doc.fillColor('#2D3748')
             .font('Helvetica')
             .text(fullName, 50, currentY);
          currentY += 15;
        }
        
        // Only show address if it exists
        if (address) {
          doc.text(address, 50, currentY);
          currentY += 15;
        }
        
        // Only show city/state/postcode line if at least one exists
        const cityStateLine = `${city}${city && (state || postcode) ? ', ' : ''}${state} ${postcode}`.trim();
        if (cityStateLine) {
          doc.text(cityStateLine, 50, currentY);
          currentY += 15;
        }
        
        // Only show country if it exists
        if (country) {
          doc.text(country, 50, currentY);
          currentY += 15;
        }
        
        // Only show email if it exists
        if (email) {
          doc.text(email, 50, currentY);
          currentY += 15;
        }
        
        // Only show phone if it exists
        if (phone) {
          doc.text(phone, 50, currentY);
          currentY += 15;
        }
      }

      currentY = 440;
      drawLine(currentY);

      // Product Summary Table
      currentY += 20;
      doc.fillColor('#2D3748')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('ORDER SUMMARY', 50, currentY);

      currentY += 25;
      doc.fontSize(10)
         .text('PRODUCT', 50, currentY)
         .text('QTY', 380, currentY, { width: 60, align: 'center' })
         .text('TOTAL', 440, currentY, { width: 105, align: 'right' });

      currentY += 15;
      drawLine(currentY);

      // Order Items (condensed)
      currentY += 15;
      doc.font('Helvetica').fontSize(9);
      
      for (const item of order.order_items || []) {
        const product = item.product || {};
        const itemTotal = (product.price || 0) * item.quantity;
        
        doc.fillColor('#2D3748')
           .text(product.name || 'Product', 50, currentY, { width: 320, lineBreak: false })
           .text(item.quantity.toString(), 380, currentY, { width: 60, align: 'center' })
           .text(`$${itemTotal.toFixed(2)}`, 440, currentY, { width: 105, align: 'right' });
        
        currentY += 20;
      }

      currentY += 10;
      drawLine(currentY);

      // Product Totals
      currentY += 20;
      const totalsX = 380;
      
      doc.fillColor('#15803D')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('PRODUCT PAYMENT (PAID):', 50, currentY);

      doc.fillColor('#666666')
         .font('Helvetica')
         .text('Subtotal:', totalsX, currentY)
         .text(`$${(order.subtotal || 0).toFixed(2)}`, 440, currentY, { width: 105, align: 'right' });

      currentY += 18;
      doc.text('GST:', totalsX, currentY)
         .text(`$${(order.tax_amount || 0).toFixed(2)}`, 440, currentY, { width: 105, align: 'right' });

      currentY += 18;
      doc.fillColor('#15803D')
         .font('Helvetica-Bold')
         .text('Product Total:', totalsX, currentY)
         .text(`$${(order.total_amount || 0).toFixed(2)}`, 440, currentY, { width: 105, align: 'right' });

      currentY += 30;
      drawLine(currentY);

      // Shipping Quote
      currentY += 20;
      doc.fillColor('#92400E')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('SHIPPING QUOTE (DUE):', 50, currentY);

      doc.fillColor('#666666')
         .font('Helvetica')
         .text('Shipping Cost:', totalsX, currentY)
         .text(`$${shippingCost.toFixed(2)}`, 440, currentY, { width: 105, align: 'right' });

      currentY += 18;
      doc.text('Shipping GST:', totalsX, currentY)
         .text(`$${shippingGST.toFixed(2)}`, 440, currentY, { width: 105, align: 'right' });

      currentY += 18;
      doc.fillColor('#92400E')
         .font('Helvetica-Bold')
         .text('Shipping Total:', totalsX, currentY)
         .text(`$${totalShipping.toFixed(2)}`, 440, currentY, { width: 105, align: 'right' });

      // Notes Section
      if (notes) {
        currentY += 30;
        
        // Check if we need a new page
        if (currentY > 640) {
          doc.addPage();
          currentY = 50;
        }
        
        doc.fillColor('#2563EB')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('NOTES:', 50, currentY);

        currentY += 20;
        doc.fillColor('#2D3748')
           .font('Helvetica')
           .text(notes, 50, currentY, { width: 495 });
        
        currentY += 40;
      } else {
        currentY += 30;
      }

      // Bank Details Section
      if (bankDetails) {
        // Check if we need a new page
        if (currentY > 600) {
          doc.addPage();
          currentY = 50;
        }
        
        // Calculate height needed for bank details
        const bankDetailsHeight = 110;
        
        doc.roundedRect(50, currentY, 495, bankDetailsHeight, 5)
           .fillAndStroke('#EFF6FF', '#3B82F6');
        
        doc.fillColor('#1E40AF')
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('PAYMENT DETAILS', 60, currentY + 12);
        
        // Parse and display bank details with proper line breaks
        const bankDetailsLines = bankDetails.split('\n').filter((line: string) => line.trim());
        let bankDetailsY = currentY + 32;
        
        doc.fillColor('#1E3A8A')
           .fontSize(9)
           .font('Helvetica');
        
        bankDetailsLines.forEach((line: string, index: number) => {
          if (bankDetailsY < currentY + bankDetailsHeight - 30) {
            doc.text(line.trim(), 60, bankDetailsY, { width: 475 });
            bankDetailsY += 12;
          }
        });
        
        // Payment reference at the bottom
        doc.fillColor('#1E40AF')
           .fontSize(9)
           .font('Helvetica-Bold')
           .text(`Payment Reference: Order #${order.id}`, 60, currentY + bankDetailsHeight - 18);
        
        currentY += bankDetailsHeight + 20;
      }

      // Add new page for footer if needed
      if (currentY > 700) {
        doc.addPage();
      }

      // Footer - positioned properly from bottom
      const footerStartY = 730;
      drawLine(footerStartY);
      
      doc.fillColor('#999999')
         .fontSize(7)
         .font('Helvetica')
         .text('Please pay the shipping amount to proceed with delivery.', 50, footerStartY + 10, { align: 'center', width: 495 })
         .text(`${companyInfo.name} | ${companyInfo.email} | ${companyInfo.phone}`, 50, footerStartY + 22, { align: 'center', width: 495 })
         .text(`ABN: ${companyInfo.abn}`, 50, footerStartY + 32, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Generate Quotation PDF
export async function generateQuotationPDF(quotation: any, companyInfo: any): Promise<Uint8Array> {
  const PDFDocument = (await import('npm:pdfkit')).default;
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        autoFirstPage: true,
        info: {
          Title: `Quotation ${quotation.quotationNumber}`,
          Author: companyInfo.tradingName || 'Costplus100',
          Subject: `Quotation for ${quotation.customer.name}`,
          CreationDate: new Date(),
        }
      });

      const chunks: Uint8Array[] = [];
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(new Uint8Array(buffer));
      });
      doc.on('error', (error: any) => {
        console.error('PDF generation error:', error);
        reject(error);
      });

      const drawLine = (y: number) => {
        doc.moveTo(50, y).lineTo(545, y).stroke();
      };

      // Header
      doc.fillColor('#2D3748')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('COSTPLUS', 50, 50, { continued: true })
         .fillColor('#E31837')
         .text('100', { continued: false });

      // Company Details - Now with ABN in header
      doc.fillColor('#2D3748')
         .fontSize(9)
         .font('Helvetica')
         .text(companyInfo.fullAddress || `${companyInfo.address}, ${companyInfo.city} ${companyInfo.state} ${companyInfo.postcode}` || '123 Industrial Drive, Sydney NSW 2000', 50, 85, { width: 250 })
         .text(`Email: ${companyInfo.email || 'info@costplus100.com.au'}`, 50, 100)
         .text(`ABN: ${companyInfo.abn || '12 345 678 901'}`, 50, 115);

      // QUOTATION Title
      doc.fillColor('#E31837')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('QUOTATION', 350, 50, { align: 'right' });

      // Quotation Details
      doc.fillColor('#2D3748')
         .fontSize(10)
         .font('Helvetica')
         .text(`Quote #: ${quotation.quotationNumber}`, 350, 90, { align: 'right' })
         .text(`Date: ${new Date(quotation.createdAt).toLocaleDateString('en-AU')}`, 350, 105, { align: 'right' })
         .text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString('en-AU')}`, 350, 120, { align: 'right' });

      drawLine(150);

      // Customer Details
      let currentY = 170;
      doc.fillColor('#666666')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('QUOTE FOR:', 50, currentY);

      currentY += 20;
      doc.fillColor('#2D3748')
         .font('Helvetica')
         .text(quotation.customer.name, 50, currentY);
      
      if (quotation.customer.company) {
        currentY += 15;
        doc.text(quotation.customer.company, 50, currentY);
      }
      
      currentY += 15;
      doc.text(quotation.customer.email, 50, currentY);
      
      if (quotation.customer.phone) {
        currentY += 15;
        doc.text(quotation.customer.phone, 50, currentY);
      }

      // Items Table
      currentY += 40;
      drawLine(currentY);
      currentY += 10;

      // Table Header
      doc.fillColor('#2D3748')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Description', 50, currentY)
         .text('Qty', 350, currentY)
         .text('Unit Price', 400, currentY)
         .text('Amount', 480, currentY, { align: 'right', width: 65 });

      currentY += 15;
      drawLine(currentY);

      // Items
      doc.font('Helvetica');
      quotation.items.forEach((item: any) => {
        currentY += 15;
        const itemTotal = item.quantity * item.price;
        
        doc.fillColor('#2D3748')
           .text(item.name, 50, currentY, { width: 280 })
           .text(item.quantity.toString(), 350, currentY)
           .text(`$${item.price.toFixed(2)}`, 400, currentY)
           .text(`$${itemTotal.toFixed(2)}`, 480, currentY, { align: 'right', width: 65 });
      });

      currentY += 15;
      drawLine(currentY);

      // Totals
      currentY += 20;
      const totalsX = 400;
      
      doc.fillColor('#666666')
         .font('Helvetica')
         .text('Subtotal:', totalsX, currentY)
         .text(`$${quotation.subtotal.toFixed(2)}`, 480, currentY, { align: 'right', width: 65 });

      currentY += 18;
      doc.text(`GST (${((quotation.taxRate || 0.1) * 100).toFixed(0)}%):`, totalsX, currentY)
         .text(`$${quotation.tax.toFixed(2)}`, 480, currentY, { align: 'right', width: 65 });

      currentY += 18;
      doc.fillColor('#2D3748')
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('TOTAL:', totalsX, currentY)
         .text(`$${quotation.total.toFixed(2)}`, 480, currentY, { align: 'right', width: 65 });

      // Notes
      if (quotation.notes) {
        currentY += 40;
        
        // Check if we need a new page
        if (currentY > 680) {
          doc.addPage();
          currentY = 50;
        }
        
        doc.fillColor('#666666')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('Notes:', 50, currentY);
        
        currentY += 15;
        doc.fillColor('#2D3748')
           .font('Helvetica')
           .text(quotation.notes, 50, currentY, { width: 495 });
      }

      // Add new page for footer if needed
      if (currentY > 700) {
        doc.addPage();
      }

      // Footer - positioned properly from bottom
      const footerStartY = 730;
      drawLine(footerStartY);
      
      doc.fillColor('#999999')
         .fontSize(7)
         .font('Helvetica')
         .text('This quotation is valid until the date specified above.', 50, footerStartY + 10, { align: 'center', width: 495 })
         .text(`Montalto Distribution Group trading as Costplus100`, 50, footerStartY + 22, { align: 'center', width: 495 })
         .text(`${companyInfo.email} | ABN: ${companyInfo.abn}`, 50, footerStartY + 32, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Generate Invoice PDF (for quotation-based invoices)
export async function generateInvoicePDF(invoice: any, companyInfo: any): Promise<Uint8Array> {
  const PDFDocument = (await import('npm:pdfkit')).default;
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        autoFirstPage: true,
        info: {
          Title: `Tax Invoice ${invoice.invoiceNumber}`,
          Author: companyInfo.tradingName || 'Costplus100',
          Subject: `Tax Invoice for ${invoice.customer.name}`,
          CreationDate: new Date(),
        }
      });

      const chunks: Uint8Array[] = [];
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(new Uint8Array(buffer));
      });
      doc.on('error', (error: any) => {
        console.error('PDF generation error:', error);
        reject(error);
      });

      const drawLine = (y: number) => {
        doc.moveTo(50, y).lineTo(545, y).stroke();
      };

      // Header
      doc.fillColor('#2D3748')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('COSTPLUS', 50, 50, { continued: true })
         .fillColor('#E31837')
         .text('100', { continued: false });

      // Company Details - Now with ABN in header
      doc.fillColor('#2D3748')
         .fontSize(9)
         .font('Helvetica')
         .text(companyInfo.fullAddress || `${companyInfo.address}, ${companyInfo.city} ${companyInfo.state} ${companyInfo.postcode}` || '123 Industrial Drive, Sydney NSW 2000', 50, 85, { width: 250 })
         .text(`Email: ${companyInfo.email || 'info@costplus100.com.au'}`, 50, 100)
         .text(`ABN: ${companyInfo.abn || '12 345 678 901'}`, 50, 115);

      // TAX INVOICE Title
      doc.fillColor('#E31837')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('TAX INVOICE', 350, 50, { align: 'right' });

      // Invoice Details
      doc.fillColor('#2D3748')
         .fontSize(10)
         .font('Helvetica')
         .text(`Invoice #: ${invoice.invoiceNumber}`, 350, 90, { align: 'right' })
         .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-AU')}`, 350, 105, { align: 'right' })
         .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-AU')}`, 350, 120, { align: 'right' });

      if (invoice.quotationNumber) {
        doc.text(`Quote Ref: ${invoice.quotationNumber}`, 350, 135, { align: 'right' });
      }

      drawLine(150);

      // Bill To
      let currentY = 170;
      doc.fillColor('#666666')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('BILL TO:', 50, currentY);

      currentY += 20;
      doc.fillColor('#2D3748')
         .font('Helvetica')
         .text(invoice.customer.name, 50, currentY);
      
      if (invoice.customer.company) {
        currentY += 15;
        doc.text(invoice.customer.company, 50, currentY);
      }
      
      currentY += 15;
      doc.text(invoice.customer.email, 50, currentY);
      
      if (invoice.customer.phone) {
        currentY += 15;
        doc.text(invoice.customer.phone, 50, currentY);
      }

      if (invoice.customer.address) {
        currentY += 15;
        doc.text(invoice.customer.address, 50, currentY);
      }

      // Items Table
      currentY += 40;
      drawLine(currentY);
      currentY += 10;

      // Table Header
      doc.fillColor('#2D3748')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Description', 50, currentY)
         .text('Qty', 350, currentY)
         .text('Unit Price', 400, currentY)
         .text('Amount', 480, currentY, { align: 'right', width: 65 });

      currentY += 15;
      drawLine(currentY);

      // Items
      doc.font('Helvetica');
      invoice.items.forEach((item: any) => {
        currentY += 15;
        const itemTotal = item.quantity * item.price;
        
        doc.fillColor('#2D3748')
           .text(item.name, 50, currentY, { width: 280 })
           .text(item.quantity.toString(), 350, currentY)
           .text(`$${item.price.toFixed(2)}`, 400, currentY)
           .text(`$${itemTotal.toFixed(2)}`, 480, currentY, { align: 'right', width: 65 });
      });

      currentY += 15;
      drawLine(currentY);

      // Totals
      currentY += 20;
      const totalsX = 400;
      
      doc.fillColor('#666666')
         .font('Helvetica')
         .text('Subtotal:', totalsX, currentY)
         .text(`$${invoice.subtotal.toFixed(2)}`, 480, currentY, { align: 'right', width: 65 });

      if (invoice.shippingCost && invoice.shippingCost > 0) {
        currentY += 18;
        doc.text('Shipping:', totalsX, currentY)
           .text(`$${invoice.shippingCost.toFixed(2)}`, 480, currentY, { align: 'right', width: 65 });
      }

      currentY += 18;
      doc.text(`GST (${((invoice.taxRate || 0.1) * 100).toFixed(0)}%):`, totalsX, currentY)
         .text(`$${invoice.tax.toFixed(2)}`, 480, currentY, { align: 'right', width: 65 });

      currentY += 18;
      doc.fillColor('#2D3748')
         .font('Helvetica-Bold')
         .fontSize(12)
         .text('TOTAL DUE:', totalsX, currentY)
         .text(`$${invoice.total.toFixed(2)}`, 480, currentY, { align: 'right', width: 65 });

      // Payment Status
      currentY += 30;
      if (invoice.status === 'paid') {
        doc.fillColor('#15803D')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(`✓ PAID - ${new Date(invoice.paidAt).toLocaleDateString('en-AU')}`, 50, currentY);
      } else {
        doc.fillColor('#E31837')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(`PAYMENT DUE: ${new Date(invoice.dueDate).toLocaleDateString('en-AU')}`, 50, currentY);
      }

      // Bank Details (if unpaid and has bankDetails)
      if (invoice.status !== 'paid' && companyInfo.bankDetails) {
        currentY += 30;
        doc.fillColor('#666666')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('PAYMENT DETAILS:', 50, currentY);
        
        currentY += 15;
        doc.fillColor('#2D3748')
           .font('Helvetica')
           .text(`Bank: ${companyInfo.bankDetails.bankName}`, 50, currentY)
           .text(`Account Name: ${companyInfo.bankDetails.accountName}`, 50, currentY + 15)
           .text(`BSB: ${companyInfo.bankDetails.bsb}`, 50, currentY + 30)
           .text(`Account: ${companyInfo.bankDetails.accountNumber}`, 50, currentY + 45)
           .text(`Reference: ${invoice.invoiceNumber}`, 50, currentY + 60);
      }

      // Notes
      if (invoice.notes) {
        currentY += 100;
        
        // Check if we need a new page
        if (currentY > 680) {
          doc.addPage();
          currentY = 50;
        }
        
        doc.fillColor('#666666')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('Notes:', 50, currentY);
        
        currentY += 15;
        doc.fillColor('#2D3748')
           .font('Helvetica')
           .text(invoice.notes, 50, currentY, { width: 495 });
      }

      // Add new page for footer if needed
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      // Footer - positioned properly from bottom
      const footerStartY = 730;
      drawLine(footerStartY);
      
      doc.fillColor('#999999')
         .fontSize(7)
         .font('Helvetica')
         .text('Payment is due by the date specified above. Thank you for your business!', 50, footerStartY + 10, { align: 'center', width: 495 })
         .text(`Montalto distribution group trading as Costplus100`, 50, footerStartY + 22, { align: 'center', width: 495 })
         .text(`${companyInfo.email} | ABN: ${companyInfo.abn}`, 50, footerStartY + 32, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}