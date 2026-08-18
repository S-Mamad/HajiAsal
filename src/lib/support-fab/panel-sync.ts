export function planPanelOpenSync(input: {
  open: boolean;
  handshakeFetched: boolean;
  contextPosted: boolean;
  /** User session or guest identity ready to chat */
  identified: boolean;
}): { fetchHandshake: boolean; postContext: boolean } {
  if (!input.open) {
    return { fetchHandshake: false, postContext: false };
  }
  return {
    fetchHandshake: !input.handshakeFetched,
    postContext: input.identified && !input.contextPosted,
  };
}
