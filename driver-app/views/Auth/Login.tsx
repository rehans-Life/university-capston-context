import React, { useState, useCallback } from 'react';

import ConfirmOTP from '@components/Authentication/ConfirmOTP';
import CustomSignIn from '@components/Authentication/CustomSignIn';
import { useAuth } from '@hooks';

import { AuthData, LoginStep } from './types';

const Login = () => {
  const { isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState<LoginStep>('phone');
  const [authData, setAuthData] = useState<AuthData>({
    cognitoUser: null,
    phoneNumber: ''
  });

  const handlePhoneChange = useCallback((data?: AuthData | null, backToLogin?: boolean) => {
    if (backToLogin) {
      setCurrentStep('phone');
      setAuthData({
        cognitoUser: null,
        phoneNumber: ''
      });
    } else if (data) {
      setCurrentStep('otp');
      setAuthData(data);
    } else {
      // Successful authentication - no action needed as useAuth will handle navigation in RootNavigator using Hub
    }
  }, []);

  // If user is authenticated, let RootNavigator handle navigation
  if (isAuthenticated) {
    return null;
  }

  // Render appropriate step based on current state
  switch (currentStep) {
    case 'phone':
      return <CustomSignIn handlePhoneChange={handlePhoneChange} />;
    case 'otp':
      return <ConfirmOTP authData={authData} handlePhoneChange={handlePhoneChange} />;
    default:
      return <CustomSignIn handlePhoneChange={handlePhoneChange} />;
  }
};

export default Login;
