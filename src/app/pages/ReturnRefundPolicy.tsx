// Return & Refund Policy Page - Customer return policy with admin-editable content
import { useState, useEffect } from 'react';
import { RefreshCw, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export default function ReturnRefundPolicy() {
  const [content, setContent] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const response = await fetch(`${API_URL}/legal/return-refund-policy`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      if (response.ok) {
        const data = await response.json();
        setContent(data.content || getDefaultContent());
        setLastUpdated(data.lastUpdated || new Date().toISOString());
      } else {
        setContent(getDefaultContent());
      }
    } catch (error) {
      console.error('Failed to load return policy:', error);
      setContent(getDefaultContent());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultContent = () => {
    return `
      <h2>Our Commitment to Customer Satisfaction</h2>
      <p>At Costplus100, we stand behind the quality of our products. If you're not completely satisfied with your purchase, we're here to help with returns and refunds according to the policy outlined below.</p>
      
      <h2>1. 30-Day Return Policy</h2>
      <p>We offer a 30-day return policy on most items from the date of delivery. To be eligible for a return:</p>
      <ul>
        <li>Items must be in original, unused condition</li>
        <li>Original packaging must be intact and undamaged</li>
        <li>All accessories, manuals, and components must be included</li>
        <li>Proof of purchase (receipt or order confirmation) must be provided</li>
      </ul>
      
      <h2>2. Non-Returnable Items</h2>
      <p>Certain items cannot be returned for hygiene or safety reasons:</p>
      <ul>
        <li>Custom or special-order items made to your specifications</li>
        <li>Items marked as "Final Sale" or "Non-Returnable"</li>
        <li>Used or installed equipment</li>
        <li>Items without original packaging</li>
        <li>Perishable goods or consumables that have been opened</li>
      </ul>
      
      <h2>3. How to Initiate a Return</h2>
      <p>To start a return, please follow these steps:</p>
      <ol>
        <li>Contact our customer service team at <strong>admin@costplus100.com.au</strong> or call <strong>(08) 6165 8444</strong></li>
        <li>Provide your order number and reason for return</li>
        <li>Wait for return authorization and instructions</li>
        <li>Pack the item securely in its original packaging</li>
        <li>Ship the item to the address provided by our team</li>
      </ol>
      <p><strong>Important:</strong> Do not ship items back without prior authorization. Unauthorized returns may not be accepted.</p>
      
      <h2>4. Refund Process</h2>
      <p>Once we receive and inspect your return:</p>
      <ul>
        <li>If approved, your refund will be processed within 5-7 business days</li>
        <li>Refunds will be issued to the original payment method</li>
        <li>You will receive an email confirmation when the refund is processed</li>
        <li>Please allow 5-10 business days for the refund to appear in your account</li>
      </ul>
      
      <h2>5. Return Shipping Costs</h2>
      <p>Return shipping costs depend on the reason for return:</p>
      <ul>
        <li><strong>Defective or Incorrect Items:</strong> We cover all return shipping costs</li>
        <li><strong>Change of Mind:</strong> Customer is responsible for return shipping costs</li>
        <li><strong>Damaged in Transit:</strong> We cover all return shipping costs and provide replacement</li>
      </ul>
      
      <h2>6. Exchanges</h2>
      <p>We accept exchanges for:</p>
      <ul>
        <li>Defective products</li>
        <li>Incorrect items shipped</li>
        <li>Size or specification changes (subject to availability)</li>
      </ul>
      <p>To request an exchange, follow the same process as returns and specify that you'd like an exchange in your request.</p>
      
      <h2>7. Damaged or Defective Items</h2>
      <p>If you receive a damaged or defective item:</p>
      <ol>
        <li>Contact us within 48 hours of delivery</li>
        <li>Provide photos of the damage or defect</li>
        <li>We will arrange for replacement or full refund</li>
        <li>No need to return the damaged item unless requested</li>
      </ol>
      
      <h2>8. Warranty Claims</h2>
      <p>Many of our products come with manufacturer warranties. For warranty claims:</p>
      <ul>
        <li>Contact us with your product details and issue description</li>
        <li>We'll coordinate with the manufacturer on your behalf</li>
        <li>Warranty terms vary by product - check your product documentation</li>
      </ul>
      
      <h2>9. Restocking Fees</h2>
      <p>A restocking fee may apply in certain circumstances:</p>
      <ul>
        <li>Large or bulky items: 15% restocking fee</li>
        <li>Special order items: 20% restocking fee</li>
        <li>No restocking fee for defective or incorrect items</li>
      </ul>
      
      <h2>10. Late or Missing Refunds</h2>
      <p>If you haven't received your refund after the expected timeframe:</p>
      <ol>
        <li>Check your bank account or credit card statement</li>
        <li>Contact your credit card company (processing can take time)</li>
        <li>Contact your bank (there may be processing delays)</li>
        <li>If you've done all of this and still haven't received your refund, contact us at admin@costplus100.com.au</li>
      </ol>
      
      <h2>11. Australian Consumer Law</h2>
      <p>Your rights under the Australian Consumer Law are not affected by this return policy. You are entitled to a replacement or refund for a major failure and compensation for any other reasonably foreseeable loss or damage. You are also entitled to have the goods repaired or replaced if the goods fail to be of acceptable quality and the failure does not amount to a major failure.</p>
      
      <h2>12. Contact Us</h2>
      <p>For any questions about returns or refunds, please contact our customer service team:</p>
      <ul>
        <li><strong>Email:</strong> admin@costplus100.com.au</li>
        <li><strong>Phone:</strong> (08) 6165 8444</li>
        <li><strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM AWST</li>
      </ul>
    `;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E31837] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-[#E31837] p-3 rounded-lg">
              <RefreshCw className="size-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#2D3748]">Return & Refund Policy</h1>
              <p className="text-gray-600 mt-1">Your satisfaction is our priority</p>
            </div>
          </div>
          
          {lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-4 pt-4 border-t">
              <Calendar className="size-4" />
              <span>Last updated: {new Date(lastUpdated).toLocaleDateString('en-AU', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          )}
        </div>

        {/* Quick Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <CheckCircle className="size-6 text-green-600 mb-2" />
            <h3 className="font-semibold text-green-900 mb-1">30-Day Returns</h3>
            <p className="text-sm text-green-800">Return most items within 30 days</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <CheckCircle className="size-6 text-blue-600 mb-2" />
            <h3 className="font-semibold text-blue-900 mb-1">Fast Refunds</h3>
            <p className="text-sm text-blue-800">Processed within 5-7 business days</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <CheckCircle className="size-6 text-purple-600 mb-2" />
            <h3 className="font-semibold text-purple-900 mb-1">Easy Process</h3>
            <p className="text-sm text-purple-800">Simple return authorization</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div 
            className="legal-content prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {/* Important Notice */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-2">Need Help with a Return?</p>
              <p>Our customer service team is here to assist you. Contact us at <strong>admin@costplus100.com.au</strong> or call <strong>(08) 6165 8444</strong> during business hours.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
