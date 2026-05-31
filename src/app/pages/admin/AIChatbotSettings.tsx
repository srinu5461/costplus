// AI Chatbot Settings - Admin configuration for the AI assistant
import { useState, useEffect } from 'react';
import { Save, Bot, MessageCircle, AlertCircle, CheckCircle, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function AIChatbotSettings() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  
  const [config, setConfig] = useState({
    enabled: false, // Disabled by default
    welcomeMessage: 'Hello! 👋 I\'m your Costplus100 AI assistant. I can help you with:\n\n• Finding products\n• Checking stock availability\n• Order tracking\n• Shipping information\n• Product recommendations\n• Pricing inquiries\n\nHow can I help you today?',
    quickActions: [
      'Show me popular products',
      'Track my order',
      'What are your shipping options?',
      'Tell me about your return policy',
    ],
    fallbackToHuman: true,
    offlineMessage: 'Our AI assistant is currently offline. Please call us at (08) 6165 8444.',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/ai/config`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
        }
        setApiKeyConfigured(data.apiKeyConfigured);
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API_URL}/ai/config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage('AI chatbot settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save settings');
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#2D3748] mb-2 flex items-center gap-3">
          <Bot className="size-8" />
          AI Chatbot Settings
        </h1>
        <p className="text-gray-600">Configure your intelligent customer support assistant</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.includes('success') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.includes('success') ? (
            <CheckCircle className="size-5" />
          ) : (
            <AlertCircle className="size-5" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* API Key Status */}
      <div className={`mb-6 p-4 rounded-lg border ${
        apiKeyConfigured 
          ? 'bg-green-50 border-green-200' 
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          {apiKeyConfigured ? (
            <>
              <CheckCircle className="size-5 text-green-600" />
              <h3 className="font-semibold text-green-900">OpenAI API Key Configured</h3>
            </>
          ) : (
            <>
              <AlertCircle className="size-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900">OpenAI API Key Required</h3>
            </>
          )}
        </div>
        <p className={`text-sm ${apiKeyConfigured ? 'text-green-800' : 'text-amber-800'}`}>
          {apiKeyConfigured 
            ? 'Your AI chatbot is ready to assist customers!' 
            : 'Please add your OpenAI API key to enable the AI chatbot. The key should be set as the OPENAI_API_KEY environment variable in Supabase Edge Functions.'}
        </p>
        {!apiKeyConfigured && (
          <div className="mt-3 text-xs text-amber-700 bg-white p-3 rounded border border-amber-300">
            <strong>How to get an OpenAI API key:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">platform.openai.com/api-keys</a></li>
              <li>Sign up or log in to your OpenAI account</li>
              <li>Click "Create new secret key"</li>
              <li>Copy the key (starts with "sk-")</li>
              <li>In Supabase, go to Project Settings → Edge Functions → Secrets</li>
              <li>Add a new secret: Name = "OPENAI_API_KEY", Value = your key</li>
            </ol>
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
              <strong className="text-red-900">⚠️ Important:</strong>
              <p className="text-red-800 mt-1">The API key MUST start with "sk-" (e.g., sk-proj-abc123...)</p>
              <p className="text-red-800">Do NOT enter your email address, password, or any other credentials.</p>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <MessageCircle className="size-4" />
            Welcome Message
          </Label>
          <Textarea
            value={config.welcomeMessage}
            onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
            rows={8}
            placeholder="Enter the initial message users see when opening the chat..."
          />
          <p className="text-xs text-gray-500 mt-1">This message appears when users first open the chatbot</p>
        </div>

        <div>
          <Label>Quick Action Buttons</Label>
          <div className="space-y-2 mt-2">
            {config.quickActions.map((action, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={action}
                  onChange={(e) => {
                    const newActions = [...config.quickActions];
                    newActions[index] = e.target.value;
                    setConfig({ ...config, quickActions: newActions });
                  }}
                  placeholder={`Quick action ${index + 1}`}
                />
                <Button
                  onClick={() => {
                    const newActions = config.quickActions.filter((_, i) => i !== index);
                    setConfig({ ...config, quickActions: newActions });
                  }}
                  variant="outline"
                  size="sm"
                  className="text-red-600"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              onClick={() => {
                setConfig({
                  ...config,
                  quickActions: [...config.quickActions, '']
                });
              }}
              variant="outline"
              size="sm"
            >
              + Add Quick Action
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Pre-written questions users can click to send instantly</p>
        </div>

        <div>
          <Label>Offline Message</Label>
          <Input
            value={config.offlineMessage}
            onChange={(e) => setConfig({ ...config, offlineMessage: e.target.value })}
            placeholder="Message shown when chatbot is offline..."
          />
          <p className="text-xs text-gray-500 mt-1">Displayed if the AI service is unavailable</p>
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="enabled"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="size-4"
          />
          <Label htmlFor="enabled" className="cursor-pointer">
            Enable AI Chatbot on website
          </Label>
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="fallback"
            checked={config.fallbackToHuman}
            onChange={(e) => setConfig({ ...config, fallbackToHuman: e.target.checked })}
            className="size-4"
          />
          <Label htmlFor="fallback" className="cursor-pointer">
            Offer human support fallback if AI can't help
          </Label>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={saveConfig}
            disabled={saving}
            className="bg-[#E31837] hover:bg-[#E31837]/90"
          >
            <Save className="size-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <SettingsIcon className="size-5" />
          How the AI Chatbot Works
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>Intelligent Responses:</strong> Uses GPT-4 to understand customer questions and provide helpful answers</p>
          <p><strong>Product Knowledge:</strong> Has access to your full product catalog and can make recommendations</p>
          <p><strong>Business Context:</strong> Knows your shipping policies, return policy, contact information, and more</p>
          <p><strong>Always Learning:</strong> Conversations help improve the AI's understanding of your business</p>
          <p><strong>Cost:</strong> Uses OpenAI's API - typically $0.001-0.003 per conversation</p>
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">✅ Benefits</h4>
          <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
            <li>24/7 instant customer support</li>
            <li>Reduce phone calls by 40-60%</li>
            <li>Answer common questions automatically</li>
            <li>Improve customer satisfaction</li>
            <li>Free up staff for complex issues</li>
          </ul>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-2">🎯 Best For</h4>
          <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
            <li>Product recommendations</li>
            <li>Order status inquiries</li>
            <li>Shipping information</li>
            <li>Return policy questions</li>
            <li>General business info</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AIChatbotSettings;