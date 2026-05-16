import { CognitoUser } from 'amazon-cognito-identity-js';

export interface AuthData {
  cognitoUser: CognitoUser | null;
  phoneNumber: string;
}

export type LoginStep = 'phone' | 'otp';
