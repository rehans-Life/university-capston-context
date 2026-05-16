import { getDummyLambdaContext } from 'tests/lambda-payload-generator';

import * as helpers from '../../../update/utils/helpers';
import { handler } from '../../endpoint';

jest.mock('../../../update/utils/helpers');

interface HandlerResult {
  statusCode: number;
  body: string;
}

describe('test versionCheck endpoint', () => {
  const context = {
    ...getDummyLambdaContext(),
    language: 'en',
  } as any;

  it('should return isSupported true when version is greater than minimum', async () => {
    const spy = jest.spyOn(helpers, 'isVersionSupported').mockReturnValue(true);

    const event = {
      pathParameters: {
        version: '4.4.2',
      },
      headers: {
        'calo-country': 'BH',
      },
    };

    const result = (await handler(event as any, context)) as HandlerResult;

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('4.4.2', '4.4.1');
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as unknown as string);

    expect(body).toEqual({
      isSupported: true,
      apk: '',
    });
  });

  it('should return isSupported false when version is less than minimum', async () => {
    const spy = jest.spyOn(helpers, 'isVersionSupported').mockReturnValue(false);

    const event = {
      pathParameters: {
        version: '4.3.9',
      },
      headers: {
        'calo-country': 'BH',
      },
    };

    const result = (await handler(event as any, context)) as HandlerResult;

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('4.3.9', '4.4.1');
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as unknown as string);

    expect(body).toEqual({
      isSupported: false,
      apk: '',
    });
  });

  it('should return isSupported true when version equals minimum', async () => {
    const spy = jest.spyOn(helpers, 'isVersionSupported').mockReturnValue(true);

    const event = {
      pathParameters: {
        version: '4.4.1',
      },
      headers: {
        'calo-country': 'BH',
      },
    };

    const result = (await handler(event as any, context)) as HandlerResult;

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('4.4.1', '4.4.1');
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as unknown as string);

    expect(body).toEqual({
      isSupported: true,
      apk: '',
    });
  });

  it('should handle version with patch number correctly', async () => {
    const spy = jest.spyOn(helpers, 'isVersionSupported').mockReturnValue(true);

    const event = {
      pathParameters: {
        version: '4.4.10',
      },
      headers: {
        'calo-country': 'BH',
      },
    };

    const result = (await handler(event as any, context)) as HandlerResult;

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('4.4.10', '4.4.1');
    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body as unknown as string);
    expect(body).toEqual({
      isSupported: true,
      apk: '',
    });
  });
});
