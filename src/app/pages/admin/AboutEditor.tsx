import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Loader2, Save, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface AboutContent {
  content: string;
  lastUpdated: string;
}

const DEFAULT_CONTENT = `
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

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0;">
  <div style="background-color: #f8fafc; padding: 1rem; border-radius: 0.5rem; text-align: center;">
    <p style="font-weight: bold; color: #E31837; font-size: 1.125rem; margin: 0;">No inflated margins</p>
  </div>
  <div style="background-color: #f8fafc; padding: 1rem; border-radius: 0.5rem; text-align: center;">
    <p style="font-weight: bold; color: #E31837; font-size: 1.125rem; margin: 0;">No hidden fees</p>
  </div>
  <div style="background-color: #f8fafc; padding: 1rem; border-radius: 0.5rem; text-align: center;">
    <p style="font-weight: bold; color: #E31837; font-size: 1.125rem; margin: 0;">No bull</p>
  </div>
</div>

<div style="background-color: #fef3c7; border: 2px solid #fbbf24; padding: 1.5rem; border-radius: 0.5rem; margin: 2rem 0;">
  <p style="font-weight: 600; color: #2D3748; margin-bottom: 0.5rem;">⚠️ Please note:</p>
  <p style="margin: 0;">
    Our published website prices are standard industry prices only.<br>
    When you contact us directly, we will provide your genuine <strong style="color: #E31837;">Cost Plus $100 price</strong>.
  </p>
</div>

<h2 style="margin-top: 3rem;">Total Transparency</h2>

<p style="font-size: 1.125rem; line-height: 1.75rem;">
  We believe customers deserve to know exactly what they are paying for.
</p>

<p style="font-size: 1.125rem; line-height: 1.75rem;">
  That's why we openly declare our pricing structure and <strong>publicly invite Fair Trading authorities</strong> to review
  any sale, at any time.
</p>

<p style="font-size: 1.125rem; line-height: 1.75rem;">
  We are proud to operate with 100% transparency and are committed to helping stop the hidden markups that have become common
  throughout the industry.
</p>

<h2 style="margin-top: 3rem;">Real Industry Buying Power</h2>

<p style="font-size: 1.125rem; line-height: 1.75rem;">
  Because of our long-standing supplier relationships and industry experience, we receive access to <strong>importer specials
  and wholesale opportunities</strong> that are normally unavailable to the public.
</p>

<p style="font-size: 1.125rem; line-height: 1.75rem;">
  Whenever these special prices are passed on to us, they are also <strong style="color: #E31837;">passed directly on to you</strong>.
</p>

<h2 style="margin-top: 3rem;">No Email Harassment</h2>

<p style="font-size: 1.125rem; line-height: 1.75rem;">
  We are not a spam-style marketing organisation.
</p>

<p style="font-size: 1.125rem; line-height: 1.75rem;">
  We do not keep your email address for endless promotions or unwanted marketing campaigns. We respect your privacy and
  believe good service speaks for itself.
</p>

<h2 style="margin-top: 3rem; text-align: center;">Our Promise</h2>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin: 2rem 0;">
  <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
    <div style="color: #E31837; margin-top: 0.25rem;">✓</div>
    <p style="margin: 0;">Genuine wholesale buying power</p>
  </div>
  <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
    <div style="color: #E31837; margin-top: 0.25rem;">✓</div>
    <p style="margin: 0;">Cost Plus $100 pricing</p>
  </div>
  <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
    <div style="color: #E31837; margin-top: 0.25rem;">✓</div>
    <p style="margin: 0;">No hidden margins</p>
  </div>
  <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
    <div style="color: #E31837; margin-top: 0.25rem;">✓</div>
    <p style="margin: 0;">No membership fees</p>
  </div>
  <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
    <div style="color: #E31837; margin-top: 0.25rem;">✓</div>
    <p style="margin: 0;">No marketing tricks</p>
  </div>
  <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
    <div style="color: #E31837; margin-top: 0.25rem;">✓</div>
    <p style="margin: 0;">Total transparency</p>
  </div>
  <div style="display: flex; align-items: flex-start; gap: 0.75rem; grid-column: span 2;">
    <div style="color: #E31837; margin-top: 0.25rem;">✓</div>
    <p style="margin: 0;">Honest service from experienced industry professionals</p>
  </div>
</div>

<div style="background: linear-gradient(to right, #E31837, #C41230); color: white; padding: 2rem; border-radius: 0.75rem; margin: 2rem 0; text-align: center;">
  <p style="font-size: 1.875rem; font-weight: bold; margin: 0;">
    Simple, fair, and transparent — the way business should be.
  </p>
</div>
`;

export function AboutEditor() {
  const [content, setContent] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchAboutContent();
  }, []);

  const fetchAboutContent = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/cms/about-content`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.content) {
          setContent(data.content);
          setLastUpdated(data.lastUpdated || '');
        } else {
          // Use default content if none exists
          setContent(DEFAULT_CONTENT);
        }
      } else {
        // Use default content if fetch fails
        setContent(DEFAULT_CONTENT);
      }
    } catch (err) {
      console.error('Error fetching About content:', err);
      setError('Failed to load About content. Using default values.');
      setContent(DEFAULT_CONTENT);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(`${API_URL}/cms/about-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          content: content,
          lastUpdated: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save About content');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      fetchAboutContent(); // Reload to get updated timestamp
    } catch (err) {
      console.error('Error saving About content:', err);
      setError(err instanceof Error ? err.message : 'Failed to save About content');
    } finally {
      setSaving(false);
    }
  };

  const loadDefaultContent = () => {
    if (confirm('Load default content? This will replace your current content.')) {
      setContent(DEFAULT_CONTENT);
    }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-[#E31837]" />
      </div>
    );
  }

  if (previewMode) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">About Us Page Preview</h1>
            <p className="text-slate-600 mt-1">Preview how the page will look to customers</p>
          </div>
          <Button onClick={() => setPreviewMode(false)} variant="outline">
            <Eye className="size-4 mr-2" />
            Exit Preview
          </Button>
        </div>

        {/* Preview Content */}
        <div className="bg-slate-50 p-8 rounded-lg">
          <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
            <div
              className="prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">About Us Page Editor</h1>
          <p className="text-slate-600 mt-1">Edit the content of your About Us page</p>
          {lastUpdated && (
            <p className="text-sm text-slate-500 mt-1">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDefaultContent} variant="outline">
            Load Default
          </Button>
          <Button onClick={() => setPreviewMode(true)} variant="outline">
            <Eye className="size-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircle2 className="size-4" />
          <AlertDescription>About Us page updated successfully!</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Page Content</CardTitle>
          <CardDescription>
            Edit the HTML content for your About Us page. Use the rich text editor to format your content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReactQuill
            theme="snow"
            value={content}
            onChange={setContent}
            modules={modules}
            formats={formats}
            style={{ height: '500px', marginBottom: '50px' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
