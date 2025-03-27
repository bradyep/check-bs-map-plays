export function removeNonHex(text: string): string {
    return text.replace(/[^0-9a-fA-F]/g, '');
}
