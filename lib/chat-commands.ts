/** Commands that the desktop Dynamic Island can execute locally. */
export function isDesktopCommand(text: string) {
  return /^(?:please\s+)?(?:open|show|launch)\s+fudge\s+settings[.!?]*$/i.test(text)
    || /^(?:what|which|list)\s+(?:apps|applications)(?:\s+can\s+you\s+open)?[?!.]*$/i.test(text)
    || /^(?:please\s+)?(?:close|quit|exit|stop)\s+(?:the\s+)?(.+?)[.!?]*$/i.test(text)
    || /^(?:please\s+)?(?:open|launch|start)\s+(?:the\s+)?(.+?)[.!?]*$/i.test(text);
}
