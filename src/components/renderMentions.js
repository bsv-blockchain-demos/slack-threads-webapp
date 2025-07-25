// Utility to wrap <@User> in a span for later detection
export function wrapSlackMentions(text) {
  return text.replace(/<@(\w+)>/g, '<mention>$1</mention>');
}

// Component to style mentions
export function Mention({ children }) {
  return (
    <span style={{ color: '#007bff', fontWeight: 'bold' }}>
      @{children}
    </span>
  );
}