/**
 * Return CSS with `@layer` statements and blocks removed so leftover text is
 * only unlayered. Braces, `@layer`, and escapes inside strings or comments
 * are not treated as structure — the release gate would otherwise false-pass
 * layered `revert-layer` (e.g. `content:"}"`) or false-fail a real A2 rule
 * (e.g. `content:"@layer"`).
 */

function isHex(ch) {
  return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
}

function isIdentContinue(ch) {
  if (!ch) return false;
  const code = ch.codePointAt(0);
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    ch === '_' ||
    ch === '-' ||
    code >= 128
  );
}

function isWhitespace(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f';
}

function skipEscape(css, i) {
  if (i + 1 >= css.length) return css.length;
  const next = css[i + 1];
  if (next === '\n' || next === '\f') return i + 2;
  if (next === '\r') return css[i + 2] === '\n' ? i + 3 : i + 2;
  if (isHex(next)) {
    let j = i + 1;
    const max = Math.min(j + 6, css.length);
    while (j < max && isHex(css[j])) j += 1;
    if (isWhitespace(css[j])) {
      return css[j] === '\r' && css[j + 1] === '\n' ? j + 2 : j + 1;
    }
    return j;
  }
  return i + 2;
}

function skipString(css, i) {
  const quote = css[i];
  let j = i + 1;
  while (j < css.length) {
    if (css[j] === '\\') {
      j = skipEscape(css, j);
      continue;
    }
    if (css[j] === quote) return j + 1;
    j += 1;
  }
  return j;
}

function skipComment(css, i) {
  const end = css.indexOf('*/', i + 2);
  return end === -1 ? css.length : end + 2;
}

function nextCodeIndex(css, i) {
  while (i < css.length) {
    if (css[i] === '/' && css[i + 1] === '*') {
      i = skipComment(css, i);
      continue;
    }
    if (css[i] === '"' || css[i] === "'") {
      i = skipString(css, i);
      continue;
    }
    if (css[i] === '\\') {
      i = skipEscape(css, i);
      continue;
    }
    return i;
  }
  return i;
}

function isLayerAtRule(css, i) {
  if (css.slice(i, i + 6).toLowerCase() !== '@layer') return false;
  return !isIdentContinue(css[i + 6]);
}

function indexOfLayerAtRule(css, from) {
  let i = from;
  while (i < css.length) {
    i = nextCodeIndex(css, i);
    if (i >= css.length) return -1;
    if (isLayerAtRule(css, i)) return i;
    i += 1;
  }
  return -1;
}

function skipLayerAtRule(css, start) {
  let i = nextCodeIndex(css, start + 6);
  while (i < css.length) {
    i = nextCodeIndex(css, i);
    if (i >= css.length) return i;
    if (css[i] === ';') return i + 1;
    if (css[i] === '{') {
      let depth = 0;
      while (i < css.length) {
        i = nextCodeIndex(css, i);
        if (i >= css.length) return i;
        if (css[i] === '{') {
          depth += 1;
          i += 1;
        } else if (css[i] === '}') {
          depth -= 1;
          i += 1;
          if (depth === 0) return i;
        } else {
          i += 1;
        }
      }
      return i;
    }
    i += 1;
  }
  return i;
}

export function stripLayerBlocks(css) {
  let result = '';
  let i = 0;
  while (i < css.length) {
    const start = indexOfLayerAtRule(css, i);
    if (start === -1) {
      result += css.slice(i);
      break;
    }
    result += css.slice(i, start);
    i = skipLayerAtRule(css, start);
  }
  return result;
}
