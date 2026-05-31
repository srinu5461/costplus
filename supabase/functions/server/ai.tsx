// AI Chatbot Backend - Intelligent customer support using OpenAI
import { Hono } from 'npm:hono';

const ai = new Hono();

// Chat endpoint - Main AI conversation handler
ai.post('/chat', async (c) => {
  console.log('=== AI CHAT REQUEST ===');
  try {
    const { message, conversationHistory } = await c.req.json();
    console.log('User message:', message);

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured');
      return c.json({
        response: 'I apologize, but the AI assistant is not configured yet. Please contact our support team at (08) 6165 8444 or email admin@costplus100.com.au for assistance.',
      });
    }

    // Validate API key format
    if (!openaiApiKey.startsWith('sk-')) {
      console.error('❌ INVALID OpenAI API KEY FORMAT!');
      console.error(`   Key does not start with "sk-": ${openaiApiKey.substring(0, 20)}...`);
      console.error('   An OpenAI API key should look like: sk-proj-abc123xyz...'); 
      console.error('   Get your key at: https://platform.openai.com/api-keys');
      return c.json({
        response: 'I apologize, but the AI assistant is not properly configured. The API key format is invalid. Please visit the Admin Panel → AI Chatbot Settings to configure a valid OpenAI API key.',
      });
    }
    
    console.log('✅ OpenAI API key validated (starts with "sk-")');

    // Get product catalog and business info for context
    const { getByPrefix, get } = await import('./kv_custom.tsx');
    const products = await getByPrefix('product:');
    const categories = await getByPrefix('category:');
    const companyInfo = await get('company_info') || {
      name: 'Costplus100',
      phone: '(08) 6165 8444',
      email: 'admin@costplus100.com.au',
    };

    // Build system context
    const systemContext = `You are a helpful AI assistant for Costplus100, Australia's leading supplier of professional catering equipment and commercial kitchen solutions.

BUSINESS INFORMATION:
- Company: Costplus100 Pty Ltd
- Phone: ${companyInfo.phone}
- Email: ${companyInfo.email}
- Business: Commercial catering equipment, kitchen supplies, hospitality equipment
- We have ${products.length} products across ${categories.length} categories

PRODUCT CATALOG (Top 20 products):
${products.slice(0, 20).map((p: any) => `- ${p.name} (${p.code}): $${p.price.toFixed(2)} - ${p.category || 'Catering Equipment'}`).join('\n')}

CATEGORIES:
${categories.slice(0, 20).map((c: any) => `- ${c.name}`).join('\n')}

YOUR CAPABILITIES:
1. Answer product questions and provide recommendations
2. Help customers find the right equipment for their needs
3. Provide pricing information
4. Explain shipping and delivery options
5. Answer questions about returns and warranties
6. Help with order tracking
7. Provide general business information

SHIPPING INFO:
- We ship Australia-wide
- Delivery: 3-5 business days for most items
- Shipping costs calculated based on location and weight
- Free shipping on orders over $500 (conditions apply)

RETURN POLICY:
- 30-day return policy on most items
- Items must be in original packaging and unused
- Some restrictions apply to custom or special-order items

PAYMENT OPTIONS:
- Credit/Debit cards via eWay secure gateway
- Bank transfer (details provided after order)
- GST included in all prices

TONE & STYLE:
- Be friendly, professional, and helpful
- Use Australian English spelling
- Keep responses concise but informative
- If you don't know something specific, offer to connect them with our team
- Always prioritize customer satisfaction

IMPORTANT:
- If asked about specific order tracking, ask for their order number
- For complex technical questions, offer to connect them with a specialist
- For urgent matters, provide phone number: ${companyInfo.phone}
- Always mention we're here to help and value their business`;

    // Build conversation messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: systemContext,
      },
      ...conversationHistory.slice(-8).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    // Call OpenAI API
    console.log('Calling OpenAI API...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cost-effective
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error('OpenAI API request failed');
    }

    const aiData = await openaiResponse.json();
    const aiResponse = aiData.choices[0].message.content;

    console.log('AI Response:', aiResponse);

    // Log conversation for analytics
    const chatLog = {
      timestamp: new Date().toISOString(),
      userMessage: message,
      aiResponse: aiResponse,
    };
    console.log('Chat log:', chatLog);

    return c.json({ response: aiResponse });

  } catch (error: any) {
    console.error('AI chat error:', error);
    return c.json({
      response: 'I apologize, but I encountered an error processing your request. Please contact our support team at (08) 6165 8444 for immediate assistance.',
    });
  }
});

// Get chatbot configuration
ai.get('/config', async (c) => {
  console.log('=== GET AI CONFIG ===');
  try {
    const { get } = await import('./kv_custom.tsx');
    const config = await get('ai_chatbot_config') || {
      enabled: false, // Disabled by default until user enables it
      welcomeMessage: 'Hello! 👋 I\'m your Costplus100 AI assistant. How can I help you today?',
      quickActions: [
        'Show me popular products',
        'Track my order',
        'What are your shipping options?',
        'Tell me about your return policy',
      ],
      fallbackToHuman: true,
      offlineMessage: 'Our AI assistant is currently offline. Please call us at (08) 6165 8444.',
    };

    const apiKeyConfigured = !!Deno.env.get('OPENAI_API_KEY');

    return c.json({ success: true, config, apiKeyConfigured });
  } catch (error) {
    console.error('Get AI config error:', error);
    return c.json({ error: 'Failed to get config' }, 500);
  }
});

// Save chatbot configuration
ai.post('/config', async (c) => {
  console.log('=== SAVE AI CONFIG ===');
  try {
    const config = await c.req.json();
    const { set } = await import('./kv_custom.tsx');
    await set('ai_chatbot_config', config);

    console.log('AI config saved successfully');
    return c.json({ success: true });
  } catch (error) {
    console.error('Save AI config error:', error);
    return c.json({ error: 'Failed to save config' }, 500);
  }
});

// Get chat analytics
ai.get('/analytics', async (c) => {
  console.log('=== GET CHAT ANALYTICS ===');
  try {
    const { getByPrefix } = await import('./kv_custom.tsx');
    const chats = await getByPrefix('chat_log:');

    const analytics = {
      totalChats: chats.length,
      last24Hours: chats.filter((chat: any) => {
        const chatTime = new Date(chat.timestamp);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return chatTime > oneDayAgo;
      }).length,
      topQuestions: [] as string[],
    };

    return c.json({ success: true, analytics });
  } catch (error) {
    console.error('Get analytics error:', error);
    return c.json({ error: 'Failed to get analytics' }, 500);
  }
});

export default ai;