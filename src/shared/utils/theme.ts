/**
 * Shared utility to resolve theme design tokens from globals.css.
 * Supports both Node.js (filesystem parsing) and Browser (CSSOM queries).
 */

let cachedTokens: Record<string, string> | null = null;

export function getThemeTokens(): Record<string, string> {
  const defaultTokens = {
    primary: '#8A0485',
    foreground: '#18181b',
    border: '#e4e4e7',
    muted: '#f4f4f5',
    'muted-foreground': '#71717a',
    background: '#ffffff',
  };

  const isNode = typeof process !== 'undefined' && process.versions && !!process.versions.node;

  if (!isNode) {
    // In the browser, query the DOM computed styles of root element
    if (typeof document !== 'undefined') {
      try {
        const rootStyle = getComputedStyle(document.documentElement);
        const primary = rootStyle.getPropertyValue('--primary').trim();
        const foreground = rootStyle.getPropertyValue('--foreground').trim();
        const border = rootStyle.getPropertyValue('--border').trim();
        const muted = rootStyle.getPropertyValue('--muted').trim();
        const mutedForeground = rootStyle.getPropertyValue('--muted-foreground').trim();
        const background = rootStyle.getPropertyValue('--background').trim();

        return {
          primary: primary || defaultTokens.primary,
          foreground: foreground || defaultTokens.foreground,
          border: border || defaultTokens.border,
          muted: muted || defaultTokens.muted,
          'muted-foreground': mutedForeground || defaultTokens['muted-foreground'],
          background: background || defaultTokens.background,
        };
      } catch (e) {
        return defaultTokens;
      }
    }
    return defaultTokens;
  }

  // Server-side (Node.js) caching and parsing
  if (cachedTokens) return cachedTokens;

  try {
    // Dynamically load Node modules on server to bypass Webpack client bundle issues
    const fs = require('fs');
    const path = require('path');

    const cssPath = path.join(process.cwd(), 'src', 'app', 'globals.css');
    if (!fs.existsSync(cssPath)) {
      return defaultTokens;
    }

    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/);
    if (!rootMatch) return defaultTokens;

    const tokens: Record<string, string> = { ...defaultTokens };
    const declarations = rootMatch[1].split(';');

    for (const decl of declarations) {
      const parts = decl.split(':');
      if (parts.length === 2) {
        const key = parts[0].trim();
        const value = parts[1].trim();
        if (key.startsWith('--')) {
          tokens[key.slice(2)] = value;
        }
      }
    }

    cachedTokens = tokens;
    return tokens;
  } catch (e) {
    console.error('[getThemeTokens] Failed to parse globals.css on server:', e);
    return defaultTokens;
  }
}
