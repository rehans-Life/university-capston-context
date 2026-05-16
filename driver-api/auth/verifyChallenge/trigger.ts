import { cognitoMiddleware } from '@teamcalo/core';
import { VerifyAuthChallengeResponseTriggerEvent } from 'aws-lambda';
import { parsePhoneNumber } from 'libphonenumber-js';

import OTPUseCase from './otpUseCase';
export const handler = cognitoMiddleware<VerifyAuthChallengeResponseTriggerEvent>().handler(
  async (event, { metrics, metricUnit }) => {
    if (!event.request.clientMetadata || ['PROVIDE_CHALLENGE_TYPE', '_'].includes(event.request.challengeAnswer)) {
      event.response.answerCorrect = false;
      return event;
    }
    const eventPhoneNumber = event.request.userAttributes.phone_number;
    const phoneNumber = parsePhoneNumber(eventPhoneNumber);
    let answerChallenge = '';

    try {
      const request = JSON.parse(event.request.challengeAnswer);
      if (typeof request !== 'object') {
        throw new Error('temp');
      }
      answerChallenge = request.code;
    } catch {
      answerChallenge = event.request.challengeAnswer;
    }

    const challenge = event.request.privateChallengeParameters.challenge;

    metrics.addMetadata('Country', phoneNumber.country!);
    metrics.addMetadata('Type', event.request.clientMetadata.challengeType);

    const otpUseCase = new OTPUseCase();

    event.response.answerCorrect = await otpUseCase.exec(challenge, answerChallenge);

    if (!event.response.answerCorrect) {
      metrics.addMetric('ChallengeVerificationFailed', metricUnit.Count, 1);
    }

    return event;
  },
);
