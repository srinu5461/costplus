import { useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function EmailTest() {
  const [testType, setTestType] = useState<'order' | 'password'>('order');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [emailTo, setEmailTo] = useState('test@example.com');

  const testOrderEmail = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Sample order data
      const testOrder = {
        id: `ORD-${Date.now().toString().slice(-6)}`,
        subtotal: 199.99,
        tax_amount: 20.00,
        shipping_amount: 0,
        total_amount: 219.99,
        payment_method: 'PayPal',
        payment_status: 'paid',
        transaction_id: `TXN-${Date.now()}`,
        order_items: [
          {
            quantity: 2,
            product: {
              name: 'Commercial Blender 2L',
              price: 99.99
            }
          }
        ]
      };

      const testShipping = {
        first_name: 'John',
        last_name: 'Smith',
        email: emailTo,
        phone: '0400 123 456',
        address: '123 Test Street',
        city: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia'
      };

      const testCustomer = {
        email: emailTo
      };

      const response = await fetch(`${API_URL}/email/send-order-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          order: testOrder,
          customer: testCustomer,
          shipping: testShipping
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true });
      } else {
        setResult({ error: data.error || 'Failed to send email' });
      }
    } catch (error) {
      console.error('Error testing order email:', error);
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testPasswordResetEmail = async () => {
    setLoading(true);
    setResult(null);


    try {
      const response = await fetch(`${API_URL}/email/send-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          email: emailTo,
          resetToken: 'test-token-' + Date.now(),
          customerName: 'John Smith'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true });
      } else {
        setResult({ error: data.error || 'Failed to send email' });
      }
    } catch (error) {
      console.error('Error testing password reset email:', error);
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = () => {
    if (testType === 'order') {
      testOrderEmail();
    } else {
      testPasswordResetEmail();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Test Page</h1>
          <p className="text-gray-600 mb-8">
            Test the email functionality of your e-commerce system.
          </p>

          {/* Configuration Status */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">📧 SMTP Configuration</h2>
            <div className="space-y-1 text-sm text-blue-800">
              <p><strong>Host:</strong> smtp.office365.com</p>
              <p><strong>Port:</strong> 587</p>
              <p><strong>From:</strong> info@costplus100.com.au</p>
              <p><strong>Password:</strong> Configured via server environment variables</p>
            </div>
            <div className="mt-3 p-3 bg-white rounded border border-blue-200">
              <p className="text-xs text-gray-600">
                <strong>Note:</strong> SMTP credentials are securely stored in the Supabase Edge Function environment variables.
                The server will use <code className="bg-gray-100 px-1 py-0.5 rounded">SMTP_PASSWORD</code> to authenticate.
              </p>
            </div>
          </div>

          {/* Email Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Type
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setTestType('order')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                  testType === 'order'
                    ? 'border-[#E31837] bg-[#E31837] text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-[#E31837]'
                }`}
              >
                <div className="text-lg font-semibold mb-1">📦 Order Confirmation</div>
                <div className="text-sm opacity-90">Test invoice email</div>
              </button>
              <button
                onClick={() => setTestType('password')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                  testType === 'password'
                    ? 'border-[#E31837] bg-[#E31837] text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-[#E31837]'
                }`}
              >
                <div className="text-lg font-semibold mb-1">🔒 Password Reset</div>
                <div className="text-sm opacity-90">Test reset email</div>
              </button>
            </div>
          </div>

          {/* Recipient Email */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send Test Email To
            </label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
            />
            <p className="mt-2 text-sm text-gray-500">
              Enter your email address to receive the test email
            </p>
          </div>

          {/* Send Button */}
          <button
            onClick={handleTest}
            disabled={loading || !emailTo}
            className="w-full bg-[#E31837] hover:bg-[#c91530] text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
            ) : (
              `Send Test ${testType === 'order' ? 'Order' : 'Password Reset'} Email`
            )}
          </button>

          {/* Result Display */}
          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {result.success ? (
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Email sent successfully!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        Check your inbox at <strong>{emailTo}</strong>
                      </p>
                      <p className="mt-1 text-xs">
                        Note: The email is currently logged on the server. To actually send emails, configure a proper SMTP service or email API (SendGrid, Mailgun, etc.)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error sending email
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{result.error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">📋 Setup Instructions</h3>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>Ensure SMTP_PASSWORD is set in Supabase Edge Function secrets</li>
              <li>Configure email.tsx with your actual SMTP provider (currently using basic approach)</li>
              <li>For production, integrate with SendGrid, Mailgun, or AWS SES</li>
              <li>Update sender email and company details in the email templates</li>
              <li>Test thoroughly with real email addresses</li>
            </ol>
          </div>

          {/* Console Output */}
          <div className="mt-6 p-4 bg-gray-900 rounded-lg">
            <div className="text-xs text-gray-300 font-mono">
              <div className="text-green-400 mb-2">$ Check browser console for detailed logs</div>
              <div className="text-gray-500">
                Open DevTools → Console to see request/response details
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}