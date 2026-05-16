import { GetDeliveriesReq } from '@calo/driver-types';

import client from '../client';

export const getList = async (key: string, query: GetDeliveriesReq) => {
  const { data } = await client.get(key, {
    params: query
  });
  return data.data;
};
