// Terms and Conditions Page - Legal terms with admin-editable content
import { useState, useEffect } from 'react';
import { FileText, Calendar, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export default function TermsAndConditions() {
  const [content, setContent] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const response = await fetch(`${API_URL}/legal/terms-and-conditions`, {
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
      console.error('Failed to load terms:', error);
      setContent(getDefaultContent());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultContent = () => {
    return `
      <h2>1. Introduction</h2>
      <p>Welcome to Costplus100. These terms and conditions outline the rules and regulations for the use of our website and services.</p>
      
      <h2>2. Acceptance of Terms</h2>
      <p>By accessing this website and placing an order, you accept these terms and conditions in full. If you disagree with any part of these terms, you must not use our website.</p>
      
      <h2>3. Products and Services</h2>
      <p>All products and services are subject to availability. We reserve the right to discontinue any product at any time without notice.</p>
      <ul>
        <li>Product descriptions are accurate to the best of our knowledge</li>
        <li>Images are for illustrative purposes only</li>
        <li>Prices are subject to change without notice</li>
        <li>All prices are in Australian Dollars (AUD) and include GST</li>
      </ul>
      
      <h2>4. Orders and Payments</h2>
      <p>By placing an order, you warrant that:</p>
      <ul>
        <li>You are legally capable of entering into binding contracts</li>
        <li>You are at least 18 years old</li>
        <li>The information you provide is accurate and complete</li>
      </ul>
      <p>We accept payment via credit card, debit card, and bank transfer through our secure eWay payment gateway.</p>
      
      <h2>5. Shipping and Delivery</h2>
      <p>Delivery times are estimates only and may vary depending on location and product availability. We ship Australia-wide with standard delivery taking 3-5 business days for most items.</p>
      
      <h2>6. Returns and Refunds</h2>
      <p>Please refer to our Return & Refund Policy for detailed information about returns, exchanges, and refunds.</p>
      
      <h2>7. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, Costplus100 shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or services.</p>
      
      <h2>8. Privacy</h2>
      <p>Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.</p>
      
      <h2>9. Intellectual Property</h2>
      <p>All content on this website, including text, graphics, logos, and images, is the property of Costplus100 and protected by Australian and international copyright laws.</p>
      
      <h2>10. Changes to Terms</h2>
      <p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to the website. Your continued use of the website constitutes acceptance of modified terms.</p>
      
      <h2>11. Governing Law</h2>
      <p>These terms are governed by the laws of Australia. Any disputes will be subject to the exclusive jurisdiction of the courts of Australia.</p>
      
      <h2>12. Contact Information</h2>
      <p>If you have any questions about these Terms and Conditions, please contact us:</p>
      <ul>
        <li>Email: admin@costplus100.com.au</li>
        <li>Phone: (08) 6165 8444</li>
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
              <FileText className="size-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#2D3748]">Terms & Conditions</h1>
              <p className="text-gray-600 mt-1">Please read these terms carefully before using our services</p>
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

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div 
            className="legal-content prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {/* Important Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">Important Notice</p>
              <p>By using our website and services, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree, please discontinue use of our services immediately.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
