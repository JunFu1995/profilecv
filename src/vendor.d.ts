declare module 'mammoth/mammoth.browser.js' {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{
    value: string;
    messages: { type: string; message: string }[];
  }>;
}

declare module '*?url' {
  const src: string;
  export default src;
}
