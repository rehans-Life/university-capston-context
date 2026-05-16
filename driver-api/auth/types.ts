export type OTPChallengeMetadata = {
  challenge: string;
  requestedAt: number;
  sentTimes: number;
  failedAttempts: number;
};

export enum ChallengeType {
  OTP = 'OTP',
  RESEND_OTP = 'RESEND_OTP',
  TOKEN = 'TOKEN',
  BIOMETRIC = 'BIOMETRIC',
  WHATSAPP_OTP = 'WHATSAPP_OTP'
}
