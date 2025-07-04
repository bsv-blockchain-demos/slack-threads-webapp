import emojiDictionary from 'emoji-dictionary';

/**
 * Replaces :emoji_name: with:
 * - Unicode emoji (from emoji-dictionary)
 * - Custom Slack emoji as <img>
 *
 * @param {string} text The input text with Slack-style emoji codes.
 * @param {Object} customEmojiMap Map of emoji names to image URLs (from Slack emoji.list).
 * @returns {string} Text with emoji replacements.
 */
export function renderSlackStyleEmojis(text, customEmojiMap = {}) {
  return text.replace(/:([a-z0-9_+-]+):/gi, (match, name) => {
    // Custom Slack emoji
    if (customEmojiMap[name]) {
      const url = customEmojiMap[name];
      return `<img src="${url}" alt=":${name}:" class="custom-emoji" style="height: 1em; vertical-align: middle;" />`;
    }

    // Standard Unicode emoji
    const unicodeEmoji = emojiDictionary.getUnicode(name);
    if (unicodeEmoji) {
      return unicodeEmoji;
    }

    // Fallback to original text if not found
    return match;
  });
}
