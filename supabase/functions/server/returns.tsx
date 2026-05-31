import { Hono } from 'npm:hono';
import * as kv from './kv_custom.tsx';

const app = new Hono();

// Generate Return Number
function generateReturnNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RET-${year}${month}${day}-${random}`;
}

// Create Return Request
app.post('/make-server-d1fbc049/returns/create', async (c) => {
  try {
    const body = await c.req.json();
    const { orderId, customer, items, reason, comments, refundAmount } = body;

    if (!orderId || !customer || !items || items.length === 0) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const returnId = crypto.randomUUID();
    const returnNumber = generateReturnNumber();

    const returnData = {
      id: returnId,
      returnNumber,
      orderId,
      customer,
      items,
      reason,
      comments: comments || '',
      status: 'pending',
      refundAmount,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`return:${returnId}`, returnData);

    return c.json({
      message: 'Return request created successfully',
      return: returnData,
    });
  } catch (error) {
    console.error('Error creating return:', error);
    return c.json({ error: 'Failed to create return request' }, 500);
  }
});

// List All Returns
app.get('/make-server-d1fbc049/returns/list', async (c) => {
  try {
    const returns = await kv.getByPrefix('return:');
    
    // Sort by creation date (newest first)
    const sortedReturns = returns.sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return c.json({ returns: sortedReturns });
  } catch (error) {
    console.error('Error listing returns:', error);
    return c.json({ error: 'Failed to fetch returns' }, 500);
  }
});

// Get Single Return
app.get('/make-server-d1fbc049/returns/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const returnData = await kv.get(`return:${id}`);

    if (!returnData) {
      return c.json({ error: 'Return not found' }, 404);
    }

    return c.json({ return: returnData });
  } catch (error) {
    console.error('Error fetching return:', error);
    return c.json({ error: 'Failed to fetch return' }, 500);
  }
});

// Update Return Status
app.put('/make-server-d1fbc049/returns/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { status, adminNotes, processedAt } = body;

    const returnData = await kv.get(`return:${id}`);
    if (!returnData) {
      return c.json({ error: 'Return not found' }, 404);
    }

    const updatedReturn = {
      ...returnData,
      status,
      adminNotes: adminNotes || returnData.adminNotes,
      processedAt: processedAt || returnData.processedAt,
    };

    await kv.set(`return:${id}`, updatedReturn);

    return c.json({
      message: 'Return status updated successfully',
      return: updatedReturn,
    });
  } catch (error) {
    console.error('Error updating return status:', error);
    return c.json({ error: 'Failed to update return status' }, 500);
  }
});

// Process Refund
app.post('/make-server-d1fbc049/returns/:id/refund', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { adminNotes } = body;

    const returnData = await kv.get(`return:${id}`);
    if (!returnData) {
      return c.json({ error: 'Return not found' }, 404);
    }

    if (returnData.status !== 'approved') {
      return c.json({ error: 'Return must be approved before processing refund' }, 400);
    }

    // In a real system, you would process the actual refund here via payment gateway
    // For now, we'll just update the status

    const updatedReturn = {
      ...returnData,
      status: 'refunded',
      adminNotes: adminNotes || returnData.adminNotes,
      processedAt: new Date().toISOString(),
      refundProcessedAt: new Date().toISOString(),
    };

    await kv.set(`return:${id}`, updatedReturn);

    return c.json({
      message: 'Refund processed successfully',
      return: updatedReturn,
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    return c.json({ error: 'Failed to process refund' }, 500);
  }
});

// Delete Return
app.delete('/make-server-d1fbc049/returns/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const returnData = await kv.get(`return:${id}`);

    if (!returnData) {
      return c.json({ error: 'Return not found' }, 404);
    }

    await kv.del(`return:${id}`);

    return c.json({ message: 'Return deleted successfully' });
  } catch (error) {
    console.error('Error deleting return:', error);
    return c.json({ error: 'Failed to delete return' }, 500);
  }
});

// Get Returns by Order ID
app.get('/make-server-d1fbc049/returns/order/:orderId', async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const allReturns = await kv.getByPrefix('return:');
    
    const orderReturns = allReturns.filter((ret: any) => ret.orderId === orderId);

    return c.json({ returns: orderReturns });
  } catch (error) {
    console.error('Error fetching order returns:', error);
    return c.json({ error: 'Failed to fetch returns' }, 500);
  }
});

// Export Returns (CSV)
app.get('/make-server-d1fbc049/returns/export', async (c) => {
  try {
    const returns = await kv.getByPrefix('return:');
    
    // Generate CSV
    const headers = ['Return #', 'Order ID', 'Customer Name', 'Customer Email', 'Status', 'Refund Amount', 'Created Date', 'Processed Date'];
    const rows = returns.map((ret: any) => [
      ret.returnNumber,
      ret.orderId,
      ret.customer.name,
      ret.customer.email,
      ret.status,
      ret.refundAmount.toFixed(2),
      new Date(ret.createdAt).toLocaleDateString(),
      ret.processedAt ? new Date(ret.processedAt).toLocaleDateString() : 'N/A',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return c.text(csv, 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="returns-export.csv"',
    });
  } catch (error) {
    console.error('Error exporting returns:', error);
    return c.json({ error: 'Failed to export returns' }, 500);
  }
});

export default app;
