import { logger } from '@teamcalo/core';
import FileService from 'libs/services/FileService';
import { MultiRouteOutput } from '../../../libs/interfaces';

interface Approver {
  name: string;
  email: string;
  id: string;
}

interface ApprovalStatus {
  approved: boolean;
  approvedAt: string;
  approver: Approver;
}

interface ApprovedMultiRouteOutput extends MultiRouteOutput {
  status: ApprovalStatus;
}

class ApproveDynamicRouteUseCase {
  private readonly fileService: FileService;

  constructor() {
    this.fileService = new FileService();
  }

  async exec(
    filename: string,
    approver: Approver,
    routes: MultiRouteOutput['routes']
  ): Promise<ApprovedMultiRouteOutput> {
    // Fetch the existing file from S3
    const s3Key = `route-plans/${filename}/time-window-route.json`;
    logger.info('Fetching S3 file', { s3Key });

    const fileData = await this.fileService.getFile(s3Key);

    let existingData: MultiRouteOutput;
    if (Buffer.isBuffer(fileData)) {
      existingData = JSON.parse(fileData.toString('utf8'));
    } else if (typeof fileData === 'string') {
      existingData = JSON.parse(fileData);
    } else {
      throw new Error('Unexpected file data format from S3');
    }

    // Update the routes with the incoming routes
    const updatedRoutes = existingData.routes.map((existingRoute, index) => {
      const incomingRoute = routes[index];
      if (incomingRoute) {
        return {
          ...existingRoute,
          simulated: incomingRoute.simulated
        };
      }
      return existingRoute;
    });

    // Add approval status
    const approvedData: ApprovedMultiRouteOutput = {
      ...existingData,
      routes: updatedRoutes,
      status: {
        approved: true,
        approvedAt: new Date().toISOString(),
        approver: {
          name: approver.name,
          email: approver.email,
          id: approver.id
        }
      }
    };

    // Save the updated file back to S3
    logger.info('Saving approved route back to S3', { s3Key });
    await this.fileService.putFile(s3Key, JSON.stringify(approvedData));

    logger.info('Dynamic route approved successfully', { filename, approver: approver.email });

    return approvedData;
  }
}

export default ApproveDynamicRouteUseCase;
