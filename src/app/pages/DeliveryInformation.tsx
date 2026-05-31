// Delivery Information Page - Admin-editable delivery and shipping information
import { useState, useEffect } from 'react';
import { Truck, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function DeliveryInformation() {
  const [content, setContent] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const response = await fetch(`${API_URL}/legal/delivery-information`, {
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
      console.error('Failed to load delivery information:', error);
      setContent(getDefaultContent());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultContent = () => {
    return `
      <section style="background: linear-gradient(to right, #2D3748, #475569); color: white; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); padding: 2rem; margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
          <div style="background-color: #E31837; padding: 0.75rem; border-radius: 0.5rem;">
            <svg style="width: 1.5rem; height: 1.5rem; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <h2 style="font-size: 1.5rem; font-weight: bold;">Store Pickup Available</h2>
        </div>
        <p style="color: #e2e8f0; font-size: 1.125rem; line-height: 1.75;">
          You can pickup your ordered stock at <strong>Nisbets</strong> in any location.
        </p>
      </section>

      <section style="background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); padding: 2rem; margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
          <div style="background-color: #E31837; padding: 0.75rem; border-radius: 0.5rem;">
            <svg style="width: 1.5rem; height: 1.5rem; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 style="font-size: 1.5rem; font-weight: bold; color: #2D3748;">Please Note</h2>
        </div>

        <div style="background-color: #eff6ff; border-left: 4px solid #E31837; padding: 1.5rem; border-radius: 0.5rem;">
          <p style="color: #1e293b; font-size: 1.125rem; line-height: 1.75;">
            Items are dispatched by supplier, so delivery times vary. We will update you once your order is placed. 
            For any issues, please message <a href="mailto:info@costplus100.com.au" style="color: #E31837; font-weight: bold; text-decoration: underline;">info@costplus100.com.au</a>
          </p>
        </div>

        <div style="margin-top: 2rem;">
          <ul style="margin-bottom: 2rem;">
            <li style="display: flex; align-items: start; gap: 0.5rem; margin-bottom: 0.75rem;">
              <span style="color: #E31837; margin-top: 0.25rem;">✓</span>
              <span style="color: #475569;">Small item satchel rate automatically offered where possible</span>
            </li>
          </ul>

          <h3 style="font-size: 1.125rem; font-weight: 600; color: #2D3748; margin-bottom: 1rem; background-color: #f1f5f9; padding: 0.5rem 1rem; border-radius: 0.25rem;">
            Metro Areas Delivery
          </h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f1f5f9;">
                  <th style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; text-align: left; font-size: 0.875rem; font-weight: 600;">Location</th>
                  <th style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; text-align: left; font-size: 0.875rem; font-weight: 600;">Delivery Times</th>
                  <th style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; text-align: left; font-size: 0.875rem; font-weight: 600;">Under $300</th>
                  <th style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; text-align: left; font-size: 0.875rem; font-weight: 600;">Over $300+ (small items only)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="background-color: #fef9c3;">
                  <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: 600;">SYDNEY METRO</td>
                  <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: 600;">1-2 days</td>
                  <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: bold;">$30</td>
                  <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: bold; color: #15803d;">FREE</td>
                </tr>
                <tr style="background-color: #fecaca;">
                  <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: 600;">MELBOURNE METRO</td>
                  <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: 600;">1-2 days</td>
                  <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: bold;">$30</td>
                  <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: bold; color: #15803d;">FREE</td>
                </tr>
                <tr style="background-color: #ccfbf1;">
                  <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: 600;">BRISBANE METRO</td>
                  <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: 600;">1-2 days</td>
                  <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: bold;">$30</td>
                  <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: bold; color: #15803d;">FREE</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section style="background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); padding: 2rem; margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
          <div style="background-color: #2D3748; padding: 0.75rem; border-radius: 0.5rem;">
            <svg style="width: 1.5rem; height: 1.5rem; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <h2 style="font-size: 1.5rem; font-weight: bold; color: #2D3748;">Delivery Charges & Times For Other Areas</h2>
        </div>

        <p style="color: #475569; margin-bottom: 1.5rem;">
          Delivery times and charges vary by location. Please refer to our detailed delivery matrix or contact us for specific information about your area.
        </p>

        <h3 style="font-size: 1.125rem; font-weight: bold; color: #2D3748; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
          <span style="background-color: #fef9c3; padding: 0.25rem 0.75rem; border-radius: 0.25rem;">New South Wales - Regional</span>
        </h3>
        <div style="overflow-x: auto; margin-bottom: 2rem;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; text-align: left; font-size: 0.875rem; font-weight: 600;">Location</th>
                <th style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; text-align: left; font-size: 0.875rem; font-weight: 600;">Delivery Times</th>
                <th style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; text-align: left; font-size: 0.875rem; font-weight: 600;">Under $300</th>
                <th style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; text-align: left; font-size: 0.875rem; font-weight: 600;">$300-$700</th>
                <th style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; text-align: left; font-size: 0.875rem; font-weight: 600;">Over $700</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background-color: #fefce8;">
                <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: 600;">Regional Towns</td>
                <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem;">Next Day - 2 Days</td>
                <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: bold;">$30</td>
                <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: bold; color: #15803d;">FREE</td>
                <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: bold; color: #15803d;">FREE</td>
              </tr>
              <tr style="background-color: #fefce8;">
                <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: 600;">Regional Areas</td>
                <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem;">Next Day - 5 Days</td>
                <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: bold;">$60</td>
                <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: bold;">$30</td>
                <td style="border: 1px solid #cbd5e1; padding: 0.75rem 1rem; font-weight: bold; color: #15803d;">FREE</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section style="background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); padding: 2rem; margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
          <div style="background-color: #E31837; padding: 0.75rem; border-radius: 0.5rem;">
            <svg style="width: 1.5rem; height: 1.5rem; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 style="font-size: 1.5rem; font-weight: bold; color: #2D3748;">Important Delivery Information</h2>
        </div>

        <div style="margin-bottom: 1rem;">
          <div style="background-color: #f1f5f9; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid #E31837;">
            <p style="font-weight: 600; margin-bottom: 0.5rem;">Matrix Applicability:</p>
            <p style="font-size: 0.875rem;">
              This Matrix is not applicable for the delivery on Refrigeration, Chairs and some heavier items. Please contact our Customer Service team at <a href="mailto:info@costplus100.com.au" style="color: #E31837; font-weight: bold; text-decoration: underline;">info@costplus100.com.au</a> for pricing on large or heavy items.
            </p>
          </div>
        </div>

        <ul style="margin-left: 1rem; margin-bottom: 1.5rem;">
          <li style="display: flex; align-items: start; gap: 0.5rem; margin-bottom: 0.75rem;">
            <span style="color: #E31837; margin-top: 0.25rem;">•</span>
            <span>For large items a supplementary delivery charge may apply dependant on location</span>
          </li>
          <li style="display: flex; align-items: start; gap: 0.5rem; margin-bottom: 0.75rem;">
            <span style="color: #E31837; margin-top: 0.25rem;">•</span>
            <span><strong>Delivery hours are between 9am and 5pm (weekdays only)</strong></span>
          </li>
          <li style="display: flex; align-items: start; gap: 0.5rem; margin-bottom: 0.75rem;">
            <span style="color: #E31837; margin-top: 0.25rem;">•</span>
            <span>All delivery prices above are GST exclusive</span>
          </li>
          <li style="display: flex; align-items: start; gap: 0.5rem; margin-bottom: 0.75rem;">
            <span style="color: #E31837; margin-top: 0.25rem;">•</span>
            <span>The freight times offered are to be used as a guide only; Costplus100 will not be held responsible for any time delay.</span>
          </li>
          <li style="display: flex; align-items: start; gap: 0.5rem; margin-bottom: 0.75rem;">
            <span style="color: #E31837; margin-top: 0.25rem;">•</span>
            <span>Estimate based on items in stock [✓ In Stock]</span>
          </li>
          <li style="display: flex; align-items: start; gap: 0.5rem; margin-bottom: 0.75rem;">
            <span style="color: #E31837; margin-top: 0.25rem;">•</span>
            <span>Please note any items on backorder will be despatched together when all items arrive in our warehouse</span>
          </li>
        </ul>

        <div style="background-color: #fffbeb; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid #f59e0b; margin-top: 1.5rem;">
          <p style="font-weight: 600; margin-bottom: 0.5rem; color: #78350f;">Kerbside Delivery:</p>
          <p style="font-size: 0.875rem; color: #92400e;">
            Delivery of cooking machines, refrigeration, flat-pack items and most furniture products will be made to kerbside locations only. 
            It does not include negotiating lifts or stairs. Customers are responsible for ensuring that products ordered will fit through doorways 
            and into their premises. We cannot accept responsibility if it will not fit. Any carriage charges caused by an aborted delivery are 
            the customer's responsibility.
          </p>
        </div>

        <div style="background-color: #eff6ff; padding: 1rem; border-radius: 0.5rem; border-left: 4px solid #3b82f6; margin-top: 1rem;">
          <p style="font-weight: 600; margin-bottom: 0.5rem; color: #1e3a8a;">Warehouse Pickup:</p>
          <p style="font-size: 0.875rem; color: #1e40af;">
            If you are picking up your item from our warehouse please confirm actual box dimensions with our team before arrival, 
            and ensure you have an adequate vehicle to safely collect and transport. Warehouse staff reserve the right to refuse any vehicle 
            that is not fit to safely transport such items. All refrigeration equipment must also be transported in an upright fashion.
          </p>
        </div>
      </section>

      <section style="background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); padding: 2rem; margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
          <div style="background-color: #2D3748; padding: 0.75rem; border-radius: 0.5rem;">
            <svg style="width: 1.5rem; height: 1.5rem; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
          </div>
          <h2 style="font-size: 1.5rem; font-weight: bold; color: #2D3748;">Returns & Extended Delivery</h2>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.125rem; font-weight: 600; color: #2D3748; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
            <svg style="width: 1.25rem; height: 1.25rem; color: #E31837;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            Hassle Free 30 Day Returns
          </h3>
          <p style="color: #475569; line-height: 1.75;">
            Goods delivered may be returned for a refund, exchange or replacement within 30 days provided they are returned unused, 
            in a saleable condition and in their original packaging. Certain large or bulky items may be subject to hygiene purposes. 
            Certain goods cannot be returned in accordance with the Australian consumer law. Goods will need to be returned with adequate 
            postal packaging for health and safety reasons.
          </p>
        </div>

        <div style="margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.125rem; font-weight: 600; color: #2D3748; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
            <svg style="width: 1.25rem; height: 1.25rem; color: #E31837;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Extended Delivery Items
          </h3>
          <p style="color: #475569; line-height: 1.75;">
            Some of the items on our website have an extended delivery lead time of 1-2 days in addition to delivery times mentioned above. 
            This includes large, heavy or bulky items as they require additional handling. It also includes products that are temporarily out 
            of stock, and Items that are supplied direct from the manufacturer.
          </p>
        </div>

        <div>
          <h3 style="font-size: 1.125rem; font-weight: 600; color: #2D3748; margin-bottom: 0.75rem;">Offshore And Remote Deliveries</h3>
          <p style="color: #475569; line-height: 1.75;">
            For remote and off-shore area delivery times, please call for details. A supplementary delivery cost for heavy equipment may apply.
          </p>
        </div>
      </section>

      <section style="background: linear-gradient(to right, #2D3748, #475569); border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); padding: 2rem; text-align: center; color: white;">
        <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Questions About Delivery?</h2>
        <p style="color: #e2e8f0; margin-bottom: 1.5rem; max-width: 42rem; margin-left: auto; margin-right: auto;">
          Our customer service team is here to help with any questions about shipping, delivery times, or freight costs.
        </p>
        <div style="display: flex; flex-direction: column; gap: 1rem; justify-content: center; align-items: center;">
          <a 
            href="mailto:info@costplus100.com.au" 
            style="background-color: #E31837; color: white; padding: 0.75rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem;"
          >
            <svg style="width: 1.25rem; height: 1.25rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            Email Us
          </a>
        </div>
      </section>
    `;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#E31837]" />
          <span className="text-lg text-gray-600">Loading delivery information...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-[#2D3748] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center gap-3 mb-4">
            <Truck className="size-12 text-[#E31837]" />
            <h1 className="text-3xl md:text-4xl font-bold">Delivery & Returns</h1>
          </div>
          <p className="text-slate-300 text-lg max-w-3xl">
            Fast, reliable delivery across Australia. Learn about our shipping times, costs, and return policy.
          </p>
          {lastUpdated && (
            <p className="text-sm text-slate-400 mt-4 flex items-center gap-2">
              <Calendar className="size-4" />
              Last updated: {new Date(lastUpdated).toLocaleDateString('en-AU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
        {!content ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 flex items-start gap-4">
            <AlertCircle className="size-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-2">Content Not Available</h3>
              <p className="text-amber-800">
                The delivery information content has not been configured yet. Please contact the site administrator.
              </p>
            </div>
          </div>
        ) : (
          <div 
            className="legal-content prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
            style={{
              fontSize: '1rem',
              lineHeight: '1.75',
              color: '#475569',
            }}
          />
        )}
      </div>
    </div>
  );
}

export default DeliveryInformation;
