import { omit } from 'lodash-es';
import { Asset } from 'react-native-image-picker';
import { v4 as uuid } from 'uuid';

import { RouteItemAction, UpdateDeliveryReq } from '@calo/driver-types';
import { snackbarShow } from '@helpers';

import client from '../client';

import { getUploadLink } from './subscription';

export const updateDelivery = async (id: string, attr: UpdateDeliveryReq) => {
  const { data } = await client.put(`/deliveries/${id}`, attr);
  return data;
};

export const noCustomerFound = async (id: string) => {
  const { data } = await client.post(`/deliveries/${id}/no-customer-found`);
  return data;
};

export const unableToDeliver = async (id: string) => {
  const { data } = await client.post(`/deliveries/${id}/unable-to-deliver`);
  return data;
};

export const addActions = async (id: string, actions: RouteItemAction[]) => {
  const actionsWithoutCreatedAt = actions.map((action) => omit(action, 'createdAt'));
  const { status } = await client.post(`/deliveries/${id}/handle-actions`, {
    actions: actionsWithoutCreatedAt
  });
  if (status === 200) {
    snackbarShow('Request sent', false);
  } else {
    snackbarShow('Error', true);
  }
  return status;
};

export const getDelivery = async (id: string) => {
  const { data } = await client.get(`/deliveries/${id}`);
  return data;
};

// POD Image Upload Functions
export const uploadPODImage = async (deliveryId: string, file: Asset): Promise<string> => {
  const extension = file.type?.split('/')[1] || 'jpg';
  const filename = `${uuid()}.${extension}`;
  const imagePath = `pod-images/${deliveryId}/${filename}`;
  const response = await getUploadLink(imagePath, '');

  const formData = new FormData();
  for (const key of Object.keys(response.fields)) {
    formData.append(key, response.fields[key]);
  }
  formData.append('file', file);

  await fetch(response.url, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return imagePath;
};

export const uploadPODImages = async (deliveryId: string, images: Asset[]): Promise<string[]> => {
  const uploadPromises = images.map((image) => uploadPODImage(deliveryId, image));
  const results = await Promise.all(uploadPromises);
  return results;
};
