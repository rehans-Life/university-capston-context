import axios from 'axios';
import { Asset } from 'react-native-image-picker';

import { LatLng } from '@calo/driver-types';
import { Currency } from '@calo/types';

import client from '../client';

export const updateAddress = async (id: string, attr: LatLng | Record<string, string | number | undefined>) => {
  const { data } = await client.post(`/subscriptions/${id}/address`, attr);
  return data;
};

export const addToWallet = async (id: string, amount: number, currency: Currency) => {
  const { data } = await client.post(`/subscriptions/${id}/wallet`, {
    amount,
    currency
  });
  return data;
};

export const addNote = async (id: string, note: string, addressId: string, images?: string[]) => {
  const { data } = await client.post(`/subscriptions/${id}/note`, {
    note,
    addressId,
    images
  });
  return data;
};

export const getUploadLink = async (path: string, extendedPath = '/original') => {
  const { data } = await client.get('/image-link', {
    params: {
      path,
      extendedPath
    }
  });
  return JSON.parse(data);
};

const uploadImage = async (url: string, formData: FormData) => {
  axios.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const uploadDriverNoteImage = async (file: Asset, imagePath: string) => {
  const response = await getUploadLink(imagePath);
  const formData = new FormData();

  for (const key of Object.keys(response.fields)) {
    formData.append(key, response.fields[key]);
  }
  formData.append('file', file);
  await uploadImage(response.url, formData);
};
