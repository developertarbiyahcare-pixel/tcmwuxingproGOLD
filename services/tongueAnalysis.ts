import { ApiKeyEntry } from '../types';

export async function analyzeTongueImage(
  base64Image: string, 
  apiKeys?: ApiKeyEntry[],
  onKeyExhausted?: (key: string) => void
): Promise<{ text: string }> {
  try {
    const res = await fetch('/api/gemini/analyze-tongue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Image,
        apiKeys,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error || "Gagal melakukan analisis lidah.";
      
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
    return { text: data.text || "Maaf, tidak dapat menganalisis gambar ini." };
  } catch (error: any) {
    console.error("Tongue Analysis Proxy Error:", error);
    throw error;
  }
}
