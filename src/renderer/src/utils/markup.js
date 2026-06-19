export function compilePoEMarkup(text) {
  if (!text) return "";

  let output = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const regex = /&lt;([\w\s,()]+)&gt;\{([^{}]+)\}/g;

  const replaceTag = (tag, content) => {
    tag = tag.trim().toLowerCase();

    if (tag === 'red')    return `<span style="color: #ff5555;">${content}</span>`;
    if (tag === 'orange') return `<span style="color: #ffaa00;">${content}</span>`;
    if (tag === 'yellow') return `<span style="color: #ffff55;">${content}</span>`;
    if (tag === 'green')  return `<span style="color: #3bfa3b;">${content}</span>`;
    if (tag === 'blue')   return `<span style="color: #55aaff;">${content}</span>`;
    if (tag === 'indigo') return `<span style="color: #4b0082;">${content}</span>`;
    if (tag === 'violet') return `<span style="color: #ee82ee;">${content}</span>`;
    if (tag === 'black')  return `<span style="color: #000000;">${content}</span>`;
    if (tag === 'white')  return `<span style="color: #ffffff;">${content}</span>`;
    if (tag === 'grey')   return `<span style="color: #8c8270;">${content}</span>`;
    if (tag === 'bronze') return `<span style="color: #cd7f32;">${content}</span>`;
    if (tag === 'silver') return `<span style="color: #b3c2d4;">${content}</span>`;
    if (tag === 'gold')   return `<span style="color: #dfc190;">${content}</span>`;

    if (tag.startsWith('rgb(')) return `<span style="color: ${tag};">${content}</span>`;

    if (tag === 'r') return `<span style="font-weight: normal; font-style: normal; text-decoration: none;">${content}</span>`;
    if (tag === 'b') return `<span style="font-weight: bold; color: #fff;">${content}</span>`;
    if (tag === 'i') return `<span style="font-style: italic;">${content}</span>`;
    if (tag === 'u') return `<span style="text-decoration: underline;">${content}</span>`;
    if (tag === 's') return `<span style="font-size: 0.85em; opacity: 0.8;">${content}</span>`;
    if (tag === 'm') return `<span style="font-size: 1.0em;">${content}</span>`;
    if (tag === 'l') return `<span style="font-size: 1.25em; font-family: var(--font-header);">${content}</span>`;

    return `&lt;${tag}&gt;{${content}}`;
  };

  let lastOutput;
  let iterations = 0;
  do {
    lastOutput = output;
    output = output.replace(regex, (match, tag, content) => replaceTag(tag, content));
    iterations++;
  } while (output !== lastOutput && iterations < 10);

  return output.replace(/\n/g, "<br>");
}

export function getLevelIntervalString(lvlInterval) {
  if (!lvlInterval) return "";
  if (Array.isArray(lvlInterval)) {
    if (lvlInterval[0] === 0 && lvlInterval[1] === 100) return "Level: 1 - 100";
    if (lvlInterval[0] > 0 && lvlInterval[1] === 100) return `Level Required: ${lvlInterval[0]}+`;
    return `Level Required: ${lvlInterval[0]} - ${lvlInterval[1]}`;
  }
  return `Level Required: ${lvlInterval}`;
}
