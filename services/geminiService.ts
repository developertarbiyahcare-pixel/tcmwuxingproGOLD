import { Language, ScoredSyndrome, ApiKeyEntry } from '../types';

function robustJsonParse(text: string): any {
  let cleanText = text.trim();
  
  // Strip starting ```json or ``` if present
  if (cleanText.startsWith("```")) {
    const lines = cleanText.split("\n");
    if (lines[0].startsWith("```")) {
      lines.shift();
    }
    cleanText = lines.join("\n").trim();
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.substring(0, cleanText.length - 3).trim();
    }
  }

  try {
    return JSON.parse(cleanText);
  } catch (error) {
    console.warn("Direct JSON parse failed, attempting recovery...", error);
    
    let inString = false;
    let escape = false;
    let repairedChars = '';

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      repairedChars += char;
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
      }
    }

    if (inString) {
      if (repairedChars.endsWith('\\')) {
        repairedChars = repairedChars.slice(0, -1);
      }
      repairedChars += '"';
    }

    let openBrackets: ('{' | '[')[] = [];
    let inStringCheck = false;
    let escapeCheck = false;
    for (let i = 0; i < repairedChars.length; i++) {
      const char = repairedChars[i];
      if (escapeCheck) {
        escapeCheck = false;
        continue;
      }
      if (char === '\\') {
        escapeCheck = true;
        continue;
      }
      if (char === '"') {
        inStringCheck = !inStringCheck;
        continue;
      }
      if (!inStringCheck) {
        if (char === '{') {
          openBrackets.push('{');
        } else if (char === '[') {
          openBrackets.push('[');
        } else if (char === '}') {
          if (openBrackets[openBrackets.length - 1] === '{') {
            openBrackets.pop();
          }
        } else if (char === ']') {
          if (openBrackets[openBrackets.length - 1] === '[') {
            openBrackets.pop();
          }
        }
      }
    }

    while (openBrackets.length > 0) {
      const top = openBrackets.pop();
      if (top === '{') {
        repairedChars += '}';
      } else if (top === '[') {
        repairedChars += ']';
      }
    }

    try {
      return JSON.parse(repairedChars);
    } catch (secondError: any) {
      console.warn("Second repair pass failed:", secondError);
      
      const conversationMatch = cleanText.match(/"conversationalResponse"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
      let conversationalResponse = "Analysis completed, but response was unparseable. Here is the raw explanation: ";
      if (conversationMatch && conversationMatch[1]) {
        try {
          conversationalResponse = JSON.parse(`"${conversationMatch[1]}"`);
        } catch (e) {
          conversationalResponse += conversationMatch[1].substring(0, 500);
        }
      } else {
        conversationalResponse += cleanText.substring(0, 500) + "...";
      }

      return {
        conversationalResponse,
        diagnosis: {
          patternId: "unparseable_response",
          explanation: cleanText,
          differentiation: { ben: [], biao: [] },
          treatment_principle: ["Symptomatic balancing"],
          classical_prescription: "Please review raw clinical advice format",
          recommendedPoints: [],
          masterTungPoints: [],
          wuxingElement: "None",
          lifestyleAdvice: "Ensure full power connection and settings config."
        }
      };
    }
  }
}

export const sendMessageToGeminiStream = async (
  message: string,
  image: string | undefined,
  history: any[],
  language: Language,
  isPregnant: boolean,
  cdssAnalysis?: ScoredSyndrome[],
  apiKeys?: ApiKeyEntry[],
  onChunk?: (text: string) => void,
  onKeyExhausted?: (key: string) => void
) => {
  try {
    const res = await fetch('/api/gemini/diagnose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        image,
        history,
        language,
        isPregnant,
        cdssAnalysis,
        apiKeys,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error || "Gagal memproses diagnosis dari AI.";
      
      const lowerErr = errMsg.toLowerCase();
      if (onKeyExhausted && apiKeys && apiKeys.length > 0) {
        if (lowerErr.includes("429") || lowerErr.includes("quota") || lowerErr.includes("limit") || lowerErr.includes("403")) {
          const activeKey = apiKeys.find((k) => !k.isExhausted && k.key && k.key.trim() !== "");
          if (activeKey) {
            onKeyExhausted(activeKey.key);
          }
        }
      }
      throw new Error(errMsg);
    }

    const data = await res.json();
    const cleanText = data.text;

    if (onChunk) onChunk(cleanText);

    const parsed = robustJsonParse(cleanText);
    return { data: parsed };
  } catch (error: any) {
    console.error("Gemini Proxy Error:", error);
    throw error;
  }
};
