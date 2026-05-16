import { Kitchen } from '@calo/types';

import client from '../client';

export const getRemoteConfig = async (kitchen: Kitchen) => {
  const { data } = await client.get(`/remote-config/${kitchen}`);

  return data;
};
