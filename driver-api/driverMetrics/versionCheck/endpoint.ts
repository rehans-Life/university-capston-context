import { apiV1WithDriver } from '@calo-backend/middleware/apiV1WithDriver';
import { withValidation } from '@teamcalo/core';

import { eventRequestSchema, eventResponseSchema } from './schema';
import { isVersionSupported } from '../update/utils/helpers';

export const handler = apiV1WithDriver<unknown, { version: string }>()
  .use(withValidation({ request: { schema: eventRequestSchema }, httpResponse: { schema: eventResponseSchema } }))
  .handler(async (event: any) => {
    // Get version from URL path parameter (e.g., /versionCheck/4.4.1)
    const { version } = event.pathParameters;

    // Minimum supported version
    const minSupportedVersion = '4.4.1';

    // Check if the provided version is supported
    const isSupported = isVersionSupported(version, minSupportedVersion);

    return {
      statusCode: 200,
      body: {
        isSupported,
        apk: '',
      },
    };
  });
