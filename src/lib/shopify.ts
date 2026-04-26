import { createStorefrontClient } from '@shopify/hydrogen-react';

const hasShopifyConfig = !!(
  import.meta.env.VITE_SHOPIFY_STORE_DOMAIN &&
  import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN
);

let shopifyClient: string | null = null;
let shopifyHeaders: Record<string, string> = {};

if (hasShopifyConfig) {
  const client = createStorefrontClient({
    storeDomain: import.meta.env.VITE_SHOPIFY_STORE_DOMAIN!,
    storefrontApiVersion: import.meta.env.VITE_SHOPIFY_API_VERSION || '2024-01',
    privateStorefrontToken: import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
  });

  shopifyClient = client.getStorefrontApiUrl();
  shopifyHeaders = client.getPrivateTokenHeaders();
}

export { shopifyClient, shopifyHeaders };

export async function shopifyFetch<T>({ query, variables }: { query: string; variables?: any }): Promise<T> {
  if (!hasShopifyConfig || !shopifyClient) {
    throw new Error('Shopify is not configured. Please set VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN environment variables.');
  }

  const response = await fetch(shopifyClient, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...shopifyHeaders,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`);
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}
