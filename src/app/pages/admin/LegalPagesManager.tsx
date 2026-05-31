// Legal Pages Manager - Admin panel for editing Terms, Return Policy, and Privacy Policy
import { useState, useEffect, useMemo } from 'react';
import { Save, FileText, RefreshCw, Shield, AlertCircle, CheckCircle, Eye, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

type PageType = 'terms-and-conditions' | 'return-refund-policy' | 'privacy-policy' | 'delivery-information';

interface PageContent {
  content: string;
  lastUpdated: string;
}

// Default content for each page (same as frontend defaults)
const DEFAULT_CONTENT = {
  'terms-and-conditions': `
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
    
    <h2>11. Contact Information</h2>
    <p>For questions about these terms, please contact us at:</p>
    <ul>
      <li>Email: admin@costplus100.com.au</li>
      <li>Phone: (08) 6165 8444</li>
      <li>Address: Perth, Western Australia</li>
    </ul>
  `,
  'return-refund-policy': `
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
    
    <h2>5. Damaged or Defective Items</h2>
    <p>If you receive a damaged or defective item:</p>
    <ul>
      <li>Contact us within 48 hours of delivery</li>
      <li>Provide photos of the damage or defect</li>
      <li>We will arrange for a replacement or full refund at no cost to you</li>
      <li>Return shipping will be covered by Costplus100</li>
    </ul>
    
    <h2>6. Restocking Fees</h2>
    <p>Most returns are processed without a restocking fee. However, a restocking fee may apply if:</p>
    <ul>
      <li>The item is returned after 30 days</li>
      <li>The packaging is damaged or incomplete</li>
      <li>The item shows signs of use or installation</li>
    </ul>
    
    <h2>7. Exchanges</h2>
    <p>We currently do not offer direct exchanges. If you need a different item, please return your purchase for a refund and place a new order.</p>
    
    <h2>8. Contact Us</h2>
    <p>For return questions or assistance, contact us:</p>
    <ul>
      <li>Email: admin@costplus100.com.au</li>
      <li>Phone: (08) 6165 8444</li>
      <li>Business Hours: Monday-Friday, 9am-5pm AWST</li>
    </ul>
  `,
  'privacy-policy': `
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
      <li>Analyze usage patterns and trends</li>
    </ul>
    
    <h2>4. Information Sharing and Disclosure</h2>
    <p>We do not sell your personal information. We may share your information with:</p>
    <ul>
      <li><strong>Service Providers:</strong> Third parties who perform services on our behalf (payment processing, shipping, email delivery)</li>
      <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
      <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
    </ul>
    
    <h2>5. Data Security</h2>
    <p>We implement industry-standard security measures to protect your information, including:</p>
    <ul>
      <li>Encryption of sensitive data (SSL/TLS)</li>
      <li>Secure payment processing through eWay</li>
      <li>Regular security audits and updates</li>
      <li>Access controls and authentication</li>
      <li>Secure data storage with Supabase</li>
    </ul>
    <p>However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
    
    <h2>6. Your Rights and Choices</h2>
    <p>Under Australian privacy law, you have the right to:</p>
    <ul>
      <li>Access your personal information</li>
      <li>Correct inaccurate information</li>
      <li>Request deletion of your information</li>
      <li>Opt-out of marketing communications</li>
      <li>Object to certain data processing</li>
    </ul>
    <p>To exercise these rights, contact us at admin@costplus100.com.au</p>
    
    <h2>7. Cookies and Tracking</h2>
    <p>We use cookies and similar technologies to:</p>
    <ul>
      <li>Remember your preferences</li>
      <li>Understand how you use our website</li>
      <li>Improve website functionality</li>
      <li>Deliver personalized content</li>
    </ul>
    <p>You can control cookies through your browser settings, but disabling cookies may affect website functionality.</p>
    
    <h2>8. Children's Privacy</h2>
    <p>Our services are not directed to children under 13. We do not knowingly collect information from children. If we become aware that we have collected personal information from a child, we will delete it immediately.</p>
    
    <h2>9. Changes to This Policy</h2>
    <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on our website and updating the "Last Updated" date.</p>
    
    <h2>10. Contact Us</h2>
    <p>For questions about this Privacy Policy or our data practices, contact us:</p>
    <ul>
      <li>Email: admin@costplus100.com.au</li>
      <li>Phone: (08) 6165 8444</li>
      <li>Address: Perth, Western Australia</li>
    </ul>
    
    <h2>11. Australian Privacy Principles</h2>
    <p>We comply with the Australian Privacy Principles (APPs) contained in the Privacy Act 1988 (Cth). For more information about your privacy rights, visit the Office of the Australian Information Commissioner (OAIC) at www.oaic.gov.au</p>
  `,
  'delivery-information': `
    <h2>Store Pickup Available</h2>
    <div style="background-color: #f0f9ff; padding: 1rem; border-left: 4px solid #E31837; margin-bottom: 1.5rem; border-radius: 0.25rem;">
      <p style="font-size: 1.125rem;">You can pickup your ordered stock at <strong>Nisbets</strong> in any location.</p>
    </div>

    <h2>Please Note</h2>
    <div style="background-color: #eff6ff; padding: 1.5rem; border-left: 4px solid #E31837; margin-bottom: 1.5rem; border-radius: 0.25rem;">
      <p style="font-size: 1.125rem;">
        Items are dispatched by supplier, so delivery times vary. We will update you once your order is placed. 
        For any issues, please message <a href="mailto:info@costplus100.com.au" style="color: #E31837; font-weight: bold;">info@costplus100.com.au</a>
      </p>
    </div>

    <p><strong>✓</strong> Small item satchel rate automatically offered where possible</p>

    <h3 style="background-color: #f1f5f9; padding: 0.75rem 1rem; margin-top: 1.5rem; margin-bottom: 1rem; border-radius: 0.25rem;">Metro Areas Delivery</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Location</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Delivery Times</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Under $300</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Over $300+ (small items only)</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color: #fef9c3;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">SYDNEY METRO</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">1-2 days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
        <tr style="background-color: #fecaca;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">MELBOURNE METRO</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">1-2 days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
        <tr style="background-color: #ccfbf1;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">BRISBANE METRO</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">1-2 days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
      </tbody>
    </table>

    <h2>Delivery Charges & Times For Other Areas</h2>
    
    <h3 style="background-color: #fef9c3; padding: 0.5rem 1rem; margin-top: 1.5rem; margin-bottom: 1rem; border-radius: 0.25rem; display: inline-block;">New South Wales - Regional</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Location</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Delivery Times</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Under $300</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">$300-$700</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Over $700</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color: #fefce8;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Towns</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">Next Day - 2 Days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
        <tr style="background-color: #fefce8;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Areas</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">Next Day - 5 Days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$60</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
      </tbody>
    </table>

    <h3 style="background-color: #ccfbf1; padding: 0.5rem 1rem; margin-top: 1.5rem; margin-bottom: 1rem; border-radius: 0.25rem; display: inline-block;">Queensland - Regional</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Location</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Delivery Times</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Under $300</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">$300-$700</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Over $700</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color: #f0fdfa;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Towns</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">Next Day - 6 Days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$60</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
        <tr style="background-color: #f0fdfa;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Areas</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">Next Day - 11 Days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$120</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$90</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
      </tbody>
    </table>

    <h3 style="background-color: #fed7aa; padding: 0.5rem 1rem; margin-top: 1.5rem; margin-bottom: 1rem; border-radius: 0.25rem; display: inline-block;">Victoria - Regional</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Location</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Delivery Times</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Under $300</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">$300-$700</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Over $700</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color: #ffedd5;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Towns</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">Next Day - 2 Days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$40</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$10</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
        <tr style="background-color: #ffedd5;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Areas</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">Next Day - 6 Days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$60</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
      </tbody>
    </table>

    <h3 style="background-color: #fde68a; padding: 0.5rem 1rem; margin-top: 1.5rem; margin-bottom: 1rem; border-radius: 0.25rem; display: inline-block;">South Australia</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Location</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Delivery Times</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Under $300</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">$300-$700</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Over $700</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color: #fef3c7;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Towns</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">2 Days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$40</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$10</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
        <tr style="background-color: #fef3c7;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Areas</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">2-4 Days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$60</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
      </tbody>
    </table>

    <h3 style="background-color: #e9d5ff; padding: 0.5rem 1rem; margin-top: 1.5rem; margin-bottom: 1rem; border-radius: 0.25rem; display: inline-block;">Northern Territory</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Location</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Delivery Times</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Under $300</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">$300-$700</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Over $700</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color: #f3e8ff;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">DARWIN</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">4 Days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$150</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$120</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
        <tr style="background-color: #f3e8ff;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Areas</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">4-12 Days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$170</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$140</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
      </tbody>
    </table>

    <h3 style="background-color: #bbf7d0; padding: 0.5rem 1rem; margin-top: 1.5rem; margin-bottom: 1rem; border-radius: 0.25rem; display: inline-block;">Western Australia</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Location</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Delivery Times</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Under $300</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">$300-$700</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Over $700</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color: #dcfce7;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">PERTH</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">5 Days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$100</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$70</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
        <tr style="background-color: #dcfce7;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Areas</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">5-14 Days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$120</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$90</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
      </tbody>
    </table>

    <h3 style="background-color: #a5f3fc; padding: 0.5rem 1rem; margin-top: 1.5rem; margin-bottom: 1rem; border-radius: 0.25rem; display: inline-block;">Tasmania</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Location</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Delivery Times</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Under $300</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">$300-$700</th>
          <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Over $700</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color: #cffafe;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">HOBART / LAUNCESTON</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">4 Days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$60</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
        <tr style="background-color: #cffafe;">
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Areas</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">4-12 Days</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$80</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$50</td>
          <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold; color: #15803d;">FREE</td>
        </tr>
      </tbody>
    </table>

    <h2>Important Delivery Information</h2>
    
    <div style="background-color: #f1f5f9; padding: 1rem; border-left: 4px solid #E31837; margin-bottom: 1rem; border-radius: 0.25rem;">
      <p style="font-weight: 600; margin-bottom: 0.5rem;">Matrix Applicability:</p>
      <p>This Matrix is not applicable for the delivery on Refrigeration, Chairs and some heavier items. Please contact our Customer Service team at <a href="mailto:info@costplus100.com.au" style="color: #E31837; font-weight: bold;">info@costplus100.com.au</a> for pricing on large or heavy items.</p>
    </div>

    <ul>
      <li>For large items a supplementary delivery charge may apply dependant on location</li>
      <li><strong>Delivery hours are between 9am and 5pm (weekdays only)</strong></li>
      <li>All delivery prices above are GST exclusive</li>
      <li>The freight times offered are to be used as a guide only; Costplus100 will not be held responsible for any time delay.</li>
      <li>Estimate based on items in stock [✓ In Stock]</li>
      <li>Please note any items on backorder will be despatched together when all items arrive in our warehouse</li>
    </ul>

    <div style="background-color: #fffbeb; padding: 1rem; border-left: 4px solid #f59e0b; margin-top: 1.5rem; margin-bottom: 1rem; border-radius: 0.25rem;">
      <p style="font-weight: 600; margin-bottom: 0.5rem; color: #78350f;">Kerbside Delivery:</p>
      <p style="color: #92400e;">
        Delivery of cooking machines, refrigeration, flat-pack items and most furniture products will be made to kerbside locations only. 
        It does not include negotiating lifts or stairs. Customers are responsible for ensuring that products ordered will fit through doorways 
        and into their premises. We cannot accept responsibility if it will not fit. Any carriage charges caused by an aborted delivery are 
        the customer's responsibility.
      </p>
    </div>

    <div style="background-color: #eff6ff; padding: 1rem; border-left: 4px solid #3b82f6; margin-top: 1rem; margin-bottom: 1rem; border-radius: 0.25rem;">
      <p style="font-weight: 600; margin-bottom: 0.5rem; color: #1e3a8a;">Warehouse Pickup:</p>
      <p style="color: #1e40af;">
        If you are picking up your item from our warehouse please confirm actual box dimensions with our team before arrival, 
        and ensure you have an adequate vehicle to safely collect and transport. Warehouse staff reserve the right to refuse any vehicle 
        that is not fit to safely transport such items. All refrigeration equipment must also be transported in an upright fashion.
      </p>
    </div>

    <div style="background-color: #f1f5f9; padding: 1rem; border-left: 4px solid #64748b; margin-top: 1rem; border-radius: 0.25rem;">
      <p>
        All customers arranging their own collections (whether personally or their own courier) are required to check order and packaging 
        thoroughly before departure. All responsibility for condition will be transferred from Costplus100 to customer at this point in time.
      </p>
    </div>

    <h2>Returns & Extended Delivery</h2>

    <h3>Hassle Free 30 Day Returns</h3>
    <p>
      Goods delivered may be returned for a refund, exchange or replacement within 30 days provided they are returned unused, 
      in a saleable condition and in their original packaging. Certain large or bulky items may be subject to hygiene purposes. 
      Certain goods cannot be returned in accordance with the Australian consumer law. Goods will need to be returned with adequate 
      postal packaging for health and safety reasons. Certain last-in-line or special-to-order goods may also be non-returnable. 
      Those goods will be accordingly on the Uropa website or Catalogue. The cost of return may be refunded in whole or in part to 
      the customer at Uropas' discretion. For more information, please see our Terms and Conditions.
    </p>

    <h3>Extended Delivery Items</h3>
    <p>
      Some of the items on our website have an extended delivery lead time of 1-2 days in addition to delivery times mentioned above. 
      This includes large, heavy or bulky items as they require additional handling. It also includes products that are temporarily out 
      of stock, and Items that are supplied direct from the manufacturer.
    </p>

    <h3>Offshore And Remote Deliveries</h3>
    <p>
      For remote and off-shore area delivery times, please call for details. A supplementary delivery cost for heavy equipment may apply.
    </p>

    <h2>Questions About Delivery?</h2>
    <p style="text-align: center; margin-bottom: 1rem;">
      Our customer service team is here to help with any questions about shipping, delivery times, or freight costs.
    </p>
    <p style="text-align: center;">
      <a href="mailto:info@costplus100.com.au" style="background-color: #E31837; color: white; padding: 0.75rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; display: inline-block;">
        Email Us
      </a>
    </p>
  `,
};

export default function LegalPagesManager() {
  const [activeTab, setActiveTab] = useState<PageType>('terms-and-conditions');
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(false);
  
  const [pages, setPages] = useState<Record<PageType, PageContent>>({
    'terms-and-conditions': { content: '', lastUpdated: '' },
    'return-refund-policy': { content: '', lastUpdated: '' },
    'privacy-policy': { content: '', lastUpdated: '' },
    'delivery-information': { content: '', lastUpdated: '' },
  });

  useEffect(() => {
    loadAllPages();
  }, []);

  const loadAllPages = async () => {
    const pageTypes: PageType[] = ['terms-and-conditions', 'return-refund-policy', 'privacy-policy', 'delivery-information'];
    
    for (const pageType of pageTypes) {
      try {
        const response = await fetch(`${API_URL}/legal/${pageType}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        });
        if (response.ok) {
          const data = await response.json();
          setPages(prev => ({
            ...prev,
            [pageType]: {
              content: data.content || '',
              lastUpdated: data.lastUpdated || new Date().toISOString(),
            },
          }));
        }
      } catch (error) {
        console.error(`Failed to load ${pageType}:`, error);
      }
    }
  };

  // Initialize all pages with default content
  const initializeDefaultContent = async () => {
    if (!confirm('This will load default content for all legal pages. Any unsaved changes will be lost. Continue?')) {
      return;
    }

    setInitializing(true);
    setMessage('');

    try {
      const pageTypes: PageType[] = ['terms-and-conditions', 'return-refund-policy', 'privacy-policy', 'delivery-information'];
      
      for (const pageType of pageTypes) {
        const response = await fetch(`${API_URL}/legal/${pageType}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: DEFAULT_CONTENT[pageType],
            lastUpdated: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to initialize ${pageType}`);
        }
      }

      setMessage('✅ All legal pages initialized with default content successfully!');
      setTimeout(() => setMessage(''), 5000);
      loadAllPages(); // Reload to show new content
    } catch (error) {
      console.error('Initialize error:', error);
      setMessage('❌ Error initializing pages. Please try again.');
    } finally {
      setInitializing(false);
    }
  };

  const savePage = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API_URL}/legal/${activeTab}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: pages[activeTab].content,
          lastUpdated: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setMessage('Page saved successfully!');
        setTimeout(() => setMessage(''), 3000);
        // Reload to get the updated lastUpdated timestamp
        loadAllPages();
      } else {
        setMessage('Failed to save page');
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage('Error saving page');
    } finally {
      setSaving(false);
    }
  };

  const updateContent = (content: string) => {
    setPages(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        content,
      },
    }));
  };

  // Quill editor configuration
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'color', 'background',
    'align',
    'link'
  ];

  const pageInfo = {
    'terms-and-conditions': {
      icon: FileText,
      title: 'Terms & Conditions',
      description: 'Legal terms for using your website and services',
      publicUrl: '/terms-and-conditions',
    },
    'return-refund-policy': {
      icon: RefreshCw,
      title: 'Return & Refund Policy',
      description: 'Customer return and refund guidelines',
      publicUrl: '/return-refund-policy',
    },
    'privacy-policy': {
      icon: Shield,
      title: 'Privacy Policy',
      description: 'How you collect, use, and protect customer data',
      publicUrl: '/privacy-policy',
    },
    'delivery-information': {
      icon: FileText,
      title: 'Delivery Information',
      description: 'Details about our delivery process and times',
      publicUrl: '/delivery-information',
    },
  };

  const currentPage = pageInfo[activeTab];
  const Icon = currentPage.icon;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2D3748] mb-2">Legal Pages Manager</h1>
          <p className="text-gray-600">Edit and manage your legal documents and policies</p>
        </div>
        <Button
          onClick={initializeDefaultContent}
          disabled={initializing}
          className="bg-green-600 hover:bg-green-700"
        >
          <Download className="size-4 mr-2" />
          {initializing ? 'Initializing...' : 'Load Default Content'}
        </Button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.includes('✅') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.includes('✅') ? (
            <CheckCircle className="size-5" />
          ) : (
            <AlertCircle className="size-5" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Show warning if pages are empty */}
      {!pages[activeTab].content && (
        <div className="mb-6 p-4 rounded-lg flex items-center gap-3 bg-orange-50 text-orange-800 border border-orange-200">
          <AlertCircle className="size-5" />
          <div>
            <p className="font-semibold">No content found for this page!</p>
            <p className="text-sm">Click "Load Default Content" button above to initialize all legal pages with professional default content.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(Object.keys(pageInfo) as PageType[]).map((pageType) => {
          const PageIcon = pageInfo[pageType].icon;
          return (
            <button
              key={pageType}
              onClick={() => setActiveTab(pageType)}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === pageType
                  ? 'text-[#E31837] border-b-2 border-[#E31837]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <PageIcon className="size-4" />
              {pageInfo[pageType].title}
            </button>
          );
        })}
      </div>

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-[#E31837] p-3 rounded-lg">
              <Icon className="size-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#2D3748]">{currentPage.title}</h2>
              <p className="text-gray-600 mt-1">{currentPage.description}</p>
              {pages[activeTab].lastUpdated && (
                <p className="text-sm text-gray-500 mt-2">
                  Last updated: {new Date(pages[activeTab].lastUpdated).toLocaleDateString('en-AU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setPreview(!preview)}
              variant="outline"
              size="sm"
            >
              <Eye className="size-4 mr-2" />
              {preview ? 'Edit' : 'Preview'}
            </Button>
            <Button
              onClick={() => window.open(currentPage.publicUrl, '_blank')}
              variant="outline"
              size="sm"
            >
              View Live Page
            </Button>
          </div>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {preview ? (
          <>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              <strong>Preview Mode:</strong> This is how your content will appear to customers
            </div>
            <div 
              className="legal-content prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: pages[activeTab].content }}
            />
          </>
        ) : (
          <>
            <Label className="mb-2 block text-lg font-semibold">Page Content</Label>
            <p className="text-sm text-gray-600 mb-4">
              {activeTab === 'delivery-information' 
                ? 'Edit the HTML directly. Tables and complex formatting are preserved. Use Preview to see how it looks.'
                : 'Use the formatting toolbar to style your content. The content will be displayed professionally on the customer-facing pages.'}
            </p>
            <div className="mb-6">
              {activeTab === 'delivery-information' ? (
                // Plain HTML editor for delivery information (preserves tables)
                <textarea
                  value={pages[activeTab].content}
                  onChange={(e) => updateContent(e.target.value)}
                  className="w-full h-[600px] p-4 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="Enter HTML content here..."
                />
              ) : (
                // Rich text editor for other pages
                <ReactQuill
                  value={pages[activeTab].content}
                  onChange={updateContent}
                  modules={modules}
                  formats={formats}
                  className="bg-white"
                  style={{ height: '500px', marginBottom: '50px' }}
                />
              )}
            </div>

            <div className={`flex justify-end gap-3 pt-4 border-t ${activeTab === 'delivery-information' ? 'mt-6' : 'mt-16'}`}>
              <Button
                onClick={() => loadAllPages()}
                variant="outline"
              >
                Reset Changes
              </Button>
              <Button
                onClick={savePage}
                disabled={saving}
                className="bg-[#E31837] hover:bg-[#E31837]/90"
              >
                <Save className="size-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Tips */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📝 Writing Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use clear, simple language</li>
            <li>• Break content into sections</li>
            <li>• Use headings and bullet points</li>
            <li>• Keep paragraphs short</li>
          </ul>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">✅ Legal Requirements</h3>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Comply with Australian law</li>
            <li>• Include contact information</li>
            <li>• Specify return timeframes</li>
            <li>• Explain data collection</li>
          </ul>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-900 mb-2">⚡ Best Practices</h3>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Review and update regularly</li>
            <li>• Get legal review if needed</li>
            <li>• Make easily accessible</li>
            <li>• Use professional tone</li>
          </ul>
        </div>
      </div>
    </div>
  );
}