import { removeNonHex } from '../utils/string';

describe('String Utils', () => {
  describe('removeNonHex', () => {
    it('should remove non-hexadecimal characters', () => {
      expect(removeNonHex('abc123xyz!@#')).toBe('abc123');
      expect(removeNonHex('ABCDEF')).toBe('ABCDEF');
      expect(removeNonHex('!@#$%^')).toBe('');
      expect(removeNonHex('12345g')).toBe('12345');
    });

    it('should handle empty string', () => {
      expect(removeNonHex('')).toBe('');
    });

    it('should handle string with only valid hex characters', () => {
      expect(removeNonHex('0123456789abcdefABCDEF')).toBe('0123456789abcdefABCDEF');
    });
  });
});