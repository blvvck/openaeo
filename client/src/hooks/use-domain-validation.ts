import { workspaceFetch as fetch } from '@/lib/workspace-query';
/**
 * Domain Validation Hook
 *
 * Validates that a domain exists via DNS lookup before
 * proceeding with expensive LLM operations.
 */

import { useState, useCallback } from 'react';

interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  domain?: string;
}

interface UseDomainValidationReturn {
  validate: (domain: string) => Promise<ValidationResult>;
  isValidating: boolean;
  result: ValidationResult | null;
  reset: () => void;
}

export function useDomainValidation(): UseDomainValidationReturn {
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const validate = useCallback(async (domain: string): Promise<ValidationResult> => {
    setIsValidating(true);
    setResult(null);

    try {
      const response = await fetch(
        `/api/utils/validate-domain?domain=${encodeURIComponent(domain)}`
      );

      if (!response.ok) {
        const errorResult: ValidationResult = {
          valid: false,
          error: 'Failed to validate domain'
        };
        setResult(errorResult);
        return errorResult;
      }

      const data: ValidationResult = await response.json();
      setResult(data);
      return data;
    } catch (error) {
      const errorResult: ValidationResult = {
        valid: false,
        error: 'Network error while validating domain'
      };
      setResult(errorResult);
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setIsValidating(false);
  }, []);

  return { validate, isValidating, result, reset };
}
