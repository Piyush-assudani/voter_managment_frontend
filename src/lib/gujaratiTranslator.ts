/**
 * Shows the dashboard in Gujarati for clients that need it (currently only Dr Pratapsinh Rajput),
 * without touching the Hindi source used by every other client.
 *
 * It rewrites Hindi text in the page as it renders: each run of Devanagari text is looked up
 * in a reviewed Hindi → Gujarati dictionary (lib/i18n/gu-hi-dictionary.json, built from every
 * Hindi string in the panel). Phrases that are not in the dictionary are translated word by
 * word using the longest dictionary match, and anything left over is converted to Gujarati
 * script so no Devanagari remains on screen.
 */

type Dictionary = Record<string, string>;

// A run of Hindi text: starts and ends with a Devanagari letter/sign, may contain spaces
// and simple punctuation in between. Must match the extraction used to build the dictionary.
const RUN_RE = /[ऀ-ॣ०-ॿ](?:[ऀ-ॿ ।,/\-:?!.]*[ऀ-ॣ०-ॿ])?/g;
const HAS_DEVANAGARI = /[ऀ-ॿ]/;
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP_SELECTOR = 'script, style, textarea, input, [contenteditable="true"], [data-no-translate]';

let dictionary: Dictionary = {};
const cache = new Map<string, string>();

/** Devanagari → Gujarati script (same Unicode layout, offset 0x180). */
function toGujaratiScript(text: string): string {
  let out = '';
  for (const ch of text.normalize('NFD')) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 0x093c) continue; // nukta: Gujarati names don't use it
    if (code === 0x0964 || code === 0x0965) { out += '.'; continue; } // danda
    if (code >= 0x0900 && code <= 0x097f) {
      const gu = code + 0x180;
      // Only letters/signs that exist in the Gujarati block
      out += (gu >= 0x0a81 && gu <= 0x0aff) ? String.fromCodePoint(gu) : '';
    } else {
      out += ch;
    }
  }
  return out.normalize('NFC');
}

function translateRun(run: string): string {
  const hit = dictionary[run];
  if (hit !== undefined) return hit;
  const cached = cache.get(run);
  if (cached !== undefined) return cached;

  // Longest-match word segmentation over the dictionary, then script conversion.
  const words = run.split(' ');
  const parts: string[] = [];
  let i = 0;
  while (i < words.length) {
    let matched = false;
    for (let j = words.length; j > i; j--) {
      const phrase = words.slice(i, j).join(' ');
      const value = dictionary[phrase] ?? dictionary[phrase.replace(/[।,:?!.]+$/, '')];
      if (value !== undefined) {
        const tail = phrase.match(/[।,:?!.]+$/)?.[0] ?? '';
        parts.push(dictionary[phrase] !== undefined ? value : value + toGujaratiScript(tail));
        i = j;
        matched = true;
        break;
      }
    }
    if (!matched) {
      parts.push(toGujaratiScript(words[i]));
      i += 1;
    }
  }
  const result = parts.join(' ');
  if (cache.size > 5000) cache.clear();
  cache.set(run, result);
  return result;
}

/** Load the dictionary directly (used by enableGujarati and by tests). */
export function setGujaratiDictionary(dict: Dictionary) {
  dictionary = dict;
  cache.clear();
}

export function translateToGujarati(text: string): string {
  if (!text || !HAS_DEVANAGARI.test(text)) return text;
  return text.replace(RUN_RE, (run) => translateRun(run));
}

function shouldSkip(el: Element | null): boolean {
  return !!el && !!el.closest(SKIP_SELECTOR);
}

function translateTextNode(node: Text) {
  const value = node.nodeValue;
  if (!value || !HAS_DEVANAGARI.test(value)) return;
  if (shouldSkip(node.parentElement)) return;
  const next = translateToGujarati(value);
  if (next !== value) node.nodeValue = next;
}

function translateAttributes(el: Element) {
  if (el.closest('[data-no-translate]')) return;
  for (const attr of ATTRS) {
    const value = el.getAttribute(attr);
    if (value && HAS_DEVANAGARI.test(value)) {
      const next = translateToGujarati(value);
      if (next !== value) el.setAttribute(attr, next);
    }
  }
  if (el instanceof HTMLInputElement && (el.type === 'button' || el.type === 'submit') && HAS_DEVANAGARI.test(el.value)) {
    el.value = translateToGujarati(el.value);
  }
}

function translateTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  translateAttributes(el);
  if (shouldSkip(el) && !(el instanceof HTMLInputElement)) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) translateTextNode(current as Text);
    else translateAttributes(current as Element);
    current = walker.nextNode();
  }
}

let observer: MutationObserver | null = null;
let titleObserver: MutationObserver | null = null;
let originalAlert: typeof window.alert | null = null;
let originalConfirm: typeof window.confirm | null = null;
let originalPrompt: typeof window.prompt | null = null;

/** Start translating the whole page to Gujarati. Safe to call more than once. */
export async function enableGujarati(): Promise<void> {
  if (typeof window === 'undefined' || observer) return;
  const mod = await import('./i18n/gu-hi-dictionary.json');
  setGujaratiDictionary((mod.default || mod) as Dictionary);

  document.documentElement.lang = 'gu';
  translateTree(document.body);
  if (HAS_DEVANAGARI.test(document.title)) document.title = translateToGujarati(document.title);

  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData') translateTextNode(m.target as Text);
      else if (m.type === 'attributes') translateAttributes(m.target as Element);
      else m.addedNodes.forEach((n) => translateTree(n));
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });

  const titleEl = document.querySelector('title');
  if (titleEl) {
    titleObserver = new MutationObserver(() => {
      if (HAS_DEVANAGARI.test(document.title)) document.title = translateToGujarati(document.title);
    });
    titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
  }

  // Browser dialogs (confirm/alert/prompt) use Hindi messages too.
  originalAlert = window.alert;
  originalConfirm = window.confirm;
  originalPrompt = window.prompt;
  window.alert = (msg?: unknown) => originalAlert!.call(window, translateToGujarati(String(msg ?? '')));
  window.confirm = (msg?: string) => originalConfirm!.call(window, translateToGujarati(String(msg ?? '')));
  window.prompt = (msg?: string, def?: string) => originalPrompt!.call(window, translateToGujarati(String(msg ?? '')), def);
}

export function isGujaratiEnabled(): boolean {
  return observer !== null;
}
