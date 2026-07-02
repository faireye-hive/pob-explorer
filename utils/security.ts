import DOMPurify from 'dompurify';

// Domínios de vídeo permitidos em iframes
const ALLOWED_IFRAME_HOSTS = [
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'player.vimeo.com',
  '3speak.tv',
  'odysee.com',
  'rumble.com',
  'peertube.social',
  'video.hive.blog',
  'dlive.tv',
];

/**
 * Sanitizes a URL string to prevent XSS attacks (e.g., javascript: protocols).
 * Returns an empty string if the URL is invalid or dangerous.
 */
export const sanitizeUrl = (url: string | undefined | null): string => {
  if (!url) return '';

  // Basic cleaning
  const trimmed = url.trim();

  // Use DOMPurify to clean the URL
  const clean = DOMPurify.sanitize(trimmed, {
    RETURN_DOM: false,
    RETURN_TRUSTED_TYPE: false,
  });

  // Explicitly check for dangerous protocols that DOMPurify might allow in certain contexts
  if (/^(javascript|vbscript|data):/i.test(clean)) {
    return '';
  }

  return clean;
};

/**
 * Sanitizes HTML content from blockchain posts/comments.
 * Allows iframes ONLY from a whitelist of trusted video hosts.
 * Forces rel="noopener noreferrer" on all external links.
 */
export const sanitizePostHtml = (html: string): string => {
  // Hook: force safe attributes on all links
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // Hook: remove iframes whose src is not in the allowed list
  DOMPurify.addHook('afterSanitizeElements', (node) => {
    if (node.nodeName === 'IFRAME') {
      const src = (node as HTMLIFrameElement).getAttribute('src') || '';
      let allowed = false;
      try {
        const url = new URL(src);
        allowed = ALLOWED_IFRAME_HOSTS.some(
          (host) => url.hostname === host || url.hostname.endsWith('.' + host)
        );
      } catch {
        // If URL parsing fails, block it
        allowed = false;
      }
      if (!allowed) {
        node.parentNode?.removeChild(node);
      }
    }
  });

  const clean = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src'],
    // Block all event handlers from blockchain content
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
      'onfocus', 'onblur', 'onkeydown', 'onkeyup', 'onchange',
      'onsubmit', 'onreset', 'onselect', 'ondblclick', 'oncontextmenu',
    ],
  });

  // Clean up hooks to avoid leaking between renders
  DOMPurify.removeAllHooks();

  return clean;
};

/**
 * Sanitizes plain HTML in simple contexts (short text, descriptions).
 * No iframes allowed. Strict tag allowlist.
 */
export const sanitizeHtml = (html: string): string => {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });

  DOMPurify.removeAllHooks();
  return clean;
};