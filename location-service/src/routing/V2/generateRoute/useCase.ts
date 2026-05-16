import { logger } from '@calo/core';
import { FileService, RouteService } from '../../../libs/services';
import { GenerateTimeWindowRouteParams, RoutingOutput } from '../../../libs/interfaces';
class GenerateRouteUseCase {
  constructor(
    private routeService: RouteService,
    private fileService: FileService
  ) {}

  async exec({ timeWindowRouteParams }: { timeWindowRouteParams: GenerateTimeWindowRouteParams }) {
    try {
      let fileData: RoutingOutput;
      fileData = await this.routeService.generateTimeWindowedRoute(timeWindowRouteParams);

      // attach routing params for reference
      fileData.routingParams = timeWindowRouteParams;

      // save builtRoute to s3
      const fileUrl = await this.saveFile(fileData, timeWindowRouteParams.fileName);
      logger.debug(`saved route to file: ${fileUrl}`);
    } catch (error) {
      logger.error('Error running routing algorithm:', error);
      throw error;
    }
  }

  private async saveFile(fileData: RoutingOutput, fileName: string) {
    const data = JSON.stringify(fileData);
    const name = `route-plans/${fileName}/time-window-route.json`;
    return await this.fileService.putFile(name, Buffer.from(data));
  }
}

export default GenerateRouteUseCase;
