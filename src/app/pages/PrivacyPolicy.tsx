// Privacy Policy Page - Data protection policy with admin-editable content
import { useState, useEffect } from 'react';
import { Shield, Calendar, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export default function PrivacyPolicy() {
  const [content, setContent] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const response = await fetch(`${API_URL}/legal/privacy-policy`, {
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
      console.error('Failed to load privacy policy:', error);
      setContent(getDefaultContent());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultContent = () => {
    return `
      <h2>1. Introduction</h2>
      <p>Costplus100 ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.</p>
      
      <h2>2. Information We Collect</h2>
      <h3>Personal Information</h3>
      <p>We may collect personal information that you voluntarily provide when you:</p>
      <ul>
        <li>Register for an account</li>
        <li>Place an order</li>
        <li>Subscribe to our newsletter</li>
        <li>Contact customer service</li>
        <li>Participate in surveys or promotions</li>
      </ul>
      <p>This information may include:</p>
      <ul>
        <li>Name and contact details (email, phone, address)</li>
        <li>Billing and shipping information</li>
        <li>Payment card details (processed securely through eWay)</li>
        <li>Purchase history and preferences</li>
        <li>Communication preferences</li>
      </ul>
      
      <h3>Automatically Collected Information</h3>
      <p>When you visit our website, we automatically collect certain information:</p>
      <ul>
        <li>IP address and location data</li>
        <li>Browser type and version</li>
        <li>Device information</li>
        <li>Pages visited and time spent</li>
        <li>Referring website</li>
        <li>Cookies and similar technologies</li>
      </ul>
      
      <h2>3. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Process and fulfill your orders</li>
        <li>Communicate with you about your orders and account</li>
        <li>Provide customer support</li>
        <li>Send you marketing communications (with your consent)</li>
        <li>Improve our website and services</li>
        <li>Prevent fraud and enhance security</li>
        <li>Comply with legal obligations</li>
        <li>Analyze usage patterns and preferences</li>
      </ul>
      
      <h2>4. Information Sharing and Disclosure</h2>
      <p>We do not sell your personal information. We may share your information with:</p>
      
      <h3>Service Providers</h3>
      <ul>
        <li>Payment processors (eWay) for secure transaction processing</li>
        <li>Shipping and logistics partners for order delivery</li>
        <li>Email service providers for communications</li>
        <li>Analytics providers to improve our services</li>
        <li>Cloud hosting providers for data storage</li>
      </ul>
      
      <h3>Legal Requirements</h3>
      <p>We may disclose your information if required by law or in response to:</p>
      <ul>
        <li>Legal processes or government requests</li>
        <li>Protection of our rights and safety</li>
        <li>Investigation of fraud or security issues</li>
        <li>Enforcement of our terms and conditions</li>
      </ul>
      
      <h2>5. Data Security</h2>
      <p>We implement appropriate security measures to protect your information:</p>
      <ul>
        <li>SSL/TLS encryption for data transmission</li>
        <li>Secure payment processing through eWay</li>
        <li>Regular security assessments</li>
        <li>Access controls and authentication</li>
        <li>Employee training on data protection</li>
      </ul>
      <p>However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.</p>
      
      <h2>6. Cookies and Tracking Technologies</h2>
      <p>We use cookies and similar technologies to:</p>
      <ul>
        <li>Remember your preferences and settings</li>
        <li>Keep you logged in to your account</li>
        <li>Analyze website traffic and usage patterns</li>
        <li>Provide personalized content and recommendations</li>
        <li>Measure the effectiveness of marketing campaigns</li>
      </ul>
      <p>You can control cookies through your browser settings. Disabling cookies may affect website functionality.</p>
      
      <h2>7. Your Rights and Choices</h2>
      <p>Under Australian Privacy law, you have the right to:</p>
      <ul>
        <li><strong>Access:</strong> Request a copy of your personal information</li>
        <li><strong>Correction:</strong> Update or correct inaccurate information</li>
        <li><strong>Deletion:</strong> Request deletion of your personal information</li>
        <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
        <li><strong>Data Portability:</strong> Request your data in a portable format</li>
        <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing</li>
      </ul>
      <p>To exercise these rights, contact us at admin@costplus100.com.au</p>
      
      <h2>8. Marketing Communications</h2>
      <p>With your consent, we may send you:</p>
      <ul>
        <li>Promotional emails about new products and special offers</li>
        <li>Newsletters and industry updates</li>
        <li>Personalized product recommendations</li>
      </ul>
      <p>You can unsubscribe at any time by clicking the "unsubscribe" link in our emails or contacting us directly.</p>
      
      <h2>9. Third-Party Links</h2>
      <p>Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal information.</p>
      
      <h2>10. Children's Privacy</h2>
      <p>Our website is not intended for children under 18 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately.</p>
      
      <h2>11. Data Retention</h2>
      <p>We retain your personal information for as long as necessary to:</p>
      <ul>
        <li>Fulfill the purposes outlined in this policy</li>
        <li>Comply with legal and regulatory requirements</li>
        <li>Resolve disputes and enforce agreements</li>
        <li>Maintain business records</li>
      </ul>
      <p>After this period, we will securely delete or anonymize your information.</p>
      
      <h2>12. International Data Transfers</h2>
      <p>Your information may be transferred to and processed in countries other than Australia. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy and applicable laws.</p>
      
      <h2>13. Changes to This Privacy Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by:</p>
      <ul>
        <li>Posting the updated policy on our website</li>
        <li>Updating the "Last Updated" date</li>
        <li>Sending you an email notification (for significant changes)</li>
      </ul>
      
      <h2>14. Contact Us</h2>
      <p>If you have questions or concerns about this Privacy Policy or our data practices, please contact us:</p>
      <ul>
        <li><strong>Email:</strong> admin@costplus100.com.au</li>
        <li><strong>Phone:</strong> (08) 6165 8444</li>
        <li><strong>Mail:</strong> Costplus100 Pty Ltd, [Your Business Address]</li>
      </ul>
      
      <h2>15. Complaints</h2>
      <p>If you believe we have breached the Australian Privacy Principles, you can lodge a complaint with us. We will investigate and respond within 30 days. If you are not satisfied with our response, you can contact the Office of the Australian Information Commissioner (OAIC) at www.oaic.gov.au</p>
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
              <Shield className="size-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#2D3748]">Privacy Policy</h1>
              <p className="text-gray-600 mt-1">Your privacy and data protection are important to us</p>
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
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-green-600 shrink-0 mt-0.5" />
            <div className="text-sm text-green-900">
              <p className="font-semibold mb-2">Your Data, Your Rights</p>
              <p>You have full control over your personal information. To exercise your privacy rights or if you have any questions, contact us at <strong>admin@costplus100.com.au</strong> or call <strong>(08) 6165 8444</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
