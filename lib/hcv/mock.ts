import type { HCVRequest, HCVResponse } from './types';

const VALID_CARD = '1234567890';
const INVALID_CARD = '0000000000';
const OFFLINE_CARD = '9999999999';

export async function mockValidateHealthCard(req: HCVRequest): Promise<HCVResponse> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  switch (req.healthCardNumber) {
    case OFFLINE_CARD:
      return {
        isValid: false,
        responseCode: '99',
        responseMessage: 'HCV system unavailable',
        offline: true,
      };

    case INVALID_CARD:
      return {
        isValid: false,
        responseCode: '72',
        responseMessage: 'Card number not on file',
      };

    case VALID_CARD:
      return {
        isValid: true,
        responseCode: '50',
        responseMessage: 'Valid',
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: '1985-03-15',
        gender: 'M',
      };

    default:
      return {
        isValid: true,
        responseCode: '50',
        responseMessage: 'Valid',
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '1990-06-20',
        gender: 'F',
      };
  }
}
