import { LatLng } from '@calo/driver-types';

import client from '../client';
import { Route } from '../types/interfaces';

export const getRoute = async (curPosLng: number, curPosLat: number, destLng: number, destLat: number): Promise<Route> => {
  const { data } = await client.get('/routing/path', {
    params: {
      curPosLat,
      curPosLng,
      destLat,
      destLng
    }
  });
  return data;
};

export const updateDriverPosition = async (location: LatLng): Promise<void> => {
  await client.put('/tracking/updatePositions', { location });
  return;
};
