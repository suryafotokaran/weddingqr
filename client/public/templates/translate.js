/**
 * WeddingTranslate — shared translation utility for all wedding invitation templates.
 * Uses Google Translate (free, unofficial) with sessionStorage caching.
 * Included as a plain <script src="translate.js"> in every template.
 */
(function (global) {
  'use strict';

  var LANG_NAMES = {
    en: 'English',
    hi: 'हिंदी',
    ta: 'தமிழ்',
    kn: 'ಕನ್ನಡ',
    te: 'తెలుగు',
    ml: 'മലയാളം',
  };

  var currentLang = 'en';
  var originals = []; // [{node, text}] saved on first non-english switch
  var isSwitching = false;

  // ── Cache helpers ──────────────────────────────────────────────
  function cacheKey(lang, text) {
    return 'wt|' + lang + '|' + text;
  }
  function cacheGet(lang, text) {
    try { return sessionStorage.getItem(cacheKey(lang, text)); } catch (e) { return null; }
  }
  function cacheSet(lang, text, translated) {
    try { sessionStorage.setItem(cacheKey(lang, text), translated); } catch (e) {}
  }

  // ── Translate one string via Google Translate (GTX) ────────────
  function translateOne(text, lang) {
    var cached = cacheGet(lang, text);
    if (cached !== null) return Promise.resolve(cached);

    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl='
      + encodeURIComponent(lang) + '&dt=t&q=' + encodeURIComponent(text);

    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var out = (j[0] || []).map(function (s) { return s[0] || ''; }).join('');
        cacheSet(lang, text, out);
        return out;
      })
      .catch(function () { return text; }); // fallback: show original
  }

  // ── Collect all translatable text nodes under root ─────────────
  function collectNodes(root) {
    var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, IFRAME: 1 };
    var results = [];

    function walk(node) {
      if (node.nodeType === 3) {
        var t = node.textContent.trim();
        if (t.length > 0) results.push(node);
      } else if (node.nodeType === 1 && !SKIP[node.tagName]) {
        for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
      }
    }
    walk(root);
    return results;
  }

  // ── Switch all page text to target language ────────────────────
  function switchTo(lang) {
    if (lang === currentLang || isSwitching) return;
    isSwitching = true;

    // Update button states immediately
    document.querySelectorAll('[data-lang-choice]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.langChoice === lang);
      btn.disabled = true;
    });

    var nodes = collectNodes(document.body);

    // Save originals on first departure from English
    if (originals.length === 0) {
      nodes.forEach(function (node) {
        originals.push({ node: node, text: node.textContent });
      });
    }

    if (lang === 'en') {
      // Restore English
      originals.forEach(function (entry) {
        if (document.contains(entry.node)) entry.node.textContent = entry.text;
      });
      currentLang = 'en';
      isSwitching = false;
      document.querySelectorAll('[data-lang-choice]').forEach(function (btn) { btn.disabled = false; });
      return;
    }

    // Build list of unique texts to translate
    var englishMap = {};
    originals.forEach(function (entry) {
      var t = entry.text.trim();
      if (t) englishMap[t] = null;
    });
    var uniqueTexts = Object.keys(englishMap);

    // Mark the target language before async work so we can detect stale responses
    var targetLang = lang;
    currentLang = lang;

    // Translate all unique strings in parallel (Promise.all)
    var promises = uniqueTexts.map(function (t) {
      return translateOne(t, targetLang).then(function (translated) {
        englishMap[t] = translated;
      });
    });

    Promise.all(promises).then(function () {
      if (currentLang !== targetLang) {
        // Language switched again while translating — discard stale results
        isSwitching = false;
        document.querySelectorAll('[data-lang-choice]').forEach(function (btn) { btn.disabled = false; });
        return;
      }
      // Apply translations to live DOM nodes
      originals.forEach(function (entry) {
        if (!document.contains(entry.node)) return;
        var translated = englishMap[entry.text.trim()];
        if (translated) entry.node.textContent = translated;
      });
      isSwitching = false;
      document.querySelectorAll('[data-lang-choice]').forEach(function (btn) { btn.disabled = false; });
    });
  }

  // ── Build / refresh the language switcher ────────────────────
  function buildSwitcher(container, selectedLangs) {
    if (!container) return;
    var langs = (selectedLangs && selectedLangs.length) ? selectedLangs : ['en'];

    // Hide when only English (no point showing a single button)
    container.style.display = langs.length > 1 ? 'inline-flex' : 'none';

    // Detect which CSS class to use (template4 uses no extra class, 1-3 use ls-btn)
    var haslsBtn = !!container.querySelector('.ls-btn');
    var btnClass = haslsBtn ? 'ls-btn' : '';

    // Clear and rebuild
    container.innerHTML = '';

    langs.forEach(function (code) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.langChoice = code;
      btn.textContent = LANG_NAMES[code] || code.toUpperCase();
      if (btnClass) btn.className = btnClass;
      if (code === currentLang) btn.classList.add('is-active');
      btn.addEventListener('click', function () { switchTo(code); });
      container.appendChild(btn);
    });
  }

  // ── Reset (called by applyData when content changes) ──────────
  function reset() {
    originals = [];
    currentLang = 'en';
    isSwitching = false;
  }

  global.WeddingTranslate = {
    buildSwitcher: buildSwitcher,
    switchTo: switchTo,
    reset: reset,
    LANG_NAMES: LANG_NAMES,
  };

})(window);
