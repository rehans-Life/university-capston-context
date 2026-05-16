import { Country } from 'libs/enums';

const mockGetAllEnabled = jest.fn();
const mockSqsSend = jest.fn();

jest.mock('libs/middleware', () => ({
  __esModule: true,
  default: (fn: unknown) => {
    const handler = fn as ((...args: unknown[]) => Promise<unknown>) & { use?: (...args: unknown[]) => unknown };
    handler.use = () => handler;
    return handler;
  }
}));

jest.mock('libs/middlewares', () => ({
  withSecrets: jest.fn(() => jest.fn())
}));

jest.mock('../../../libs/repositories', () => ({
  RoutingConfigRepository: jest.fn().mockImplementation(() => ({
    getAllEnabled: mockGetAllEnabled
  }))
}));

jest.mock('libs/facades', () => ({
  SQS: jest.fn().mockImplementation(() => ({
    send: mockSqsSend
  }))
}));

jest.mock('@teamcalo/core', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const buildConfig = (id: string, country: Country) => ({
  sk: id,
  name: `${country}-config`,
  country
});

describe('createDynamicRouting cron', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    process.env.DYNAMIC_ROUTING_QUEUE_URL = 'https://sqs.example.com/queue';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('queues GB configs only during 09:00 UTC run', async () => {
    jest.setSystemTime(new Date('2026-01-10T09:00:00.000Z'));
    mockGetAllEnabled.mockResolvedValue([buildConfig('gb-1', Country.GB), buildConfig('ae-1', Country.AE)]);

    const { handler } = require('../createDynamicRouting');
    await handler({} as never, {} as never, {} as never);

    expect(mockSqsSend).toHaveBeenCalledTimes(1);
    expect(mockSqsSend).toHaveBeenCalledWith({
      routingConfigId: 'gb-1',
      day: '2026-01-12'
    });
  });

  it('queues AE and OM configs only during 17:00 UTC run', async () => {
    jest.setSystemTime(new Date('2026-01-10T17:00:00.000Z'));
    mockGetAllEnabled.mockResolvedValue([
      buildConfig('gb-1', Country.GB),
      buildConfig('ae-1', Country.AE),
      buildConfig('om-1', Country.OM),
      buildConfig('bh-1', Country.BH)
    ]);

    const { handler } = require('../createDynamicRouting');
    await handler({} as never, {} as never, {} as never);

    expect(mockSqsSend).toHaveBeenCalledTimes(2);
    expect(mockSqsSend).toHaveBeenNthCalledWith(1, {
      routingConfigId: 'ae-1',
      day: '2026-01-12'
    });
    expect(mockSqsSend).toHaveBeenNthCalledWith(2, {
      routingConfigId: 'om-1',
      day: '2026-01-12'
    });
  });

  it('queues BH, SA, KW, and QA configs only during 18:00 UTC run', async () => {
    jest.setSystemTime(new Date('2026-01-10T18:00:00.000Z'));
    mockGetAllEnabled.mockResolvedValue([
      buildConfig('gb-1', Country.GB),
      buildConfig('bh-1', Country.BH),
      buildConfig('sa-1', Country.SA),
      buildConfig('kw-1', Country.KW),
      buildConfig('qa-1', Country.QA),
      buildConfig('ae-1', Country.AE)
    ]);

    const { handler } = require('../createDynamicRouting');
    await handler({} as never, {} as never, {} as never);

    expect(mockSqsSend).toHaveBeenCalledTimes(4);
    expect(mockSqsSend).toHaveBeenNthCalledWith(1, {
      routingConfigId: 'bh-1',
      day: '2026-01-12'
    });
    expect(mockSqsSend).toHaveBeenNthCalledWith(2, {
      routingConfigId: 'sa-1',
      day: '2026-01-12'
    });
    expect(mockSqsSend).toHaveBeenNthCalledWith(3, {
      routingConfigId: 'kw-1',
      day: '2026-01-12'
    });
    expect(mockSqsSend).toHaveBeenNthCalledWith(4, {
      routingConfigId: 'qa-1',
      day: '2026-01-12'
    });
  });

  it('does not queue anything on unsupported cron hour', async () => {
    jest.setSystemTime(new Date('2026-01-10T11:00:00.000Z'));
    mockGetAllEnabled.mockResolvedValue([buildConfig('gb-1', Country.GB), buildConfig('ae-1', Country.AE)]);

    const { handler } = require('../createDynamicRouting');
    await handler({} as never, {} as never, {} as never);

    expect(mockSqsSend).not.toHaveBeenCalled();
  });
});
