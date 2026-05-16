import { SNSClient, cognitoMiddleware } from '@teamcalo/core';
import { CreateAuthChallengeTriggerEvent } from 'aws-lambda';
import { parsePhoneNumber } from 'libphonenumber-js';

import OTPUseCase from './otpUseCase';

export const handler = cognitoMiddleware<CreateAuthChallengeTriggerEvent>().handler(async (event, { metrics }) => {
  if (event.request.challengeName !== 'CUSTOM_CHALLENGE') {
    return event;
  }
  let response = {
    privateChallengeParameters: {},
    publicChallengeParameters: {},
    challengeMetadata: '',
  };

  if (event.request.clientMetadata?.challengeType) {
    const eventPhoneNumber = event.request.userAttributes.phone_number;
    const phoneNumber = parsePhoneNumber(eventPhoneNumber);
    const challengeType = event.request.clientMetadata.challengeType;

    metrics.addMetadata('Country', phoneNumber.country!);
    metrics.addMetadata('Type', challengeType);

    const otpUseCase = new OTPUseCase(new SNSClient());
    const res = await otpUseCase.exec(eventPhoneNumber, event.request.session);
    response = {
      ...response,
      ...res,
    };
  } else {
    response.publicChallengeParameters = {
      challenge: 'PROVIDE_CHALLENGE_TYPE',
    };
  }

  event.response = {
    ...event.response,
    ...response,
  };

  return event;
});
