import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Initialize the Google Generative AI with the API key
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('Missing GOOGLE_GEMINI_API_KEY environment variable');
  throw new Error('Missing GOOGLE_GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Chat history storage (in memory for simplicity)
// In a production app, this would be stored in a database
const chatHistory: Record<number, { role: string, parts: string }[]> = {};

// System prompt to define the assistant's personality and capabilities
const SYSTEM_PROMPT = `You are a helpful assistant specialized in German property management.
Your name is PropManager Assistant, but you can introduce yourself simply as "your property management assistant".

You help landlords and property owners with:
- Property management questions and advice
- German rental laws and regulations
- Financial tips for property investment 
- Tenant relation management
- Maintenance scheduling advice
- Guidance on tax deductions for rental properties
- Advice on the German "Nebenkostenabrechnung" (utility statement)

Please respond in a friendly, knowledgeable, and concise manner. When relevant, reference modern German rental laws and practices.
For any request that requires personal or sensitive information that you don't have access to, politely explain that you need to 
respect privacy guidelines.

Important: Always respond in the same language that the user uses (German or English). If the user writes in German, respond in German.
If they write in English, respond in English.

If asked about specific technical features of this property management system:
1. Explain that you are part of a comprehensive property management platform
2. Mention that the platform offers tenant management, document processing, automated communications, and financial tracking
3. Do not invent specific technical details about implementation

For tax or legal matters, always include a disclaimer that your information is for guidance only and should not replace professional advice.`;

/**
 * Retrieves chat history for a user
 * @param userId User ID
 * @returns Array of chat messages
 */
function getUserHistory(userId: number): { role: string, parts: string }[] {
  if (!chatHistory[userId]) {
    // Initialize with system prompt
    chatHistory[userId] = [
      { role: 'model', parts: SYSTEM_PROMPT }
    ];
  }
  return chatHistory[userId];
}

/**
 * Adds a message to a user's chat history
 * @param userId User ID
 * @param role 'user' or 'model'
 * @param content Message content
 */
function addMessageToHistory(userId: number, role: string, content: string): void {
  if (!chatHistory[userId]) {
    getUserHistory(userId);
  }
  chatHistory[userId].push({ role, parts: content });
  
  // Keep history size manageable (limit to last 20 messages)
  const maxHistoryLength = 20;
  if (chatHistory[userId].length > maxHistoryLength) {
    // Always keep the system prompt
    const systemPrompt = chatHistory[userId][0];
    chatHistory[userId] = [
      systemPrompt,
      ...chatHistory[userId].slice(-(maxHistoryLength - 1))
    ];
  }
}

/**
 * Gets a response from the chatbot
 * @param userId User ID for maintaining conversation context
 * @param message User message
 * @param propertyData Optional property data to enhance the response
 * @returns Promise with assistant's response
 */
export async function getChatbotResponse(
  userId: number, 
  message: string,
  propertyData?: any
): Promise<string> {
  try {
    // Get user history
    const history = getUserHistory(userId);
    
    // Add the user message to history
    addMessageToHistory(userId, 'user', message);
    
    // Create contextual information if property data is provided
    let contextPrompt = '';
    if (propertyData) {
      contextPrompt = `\nI have the following information about your properties:\n${JSON.stringify(propertyData, null, 2)}\n`;
      // Add as a system message but don't store in history
      history.push({ role: 'model', parts: contextPrompt });
    }
    
    // Convert history format for Gemini API
    const geminiHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.parts }]
    }));
    
    // Initialize chat session
    const chat = model.startChat({
      history: geminiHistory,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1000,
      },
    });
    
    // Generate response
    const result = await chat.sendMessage(message);
    const response = result.response;
    const responseText = response.text();
    
    // Add the model's response to history
    addMessageToHistory(userId, 'model', responseText);
    
    return responseText;
  } catch (error) {
    console.error('Error generating chatbot response:', error);
    // Return a friendly error message
    return 'I apologize, but I encountered an issue while processing your request. Please try again later.';
  }
}

/**
 * Clears the chat history for a user
 * @param userId User ID
 */
export function clearChatHistory(userId: number): void {
  // Initialize with system prompt instead of setting to undefined
  chatHistory[userId] = [
    { role: 'model', parts: SYSTEM_PROMPT }
  ];
}