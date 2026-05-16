import { SQSEvent } from 'aws-lambda';
import middy from '@middy/core';
import { withSecrets } from 'libs/middlewares';
import { logger, ObsAlarm } from '@teamcalo/core';
import fireEvent from 'libs/fireEvent';
import { Email } from 'libs/interfaces';
import GenerateDynamicRoutingUseCase from '../routing-config/generateDynamicRouting/useCase';
import { DeliveryRepository } from 'libs/repositories/ES/DeliveryRepository';

interface DynamicRoutingJobMessage {
  routingConfigId: string;
  day: string;
}

const productionUrl = 'https://dashboard.calo.app';
const developmentUrl = 'https://dashboard.dev.calo.app';
const emailList = ['n.ijaz@calo.app', 'a.muiz@calo.app', 'b.rostek@calo.app', 'n.patel@calo.app'];

const getDashboardUrl = () => (process.env.STAGE === 'prod' ? productionUrl : developmentUrl);
const encodeRouteFileNameForDashboard = (fileName: string) => encodeURIComponent(fileName).replace(/%3A/g, ':');

const sendEmailNotification = async (day: string, routingConfigId: string, fileName: string) => {
  const encodedFileName = encodeRouteFileNameForDashboard(fileName);

  for (const email of emailList) {
    const emailBody: Email = {
      markdown: `## Dynamic Routing Generated\n\n- **Day:** ${day}\n- **Routing Config:** ${routingConfigId}\n- **File:** ${fileName}\n- **Link:** [View Route](${getDashboardUrl()}/group-routing/dynamic-routes/${encodedFileName})`,
      from: 'Calo <do-not-reply@calo.app>',
      to: email,
      subject: `Dynamic Routing Generated — ${fileName} - ${day}`,
      attachments: [],
      suppress: process.env.STAGE !== 'prod'
    };

    await fireEvent(process.env.EMAIL_TOPIC_ARN!, emailBody);
  }
};

const sendSlackNotification = async (day: string, routingConfigId: string, fileName: string) => {
  const encodedFileName = encodeRouteFileNameForDashboard(fileName);
  await ObsAlarm.fire({
    name: 'Dynamic Routing Generated',
    description: `Dynamic routing generated for ${day}\nFile: ${fileName}`,
    error: null,
    severity: 'BUSINESS',
    additional: {
      routingConfigId,
      day,
      fileName,
      dashboard: `${getDashboardUrl()}/group-routing/dynamic-routes/${encodedFileName}`
    },
    override: {
      channel: 'dynamic-routing-testing'
    }
  });
};

export const handler = middy<SQSEvent>(async (event: SQSEvent) => {
  for (const record of event.Records) {
    let message: DynamicRoutingJobMessage | undefined;

    try {
      message = JSON.parse(record.body) as DynamicRoutingJobMessage;
      const { routingConfigId, day } = message;

      logger.info('Processing dynamic routing job', { routingConfigId, day });

      const useCase = new GenerateDynamicRoutingUseCase(new DeliveryRepository());
      const { fileName } = await useCase.exec({ routingConfigID: routingConfigId, day });

      logger.info('Dynamic routing completed', { routingConfigId, day, fileName });

      await sendEmailNotification(day, routingConfigId, fileName);
      await sendSlackNotification(day, routingConfigId, fileName);

      logger.info('Notifications sent', { routingConfigId, day, fileName });
    } catch (error) {
      logger.error('Failed to process dynamic routing job', {
        body: record.body,
        routingConfigId: message?.routingConfigId,
        day: message?.day,
        error
      });

      // Re-throw so SQS can send to DLQ
      throw error;
    }
  }
}).use(withSecrets(process.env.OS_SECRET_ARN));
