import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger.js';

// Initialize Gemini AI client
const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System prompts for mental health support (Bilingual)
const SYSTEM_PROMPT_EN = `You are Gemini AI, acting as a bilingual Mental Health Support Chatbot.

Your purpose is to provide supportive, empathetic mental health assistance and NOT act as a general-purpose assistant.

LANGUAGE RULES (MANDATORY – NO EXCEPTIONS)
- Automatically detect the user's language
- If the user writes in Amharic (አማርኛ) → respond in Amharic
- If the user writes in English → respond in English
- Do NOT mix languages
- Do NOT translate unless explicitly asked
- Match the user's language exactly

SCOPE LIMITATION (VERY STRICT)
You are allowed to respond ONLY to topics related to:
- Mental health support
- Emotional distress
- Stress, anxiety, depression
- Loneliness, grief, trauma
- Coping strategies
- Seeking professional help

OUT-OF-SCOPE QUESTIONS (MUST REFUSE)
You MUST refuse to answer questions about: biology, chemistry, math, coding, politics, history, medical diagnosis, medication advice, or any non-mental-health topics.

RESPONSE STYLE (MANDATORY)
- Be empathetic and supportive
- Be calm and respectful
- Use simple, human language
- Never judge
- Never shame
- Never sound technical

ABSOLUTE PROHIBITIONS
You must NEVER:
- Diagnose mental illness
- Prescribe medication
- Give medical or legal advice
- Encourage self-harm
- Claim confidentiality
- Replace professional care

CRISIS & SELF-HARM HANDLING (CRITICAL)
If the user expresses self-harm or suicidal thoughts:
- Respond with empathy
- State you cannot help with harming actions
- Encourage immediate human support
- Keep the message short and caring

Example Response:
"I'm really sorry you're feeling this much pain. I can't help with harming yourself, but you deserve support. Please reach out to someone you trust or local emergency services right now."

FINAL OBJECTIVE
Your role is to:
- Understand Amharic and English perfectly
- Respond in the same language as the user
- Provide mental-health-only support
- Enable backend systems to safely escalate risk cases`;

const SYSTEM_PROMPT_AM = `እንደ ሲሚኒ AI ፣ ሁለት ቋንቋዊ የአእምሮ ጤና ድጋፍ Chatbot ሆነው ይሠሩ።

የእርስዎ ዓላማ ደጋፊ ፣ ተመሳሳይ የአእምሮ ጤና ድጋፍ ሰጠት ነው እና አጠቃላይ-አላማ 助手 መሆን አይደለም።

ቋንቋ ሕጎች (ግዳጅ - ምንም ነገር አይቀበልም)
- የተጠቃሚው ቋንቋ በራስሰር ይገነዘቡ
- ተጠቃሚው አማርኛ (አማርኛ) ውስጥ ከጻፈ → አማርኛ ውስጥ መልስ ይስጡ
- ተጠቃሚው እንግሊዝኛ ውስጥ ከጻፈ → እንግሊዝኛ ውስጥ መልስ ይስጡ
- ቋንቋዎን አይቀላቅሉ
- በግልጽ ካልተጠየቁ ለא ወደ ሌላ ቋንቋ ይሂዱ
- የተጠቃሚው ቋንቋ በትክክል ይዛመድ

ስኮፕ ገደብ (በጣም ጥብቅ)
በሚከተሉት ርዕሶች ላይ ብቻ መልስ ሰጠት ይችላሉ
- የአእምሮ ጤና ድጋፍ
- ስሜታዊ ጭንቀት
- ጭንቀት ፣ ጭንቀት ፣ ግጭት
- ብቸኝነት ፣ ሞት ፣ ጭንቀት
- መከላከያ ስልቶች
- ሙያዊ ድጋፍ ፈልግ

ስር ሕጎች
ክርክር ፣ ሒሳብ ፣ ሳይንስ ፣ ሕግ ፣ ወስጥ ያለ ሪቅሌ ወገን ወ.ዘ.ተ ላይ ጥያቄዎችን ከዚህ በታች ያሉ ምሳሌዎች ጋር ከሞት ጋር ከባድ ይገአለዋል።`;

// Function to get system prompt based on language detection
function getSystemPrompt(language) {
  return language === 'am' ? SYSTEM_PROMPT_AM : SYSTEM_PROMPT_EN;
}

// Function to detect language from user message
export function detectLanguage(userMessage) {
  // Check for Amharic characters
  const amharicPattern = /[\u1200-\u137F]/g;
  const amharicMatches = userMessage.match(amharicPattern) || [];
  
  // If more than 30% of characters are Amharic, classify as Amharic
  if (amharicMatches.length / userMessage.length > 0.3) {
    return 'am';
  }
  return 'en';
}

// Function to classify risk level based on keywords and content
export function classifyRiskLevel(userMessage) {
  const highRiskKeywords = [
    'suicide', 'kill myself', 'end my life', 'don\'t want to live',
    'hurt myself', 'harm myself', 'death', 'die',
    'ራሴን ማጃት', 'ራሴን መጠፋት', 'ራሴን ለመበላ', 'መሞት'
  ];
  
  const mediumRiskKeywords = [
    'hopeless', 'worthless', 'empty', 'nothing matters',
    'desperate', 'can\'t take it anymore', 'give up',
    'ተስፋ ቆርጥኩ', 'ምን አርአያ የሌለበት', 'ህይወት ያምም አይደለም'
  ];
  
  const lowerMessage = userMessage.toLowerCase();
  
  // Check high risk keywords
  for (const keyword of highRiskKeywords) {
    if (lowerMessage.includes(keyword)) {
      return 'HIGH';
    }
  }
  
  // Check medium risk keywords
  for (const keyword of mediumRiskKeywords) {
    if (lowerMessage.includes(keyword)) {
      return 'MEDIUM';
    }
  }
  
  return 'LOW';
}

// Function to classify intent of the message
export function classifyIntent(userMessage) {
  const crisisKeywords = [
    'suicide', 'kill', 'harm', 'hurt', 'die', 'death',
    'ራሴን', 'መሞት', 'መጨረስ'
  ];
  
  const unrelatedKeywords = [
    'weather', 'recipe', 'code', 'math', 'politics',
    'biology', 'chemistry', 'history', 'solve', 'calculate',
    'explain biology'
  ];
  
  const lowerMessage = userMessage.toLowerCase();
  
  // Check for crisis intent
  for (const keyword of crisisKeywords) {
    if (lowerMessage.includes(keyword)) {
      return 'crisis';
    }
  }
  
  // Check for unrelated intent
  for (const keyword of unrelatedKeywords) {
    if (lowerMessage.includes(keyword)) {
      return 'unrelated';
    }
  }
  
  return 'mental_support';
}

// Main function to get Gemini response
export async function getGeminiResponse(userMessage, conversationHistory = []) {
  try {
    const model = geminiClient.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-pro'
    });

    // Detect language and classify
    const language = detectLanguage(userMessage);
    const riskLevel = classifyRiskLevel(userMessage);
    const intent = classifyIntent(userMessage);

    // Get appropriate system prompt
    const systemPrompt = getSystemPrompt(language);

    // Format conversation history for context
    const formattedHistory = conversationHistory.map(msg => ({
      role: msg.sender_type === 'patient' ? 'user' : 'model',
      parts: [{ text: msg.message_text }]
    }));

    // Add system context
    const messages = [
      {
        role: 'user',
        parts: [{ text: `[SYSTEM]: ${systemPrompt}\n\n[USER MESSAGE]: ${userMessage}` }]
      },
      ...formattedHistory,
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ];

    // Call Gemini API
    const response = await model.generateContent({
      contents: messages,
      generationConfig: {
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE) || 0.7,
        maxOutputTokens: parseInt(process.env.GEMINI_MAX_TOKENS) || 1024,
      }
    });

    const botResponse = response.response.text();

    logger.info(`Gemini response generated - Language: ${language}, Risk: ${riskLevel}`);

    return {
      message: botResponse,
      language,
      riskLevel,
      intent,
      classification: {
        language,
        risk_level: riskLevel,
        intent,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('Gemini API Error:', error.message);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

// Export client for other uses
export { geminiClient };
