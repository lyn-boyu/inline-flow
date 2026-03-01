import type { Skill } from '../types';

/**
 * Call LLM API based on skill configuration
 */
export async function callLLM(
  skill: Skill,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env[skill.secrets.apiKeyEnv];

  if (!apiKey) {
    throw new Error(`API key not found: ${skill.secrets.apiKeyEnv}`);
  }

  switch (skill.llm.provider) {
    case 'openai':
      return await callOpenAI(apiKey, skill.llm.model, systemPrompt, userPrompt, skill.llm.temperature);

    case 'anthropic':
      return await callAnthropic(apiKey, skill.llm.model, systemPrompt, userPrompt, skill.llm.temperature);

    case 'google':
      return await callGoogle(apiKey, skill.llm.model, systemPrompt, userPrompt, skill.llm.temperature);

    case 'azure-openai':
      return await callAzureOpenAI(apiKey, skill.llm.model, systemPrompt, userPrompt, skill.llm.temperature);

    case 'cohere':
      return await callCohere(apiKey, skill.llm.model, systemPrompt, userPrompt, skill.llm.temperature);

    case 'openrouter':
      return await callOpenRouter(apiKey, skill.llm.model, systemPrompt, userPrompt, skill.llm.temperature);

    default:
      throw new Error(`Unsupported LLM provider: ${skill.llm.provider}`);
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message.content;
}

/**
 * Call Anthropic API
 */
async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as any;
  return data.content[0].text;
}

/**
 * Call Google Gemini API
 */
async function callGoogle(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<string> {
  // Google Gemini API endpoint
  // Format: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Combine system and user prompts into a single message
  // Gemini doesn't have a separate system prompt field
  const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: combinedPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as any;

  // Extract text from Gemini response
  // Response format: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('Google API returned no candidates');
  }

  const candidate = data.candidates[0];
  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    throw new Error('Google API returned invalid response structure');
  }

  return candidate.content.parts[0].text;
}

/**
 * Call Azure OpenAI API
 * Requires AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in env
 */
async function callAzureOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<string> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

  if (!endpoint) {
    throw new Error('AZURE_OPENAI_ENDPOINT environment variable is required for Azure OpenAI');
  }

  // Azure OpenAI uses deployment name instead of model name
  // Format: https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-02-15-preview
  const url = `${endpoint}/openai/deployments/${model}/chat/completions?api-version=2024-02-15-preview`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message.content;
}

/**
 * Call Cohere API
 */
async function callCohere(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<string> {
  // Cohere uses preamble for system prompt
  const response = await fetch('https://api.cohere.ai/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      message: userPrompt,
      preamble: systemPrompt,
      temperature,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cohere API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as any;
  return data.text;
}

/**
 * Call OpenRouter API
 * OpenRouter provides unified access to multiple LLM models
 * API is OpenAI-compatible with additional headers
 */
async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/inline-flow/inline-flow', // Required by OpenRouter
      'X-Title': 'Inline Flow', // Optional, for OpenRouter dashboard
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message.content;
}
