import { useState, useEffect } from 'react';
import { getProducts, getProductByHandle, formatShopifyProduct } from '../lib/shopify-queries';

export function useShopifyProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const shopifyProducts = await getProducts(20);
        const formattedProducts = shopifyProducts.map(formatShopifyProduct);
        setProducts(formattedProducts);
        setError(null);
      } catch (err) {
        setError(err as Error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  return { products, loading, error };
}

export function useShopifyProduct(handle: string) {
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!handle) {
      setLoading(false);
      return;
    }

    async function fetchProduct() {
      try {
        setLoading(true);
        const shopifyProduct = await getProductByHandle(handle);
        if (shopifyProduct) {
          const formattedProduct = formatShopifyProduct(shopifyProduct);
          setProduct(formattedProduct);
          setError(null);
        } else {
          setProduct(null);
        }
      } catch (err) {
        setError(err as Error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [handle]);

  return { product, loading, error };
}
