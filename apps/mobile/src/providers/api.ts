import Constants from 'expo-constants';
import { createProductApiClient } from '@escrow4334/product-core';

const configuredApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined);

export const api = createProductApiClient({
  baseUrl: configuredApiBaseUrl,
});
