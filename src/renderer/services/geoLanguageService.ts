/**
 * GeoLanguage Service - v1.0.1
 * Detects user's country from IP and maps to appropriate language
 * Uses caching to avoid repeated API calls
 */

import { Language } from '../contexts/LanguageContext';

interface GeoCache {
  countryCode: string;
  language: Language;
  timestamp: number;
  ip: string;
}

// Cache duration: 7 days (in milliseconds)
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
const CACHE_KEY = 'geo-language-cache';

// Map country codes to supported languages
const countryToLanguage: Record<string, Language> = {
  // English
  US: 'en', GB: 'en', AU: 'en', NZ: 'en', CA: 'en', IE: 'en', ZA: 'en', SG: 'en',
  
  // Vietnamese
  VN: 'vi',
  
  // Indonesian
  ID: 'id',
  
  // Chinese
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh',
  
  // Korean
  KR: 'ko',
  
  // Japanese
  JP: 'ja',
  
  // French
  FR: 'fr', BE: 'fr', CH: 'fr', LU: 'fr', MC: 'fr',
  
  // German
  DE: 'de', AT: 'de', LI: 'de',
  
  // Spanish
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
  EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es',
  SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es',
  
  // Thai
  TH: 'th',
  
  // Malay
  MY: 'ms', BN: 'ms',
  
  // Russian
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru', TJ: 'ru',
  
  // Filipino
  PH: 'fil',
  
  // Portuguese
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt',
};

/**
 * Get cached geo language data
 */
function getCache(): GeoCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: GeoCache = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - data.timestamp < CACHE_DURATION) {
      return data;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

/**
 * Save geo language data to cache
 */
function setCache(data: GeoCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Fetch country code from IP using free API
 * Uses multiple fallback APIs for reliability
 */
async function fetchCountryFromIP(): Promise<{ countryCode: string; ip: string } | null> {
  // List of free IP geolocation APIs (fallback chain)
  const apis = [
    {
      url: 'https://ipapi.co/json/',
      parseCountry: (data: any) => data.country_code,
      parseIP: (data: any) => data.ip,
    },
    {
      url: 'https://ip-api.com/json/?fields=countryCode,query',
      parseCountry: (data: any) => data.countryCode,
      parseIP: (data: any) => data.query,
    },
    {
      url: 'https://ipwho.is/',
      parseCountry: (data: any) => data.country_code,
      parseIP: (data: any) => data.ip,
    },
  ];

  for (const api of apis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(api.url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const countryCode = api.parseCountry(data);
      const ip = api.parseIP(data);
      
      if (countryCode && ip) {
        return { countryCode: countryCode.toUpperCase(), ip };
      }
    } catch {
      // Try next API
      continue;
    }
  }
  
  return null;
}

/**
 * Detect language based on user's IP location
 * Returns cached result if available, otherwise fetches from API
 */
export async function detectLanguageFromIP(): Promise<Language | null> {
  // Check cache first
  const cached = getCache();
  if (cached) {
    console.log(`[GeoLanguage] Using cached language: ${cached.language} (country: ${cached.countryCode})`);
    return cached.language;
  }

  // Fetch from API
  console.log('[GeoLanguage] Fetching country from IP...');
  const geoData = await fetchCountryFromIP();
  
  if (!geoData) {
    console.log('[GeoLanguage] Could not detect country from IP');
    return null;
  }

  // Map country to language
  const language = countryToLanguage[geoData.countryCode] || 'en';
  
  // Cache the result
  const cacheData: GeoCache = {
    countryCode: geoData.countryCode,
    language,
    timestamp: Date.now(),
    ip: geoData.ip,
  };
  setCache(cacheData);
  
  console.log(`[GeoLanguage] Detected: country=${geoData.countryCode}, language=${language}`);
  return language;
}

/**
 * Clear geo language cache
 */
export function clearGeoCache(): void {
  localStorage.removeItem(CACHE_KEY);
  console.log('[GeoLanguage] Cache cleared');
}

/**
 * Get current cache info (for debugging)
 */
export function getGeoCacheInfo(): GeoCache | null {
  return getCache();
}
