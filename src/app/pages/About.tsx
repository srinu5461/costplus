import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Loader2 } from 'lucide-react';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

const DEFAULT_HTML_CONTENT = `
<h1 style="text-align: center;">About Costplus100</h1>

<p style="font-size: 1.125rem; line-height: 1.75rem;">
  We are a group of highly experienced catering industry suppliers with more than 30 years of combined industry knowledge.
  After supplying some of Australia's biggest organisations, we came together to create a fresh business model designed to
  benefit everyday consumers, cafés, caterers, and businesses alike.
</p>

<p style="font-size: 1.125rem; line-height: 1.75rem;">
  Over the years, we have supplied major organisations including <strong>Coles Group, Woolworths Group, The Coffee Club</strong>,
  and state councils — just to name a few.
</p>

<div style="background-color: rgba(227, 24, 55, 0.05); border-left: 4px solid #E31837; padding: 1.5rem; margin: 2rem 0;">
  <p style="font-size: 1.25rem; font-weight: bold; color: #2D3748; margin: 0;">
    Our goal is simple:<br>
    bring honesty, transparency, and fair pricing back into the industry.
  </p>
</div>

<h2 style="margin-top: 3rem;">A Different Way of Doing Business</h2>

<p style="font-size: 1.125rem; line-height: 1.75rem;">
  Think of us as a <strong>buying club without the membership fees</strong>, hidden catches, or marketing gimmicks.
</p>

<p style="font-size: 1.125rem; line-height: 1.75rem;">
  We operate on a straightforward and publicly declared pricing model:
</p>

<div style="background-color: #1e293b; color: white; padding: 2rem; border-radius: 0.75rem; margin: 1.5rem 0; text-align: center;">
  <p style="font-size: 2rem; font-weight: bold; margin-bottom: 0.75rem;">
    Cost Price + $100 Markup
  </p>
  <p style="font-size: 1.25rem; margin: 0;">No more.</p>
</div>

<p style="font-size: 1.125rem; line-height: 1.75rem;">
  That means when you contact us, we will provide you with the <strong>true cost price</strong> plus our fixed $100 margin —
  what many would call "mates rates."
</p>

<p style="text-align: center; margin-top: 3rem; margin-bottom: 2rem;">
  <a href="/contact" style="background-color: #E31837; color: white; padding: 0.75rem 2rem; border-radius: 0.5rem; font-weight: 600; text-decoration: none; display: inline-block;">
    Contact Us for Cost Plus $100 Pricing
  </a>
</p>
`;

export function About() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAboutContent();
  }, []);

  const fetchAboutContent = async () => {
    try {
      const response = await fetch(`${API_URL}/cms/about-content`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.content) {
          setContent(data.content);
        } else {
          setContent(DEFAULT_HTML_CONTENT);
        }
      } else {
        setContent(DEFAULT_HTML_CONTENT);
      }
    } catch (err) {
      console.error('Error fetching About content:', err);
      setContent(DEFAULT_HTML_CONTENT);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#E31837]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 md:py-8">
        <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow">
          <div
            className="quill-content"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
}