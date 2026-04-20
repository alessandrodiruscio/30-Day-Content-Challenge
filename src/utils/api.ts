/**
 * A robust fetch wrapper with retry logic, timeout handling, and better error reporting
 */
export async function robustFetch(url: string, options: RequestInit = {}, retries = 2, backoff = 1000, timeout = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout); // custom timeout
  
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    // Detect environment bootloader/proxy "Starting Server" page
    // These often return 200 OK with HTML even for API endpoints during startup
    if (url.includes('/api/')) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        if (retries > 0) {
          console.warn(`[API] Received HTML instead of JSON for ${url}. This usually means the server is booting. Retrying in ${backoff}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          return robustFetch(url, options, retries - 1, backoff * 2, timeout);
        }
      }
    }
    
    // Retry on 5xx errors (server issues)
    if (!res.ok && res.status >= 500 && retries > 0) {
      console.warn(`Retrying ${url} due to server error ${res.status}...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return robustFetch(url, options, retries - 1, backoff * 2, timeout);
    }
    
    return res;
  } catch (err: any) {
    clearTimeout(timeoutId);
    
    // Handle specific mobile/Safari errors
    let errorMessage = err.message || String(err) || 'Unknown network error';
    const lowerMessage = errorMessage.toLowerCase();
    
    if (err.name === 'AbortError') errorMessage = 'Request timed out. Please try again.';
    if (err.name === 'TypeError' && lowerMessage === 'load failed') errorMessage = 'Network connection lost or blocked.';
    if (lowerMessage.includes('string did not match the expected pattern') || lowerMessage.includes('match the expected pattern')) {
      errorMessage = 'Connection interrupted. Please check your internet and try again.';
    }

    if (retries > 0 && (err.name === 'AbortError' || err.name === 'TypeError' || !window.navigator.onLine)) {
      console.warn(`Retrying ${url} due to network error/timeout:`, errorMessage);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return robustFetch(url, options, retries - 1, backoff * 2, timeout);
    }
    
    // Create a new error with the better message but keep the original name if possible
    const enhancedError = new Error(errorMessage);
    enhancedError.name = err.name || 'FetchError';
    throw enhancedError;
  }
}

/**
 * Safely parse JSON from a response, providing better error messages if it fails
 */
export async function safeJson(res: Response) {
  const contentType = res.headers.get("content-type");
  const text = await res.text();
  
  if (!contentType || !contentType.includes("application/json")) {
    console.error(`Expected JSON but got ${contentType || 'text/plain'}:`, text.slice(0, 200));
    throw new Error(`Server returned an unexpected response format (${res.status}).`);
  }
  
  try {
    return JSON.parse(text);
  } catch (err: any) {
    console.error("Failed to parse JSON:", text.slice(0, 200));
    throw new Error("The server response was corrupted. Please try again.");
  }
}

/**
 * Fetch achievements for a specific strategy
 */
export async function fetchAchievements(token: string, strategyId?: number) {
  const url = strategyId ? `/api/achievements?strategyId=${strategyId}` : '/api/achievements';
  const res = await robustFetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const errorData = await safeJson(res).catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch achievements');
  }
  
  return await safeJson(res);
}
