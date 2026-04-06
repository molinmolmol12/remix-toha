/**
 * API Utilities
 */

export const fetchWithRetry = async (url: string, options?: RequestInit, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errorMessage = errData.error?.message || errData.message || `HTTP Error ${res.status}`;
        
        if (res.status === 401 || res.status === 403) {
          throw new Error(`API Key Salah/Tidak Valid (Error ${res.status}): ${errorMessage}`);
        }
        throw new Error(errorMessage);
      }
      return await res.json();
    } catch (err: any) {
      if (err.message && err.message.includes('API Key Salah/Tidak Valid')) throw err;
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delays[i]));
    }
  }
};
