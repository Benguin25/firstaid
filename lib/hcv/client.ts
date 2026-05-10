// Single file to swap when going live with MOH SOAP API.
// Replace the import and call below with the real SOAP client implementation.
import { mockValidateHealthCard } from './mock';
import type { HCVRequest, HCVResponse } from './types';

const TIMEOUT_MS = 5000;

export async function validateHealthCard(req: HCVRequest): Promise<HCVResponse> {
  try {
    return await Promise.race([
      mockValidateHealthCard(req),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('HCV timeout')), TIMEOUT_MS)
      ),
    ]);
  } catch {
    return {
      isValid: false,
      responseCode: '99',
      responseMessage: 'HCV system unavailable',
      offline: true,
    };
  }
}
