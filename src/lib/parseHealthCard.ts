const MODEL = 'gemini-2.0-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT = `This is an Ontario OHIP health card. Extract the following fields and return ONLY a JSON object with no other text:
{
  "firstName": "",
  "lastName": "",
  "dateOfBirth": "YYYY-MM-DD",
  "healthCardNumber": ""
}
If you cannot clearly read a field, return null for that field. If this is not a health card, return null.`;

export interface HealthCardData {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  healthCardNumber: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function parseHealthCard(
  base64Image: string,
): Promise<HealthCardData | null> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('EXPO_PUBLIC_GEMINI_API_KEY not set');
    return null;
  }

  let res: Response;
  try {
    res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 512,
          responseMimeType: 'application/json',
        },
      }),
    });
  } catch (err) {
    console.error('parseHealthCard fetch failed', err);
    return null;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`parseHealthCard non-ok status=${res.status} body=${body}`);
    return null;
  }

  let json: GeminiResponse;
  try {
    json = await res.json();
  } catch {
    return null;
  }

  const text = json.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (!text) return null;

  const parsed = extractJson(text);
  if (!parsed || typeof parsed !== 'object') return null;

  const obj = parsed as Record<string, unknown>;
  const { firstName, lastName, dateOfBirth, healthCardNumber } = obj;

  if (
    typeof firstName !== 'string' ||
    typeof lastName !== 'string' ||
    typeof dateOfBirth !== 'string' ||
    typeof healthCardNumber !== 'string'
  ) {
    return null;
  }

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    dateOfBirth: dob,
    healthCardNumber: healthCardNumber.trim(),
  };
}
