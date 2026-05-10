export interface HCVRequest {
  healthCardNumber: string; // 10 digits
  versionCode: string;      // 2 uppercase letters
  serviceDate: string;      // YYYY-MM-DD
}

export interface HCVResponse {
  isValid: boolean;
  responseCode: string;     // '50'–'55' = valid
  responseMessage: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;     // YYYY-MM-DD
  gender?: string;          // M | F
  offline?: boolean;
}

export type HCVResponseCode = '50' | '51' | '52' | '53' | '54' | '55' | string;
