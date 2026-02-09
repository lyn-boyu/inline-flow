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

  if (skill.llm.provider === 'openai') {
    return await callOpenAI(apiKey, skill.llm.model, systemPrompt, userPrompt, skill.llm.temperature);
  } else if (skill.llm.provider === 'anthropic') {
    return await callAnthropic(apiKey, skill.llm.model, systemPrompt, userPrompt, skill.llm.temperature);
  } else {
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

  const data = await response.json();
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

  const data = await response.json();
  return data.content[0].text;
}
