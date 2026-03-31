// tools/lib/security.mjs
// Shared security utilities for all Mighty Powers tools
// Provides: path validation, URL sanitization, SSRF protection, safe file reads

import { resolve } from 'path';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^::1$/,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^fc[0-9a-f]{2}:/i,
];

const BLOCKED_HOSTNAMES = new Set([
  'metadata.google.internal',
  'metadata.google.com',
]);

export function validateDirPath(dir) {
  if (!dir) return null;
  return resolve(dir);
}

export function validateUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, reason: `Invalid URL: ${urlString}` };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: `Blocked scheme "${parsed.protocol}" — only http: and https: are allowed` };
  }

  if (BLOCKED_HOSTNAMES.has(parsed.hostname.toLowerCase())) {
    return { valid: false, reason: `Blocked hostname: ${parsed.hostname} (cloud metadata endpoint)` };
  }

  let hostname = parsed.hostname;
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  const ipv6MappedMatch = hostname.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (ipv6MappedMatch) {
    hostname = ipv6MappedMatch[1];
  }

  const ipv6MappedHexMatch = hostname.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (ipv6MappedHexMatch) {
    const hi = parseInt(ipv6MappedHexMatch[1], 16);
    const lo = parseInt(ipv6MappedHexMatch[2], 16);
    hostname = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, reason: `Blocked private/internal IP: ${parsed.hostname}` };
    }
  }

  if (hostname === 'localhost' || hostname === '::1' || parsed.hostname === 'localhost' || parsed.hostname === '[::1]') {
    if (parsed.pathname.startsWith('/latest/meta-data') ||
        parsed.pathname.startsWith('/metadata') ||
        parsed.pathname.startsWith('/computeMetadata')) {
      return { valid: false, reason: `Blocked metadata path on localhost` };
    }
  }

  return { valid: true, url: parsed };
}

export function checkFileSize(filePath, statSync) {
  try {
    const stat = statSync(filePath);
    if (stat.size > MAX_FILE_SIZE) {
      return { ok: false, size: stat.size, reason: `File too large (${Math.round(stat.size / 1024 / 1024)}MB > ${MAX_FILE_SIZE / 1024 / 1024}MB limit)` };
    }
    return { ok: true, size: stat.size };
  } catch {
    return { ok: false, size: -1, reason: 'File not found or not readable' };
  }
}

export function createResponseAccumulator(maxSize = MAX_RESPONSE_SIZE) {
  let body = '';
  let totalSize = 0;
  let truncated = false;

  return {
    onData(chunk) {
      totalSize += chunk.length;
      if (!truncated && totalSize <= maxSize) {
        body += chunk;
      } else {
        truncated = true;
      }
    },
    getBody() { return body; },
    isTruncated() { return truncated; },
    getTotalSize() { return totalSize; },
  };
}

export function redactSensitiveValue(key, value) {
  if (!value || typeof value !== 'string') return value;
  const k = key.toLowerCase();
  const sensitiveKeys = ['password', 'secret', 'token', 'key', 'credential', 'auth', 'api_key', 'apikey', 'private'];
  if (sensitiveKeys.some(s => k.includes(s))) {
    if (value.length > 4) {
      return value.slice(0, 4) + '***REDACTED***';
    }
    return '***REDACTED***';
  }
  return value;
}
