import { PublishCommandOutput } from '@aws-sdk/client-sns';
import { SNSClient } from '@teamcalo/core';
import { ChallengeResult, CustomChallengeResult } from 'aws-lambda/trigger/cognito-user-pool-trigger/_common';
import { parsePhoneNumber } from 'libphonenumber-js';

import { Brand, Country } from '@calo/types';

import { OTPChallengeMetadata } from '../types';

export default class UseCase {
  constructor(private readonly client: SNSClient) {}

  async exec(eventPhoneNumber: string, sessionList: (ChallengeResult | CustomChallengeResult)[]) {
    const sessions = sessionList.filter((session) => !!session.challengeMetadata);
    const phoneNumber = parsePhoneNumber(eventPhoneNumber);
    const SUPPRESSED = process.env.STAGE !== 'prod';

    let metadata: OTPChallengeMetadata = {
      challenge: '',
      requestedAt: 0,
      sentTimes: 0,
      failedAttempts: 0,
    };

    if (sessions.length > 0) {
      // ! because we are filtering out the ones without challengeMetadata
      metadata = JSON.parse(sessions[sessions.length - 1].challengeMetadata!);
      metadata.failedAttempts++;
    }

    if (metadata.sentTimes === 0) {
      metadata.failedAttempts = 0;
      metadata.sentTimes++;
      metadata.requestedAt = Date.now();
      if (SUPPRESSED) {
        // dev
        metadata.challenge = '000000';
      } else if (phoneNumber.isValid()) {
        metadata.challenge = Math.random().toString(10).slice(2, 8);

        const promises: Promise<PublishCommandOutput>[] = [];
        const sms = {
          to: eventPhoneNumber,
          message: `Your code is: ${metadata.challenge}`,
          suppress: SUPPRESSED,
          brand: Brand.CALO,
        };

        promises.push(this.client.fireEvent(process.env.SMS_TOPIC_ARN!, sms));

        // GDPR compliance
        if (phoneNumber.country !== Country.GB) {
          const slack = {
            country: (phoneNumber.country as Country) ?? Country.BH,
            channel: 'driver-otp',
            blocks: [
              {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `*SMS:*\n${eventPhoneNumber}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*OTP:*\n${metadata.challenge}`,
                  },
                ],
              },
            ],
            suppress: SUPPRESSED,
            brand: Brand.CALO,
          };

          promises.push(this.client.fireEvent(process.env.SLACK_TOPIC_ARN!, slack));
        }
        await Promise.all(promises);
      }
    }

    return {
      privateChallengeParameters: {
        challenge: metadata.challenge,
      },
      challengeMetadata: JSON.stringify(metadata),
      publicChallengeParameters: {
        resendIn: 30 * metadata.sentTimes,
      },
    };
  }
}
