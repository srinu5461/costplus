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
            <th style="border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left;">Over $300</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background-color: #fef9c3;">
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">SYDNEY METRO</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">1-2 days</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          </tr>
          <tr style="background-color: #fecaca;">
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">MELBOURNE METRO</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">1-2 days</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          </tr>
          <tr style="background-color: #ccfbf1;">
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">BRISBANE METRO</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">1-2 days</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          </tr>
        </tbody>
      </table>

      <h2>Delivery Charges &amp; Times For Other Areas</h2>

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
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          </tr>
          <tr style="background-color: #fefce8;">
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Areas</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">Next Day - 5 Days</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$60</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
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
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          </tr>
          <tr style="background-color: #f0fdfa;">
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Areas</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">Next Day - 11 Days</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$120</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$90</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
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
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          </tr>
          <tr style="background-color: #ffedd5;">
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Areas</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">Next Day - 6 Days</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$60</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
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
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          </tr>
          <tr style="background-color: #fef3c7;">
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Areas</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">2-4 Days</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$60</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
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
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          </tr>
          <tr style="background-color: #f3e8ff;">
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Areas</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">4-12 Days</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$170</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$140</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
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
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          </tr>
          <tr style="background-color: #dcfce7;">
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Areas</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">5-14 Days</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$120</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$90</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
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
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
          </tr>
          <tr style="background-color: #cffafe;">
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: 600;">Regional Areas</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem;">4-12 Days</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$80</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$50</td>
            <td style="border: 1px solid #cbd5e1; padding: 0.75rem; font-weight: bold;">$30</td>
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

      <h2>Returns &amp; Extended Delivery</h2>

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
