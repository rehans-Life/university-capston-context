import { UpdateDriverMetricsReq } from '@calo/driver-types';
import { DeliveryTime } from '@lib/enums';

import client from '../client';

export const updateShift = async (id: string, attr: UpdateDriverMetricsReq) => {
  const { data } = await client.put(`/driver-metrics/${id}`, attr);
  return data;
};

export const getShift = async (time: DeliveryTime) => {
  const { data } = await client.get(`/driver-metrics/time/${time}`);
  return data;
};

export const checkVersion = async (version: string) => {
  const { data } = await client.get(`/driver-metrics/version/${version}`);
  return data;
};
