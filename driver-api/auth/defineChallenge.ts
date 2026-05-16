import { cognitoMiddleware, logger } from '@teamcalo/core';
import { DefineAuthChallengeTriggerEvent } from 'aws-lambda';

import { ChallengeType, OTPChallengeMetadata } from './types';

const success = (event: DefineAuthChallengeTriggerEvent) => {
  event.response.issueTokens = true;
  event.response.failAuthentication = false;
  return event;
};

const deny = (event: DefineAuthChallengeTriggerEvent) => {
  event.response.issueTokens = false;
  event.response.failAuthentication = true;
  return event;
};

const continueChallenge = (event: DefineAuthChallengeTriggerEvent) => {
  event.response.issueTokens = false;
  event.response.failAuthentication = false;
  event.response.challengeName = 'CUSTOM_CHALLENGE';
  return event;
};

export const handler = cognitoMiddleware<DefineAuthChallengeTriggerEvent>().handler(async (event) => {
  if (event.request.session.length > 1) {
    const lastChallenge = event.request.session.slice(-1)[0];
    if (lastChallenge.challengeResult) {
      return success(event);
    }

    const challengeType = event.request.clientMetadata!.challengeType as ChallengeType;
    if ([ChallengeType.OTP, ChallengeType.RESEND_OTP].includes(challengeType)) {
      const lastChallengeMetadata: OTPChallengeMetadata = JSON.parse(lastChallenge.challengeMetadata!);
      logger.debug('lastChallengeMetadata', lastChallengeMetadata);
      if (challengeType === ChallengeType.OTP && lastChallengeMetadata.failedAttempts >= 3) {
        return deny(event);
      }
      if (
        challengeType === ChallengeType.RESEND_OTP &&
        (lastChallengeMetadata.sentTimes >= 3 ||
          lastChallengeMetadata.requestedAt + 30000 * lastChallengeMetadata.sentTimes > Date.now())
      ) {
        return deny(event);
      }
      return continueChallenge(event);
    }

    if (event.request.session.length >= 2) {
      return deny(event);
    }
  }
  return continueChallenge(event);
});
