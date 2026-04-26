import { shopifyFetch } from './shopify';

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images: {
    edges: Array<{
      node: {
        url: string;
        altText?: string;
      };
    }>;
  };
  tags: string[];
}

const GET_PRODUCTS_QUERY = `
  query GetProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
          description
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 10) {
            edges {
              node {
                url
                altText
              }
            }
          }
          tags
        }
      }
    }
  }
`;

const GET_PRODUCT_BY_HANDLE_QUERY = `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      description
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 10) {
        edges {
          node {
            url
            altText
          }
        }
      }
      tags
    }
  }
`;

export async function getProducts(count: number = 20) {
  const data = await shopifyFetch<{
    products: {
      edges: Array<{
        node: ShopifyProduct;
      }>;
    };
  }>({
    query: GET_PRODUCTS_QUERY,
    variables: { first: count },
  });

  return data.products.edges.map((edge) => edge.node);
}

export async function getProductByHandle(handle: string) {
  const data = await shopifyFetch<{
    product: ShopifyProduct | null;
  }>({
    query: GET_PRODUCT_BY_HANDLE_QUERY,
    variables: { handle },
  });

  return data.product;
}

export function formatShopifyProduct(product: ShopifyProduct) {
  const price = parseFloat(product.priceRange.minVariantPrice.amount);
  const currencySymbol = product.priceRange.minVariantPrice.currencyCode === 'USD' ? '$' : '';

  const validCategories = ['Classic', 'Deep Clean', 'Soothing', 'Fresh', 'Gift Set'];
  const category = product.tags.find(tag => validCategories.includes(tag)) || 'Classic';

  const images = product.images.edges.map(edge => edge.node.url);

  return {
    id: product.handle,
    name: product.title,
    price: `${currencySymbol}${Math.round(price)}`,
    image: images[0] || '',
    images: images.length > 0 ? images : [images[0] || ''],
    category,
    description: product.description || 'Handcrafted natural soap',
    details: product.tags.filter(tag => !validCategories.includes(tag)),
  };
}
