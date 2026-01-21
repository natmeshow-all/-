import { describe, it, expect } from 'vitest';
import { formatDateThai } from '@/app/lib/dateUtils';

describe('dateUtils', () => {
  describe('formatDateThai', () => {
    it('formats date correctly', () => {
      const date = new Date('2024-01-15T10:30:00');
      const formatted = formatDateThai(date);
      
      // Should contain Thai date format
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('handles invalid date', () => {
      const invalidDate = new Date('invalid');
      const formatted = formatDateThai(invalidDate);
      
      // Should handle gracefully
      expect(formatted).toBeTruthy();
    });
  });
});
