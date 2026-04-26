import { useParams, Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ShoppingBag, ArrowLeft, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useShopifyProduct, useShopifyProducts } from "../../hooks/useShopifyProducts";

// Mock products as fallback
const mockProducts = [
  {
    id: "rose-whisper",
    name: "Rose Whisper",
    price: "$12",
    image: "https://images.unsplash.com/photo-1620567838728-6406c0366f30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    images: [
      "https://images.unsplash.com/photo-1620567838728-6406c0366f30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1624459310096-78ea56ad7e05?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1618840392854-0adfa1a86798?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1620567927898-a39a7d926659?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    ],
    category: "Classic",
    description: "Handcrafted with rose petals from high-altitude Yunnan gardens, using traditional cold-process methods to preserve nature's essence. Gentle lather and delicate fragrance suit all skin types.",
    details: ["100g handmade bar", "Cold-process, 45-day cure", "Natural plant oil base", "No artificial colors or fragrances"]
  },
  {
    id: "charcoal-cleanse",
    name: "Charcoal Cleanse",
    price: "$13",
    image: "https://images.unsplash.com/photo-1620567838672-a4a88a011a67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    images: [
      "https://images.unsplash.com/photo-1620567838672-a4a88a011a67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1620567838715-4fc924689483?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1652233172336-6efc037a3766?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1773565744218-d8d11de58362?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    ],
    category: "Deep Clean",
    description: "Infused with activated bamboo charcoal for deep pore cleansing. Draws out impurities and excess oils while maintaining skin's natural balance. Perfect for oily and combination skin.",
    details: ["100g handmade bar", "Activated bamboo charcoal", "Deep pore cleansing", "Oil-balancing formula"]
  },
  {
    id: "jasmine-garden",
    name: "Jasmine Garden",
    price: "$12",
    image: "https://images.unsplash.com/photo-1624459310096-78ea56ad7e05?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    images: [
      "https://images.unsplash.com/photo-1624459310096-78ea56ad7e05?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1620567838728-6406c0366f30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1768235146410-2c5196dfe48c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1508759073847-9ca702cec7d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    ],
    category: "Soothing",
    description: "Made with jasmine blossoms picked at dawn, blended into a gentle botanical formula. Calming floral notes soothe both skin and soul. Ideal for sensitive skin.",
    details: ["100g handmade bar", "Organic jasmine extract", "Gentle & soothing", "Sensitive skin friendly"]
  },
  {
    id: "lavender-dream",
    name: "Lavender Dream",
    price: "$12",
    image: "https://images.unsplash.com/photo-1618840392854-0adfa1a86798?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    images: [
      "https://images.unsplash.com/photo-1618840392854-0adfa1a86798?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1624459310096-78ea56ad7e05?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1620567838728-6406c0366f30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      "https://images.unsplash.com/photo-1761864293818-603c23655cee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    ],
    category: "Soothing",
    description: "Pure lavender essential oil blended with shea butter creates a calming, moisturizing experience. Perfect for evening routines and relaxation.",
    details: ["100g handmade bar", "Pure lavender oil", "Shea butter enriched", "Calming & moisturizing"]
  }
];

const reviews = [
  {
    id: 1,
    name: "Sarah M.",
    rating: 5,
    date: "March 2026",
    comment: "Absolutely love this soap! The scent is subtle and natural, and my skin feels so soft after using it. Will definitely repurchase."
  },
  {
    id: 2,
    name: "James L.",
    rating: 5,
    date: "February 2026",
    comment: "High quality handmade soap. You can tell it's made with care. The lather is creamy and it doesn't dry out my skin like commercial soaps do."
  },
  {
    id: 3,
    name: "Emily R.",
    rating: 4,
    date: "January 2026",
    comment: "Beautiful soap with a lovely fragrance. Takes a bit longer to lather compared to regular soap, but that's expected with natural products. Very happy with my purchase!"
  }
];

export function ProductDetail() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const { product: shopifyProduct, loading, error } = useShopifyProduct(id || '');
  const { products: allShopifyProducts } = useShopifyProducts();

  // Use Shopify product if available, otherwise use mock data
  const product = shopifyProduct || mockProducts.find(p => p.id === id) || mockProducts[0];

  // Get recommended products from Shopify if available, otherwise use mock data
  const availableProducts = allShopifyProducts.length > 0 ? allShopifyProducts : mockProducts;
  const recommendedProducts = availableProducts.filter(p => p.id !== product.id).slice(0, 2);
  const totalPages = 5;

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-8 pb-32">
      <Link
        to="/products"
        className="inline-flex items-center gap-2 text-[0.875rem] tracking-wide mb-12 transition-opacity hover:opacity-60"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        Back to Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
        <div style={{ animation: 'fadeIn 0.8s ease-out' }}>
          <div className="aspect-[3/4] bg-white mb-4">
            <ImageWithFallback
              src={product.images[selectedImage]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`w-20 h-20 flex-shrink-0 bg-white border-2 transition-all ${
                  selectedImage === i ? 'border-[#1a1a1a]' : 'border-transparent hover:border-[#e5e5e0]'
                }`}
              >
                <ImageWithFallback
                  src={img}
                  alt={`${product.name} view ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        <div
          className="flex flex-col justify-center"
          style={{ animation: 'fadeIn 0.8s ease-out 0.2s both' }}
        >
          <p className="text-[0.8125rem] tracking-widest uppercase text-[#999] mb-3">
            {product.category}
          </p>

          <h1
            className="text-[3rem] lg:text-[4rem] tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {product.name}
          </h1>

          <p className="text-[2rem] mb-10" style={{ fontFamily: 'var(--font-display)' }}>
            {product.price}
          </p>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center border border-[#e5e5e0]">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-5 py-3 text-[0.9375rem] hover:bg-[#f5f5f3] transition-colors"
              >
                −
              </button>
              <span className="px-6 py-3 text-[0.9375rem] border-x border-[#e5e5e0]">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-5 py-3 text-[0.9375rem] hover:bg-[#f5f5f3] transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <button className="w-full bg-[#1a1a1a] text-white py-4 px-8 text-[0.9375rem] tracking-wide flex items-center justify-center gap-2 transition-opacity hover:opacity-90 mb-12">
            <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
            Add to Cart
          </button>

          <div className="space-y-8">
            <div>
              <h3 className="text-[0.8125rem] tracking-widest uppercase mb-4 text-[#1a1a1a]">Description</h3>
              <p className="text-[0.9375rem] leading-[1.8] text-[#666]">
                {product.description}
              </p>
            </div>

            <div>
              <h3 className="text-[0.8125rem] tracking-widest uppercase mb-4 text-[#1a1a1a]">Weight</h3>
              <p className="text-[0.9375rem] text-[#666]">100g</p>
            </div>

            <div>
              <h3 className="text-[0.8125rem] tracking-widest uppercase mb-4 text-[#1a1a1a]">Complete Ingredients List</h3>
              <p className="text-[0.9375rem] leading-[1.8] text-[#666]">
                Olive oil, coconut oil, shea butter, sunflower oil, sweet almond oil, lavender essential oil, eucalyptus oil, cedarwood oil. Perfectly balanced for a gentle bathing experience that is both refreshing and moisturizing.
              </p>
            </div>

            <div>
              <h3 className="text-[0.8125rem] tracking-widest uppercase mb-4 text-[#1a1a1a]">Shipping</h3>
              <p className="text-[0.9375rem] leading-[1.8] text-[#666]">
                We are happy to offer FREE SHIPPING on all orders over $99. For orders under $99, standard shipping is $9.95. Standard delivery takes 2-5 business days depending on your location. Express delivery option available at checkout.
              </p>
            </div>

            <div>
              <h3 className="text-[0.8125rem] tracking-widest uppercase mb-4 text-[#1a1a1a]">Returns</h3>
              <p className="text-[0.9375rem] leading-[1.8] text-[#666]">
                We are happy if you are happy. If you are not satisfied with your purchase in any way, we will accept it for a full refund according to your original payment method within 30 days of purchase. Please note that only unused products will be accepted for return. Return shipping costs are the responsibility of the customer.
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-32 pt-16 border-t border-[#e5e5e0]">
        <h2
          className="text-[2.5rem] lg:text-[3rem] tracking-tight mb-12"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          You May Also Like
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {recommendedProducts.map((item) => (
            <Link
              key={item.id}
              to={`/product/${item.id}`}
              className="group flex gap-6"
            >
              <div className="w-32 h-32 bg-white flex-shrink-0 overflow-hidden">
                <ImageWithFallback
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[0.75rem] tracking-widest uppercase text-[#999] mb-1">
                  {item.category}
                </p>
                <h3
                  className="text-[1.5rem] tracking-tight mb-2"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {item.name}
                </h3>
                <p className="text-[1rem]">{item.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-32 pt-16 border-t border-[#e5e5e0]">
        <h2
          className="text-[2.5rem] lg:text-[3rem] tracking-tight mb-12"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Customer Reviews
        </h2>

        <div className="mb-16 pb-12 border-b border-[#e5e5e0]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5"
                    fill="#1a1a1a"
                    stroke="#1a1a1a"
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <p className="text-[2rem] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                4.7 out of 5
              </p>
              <p className="text-[0.875rem] text-[#666]">Based on 68 reviews</p>
            </div>

            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = stars === 5 ? 52 : stars === 4 ? 14 : stars === 3 ? 2 : 0;
                const percentage = (count / 68) * 100;
                return (
                  <div key={stars} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-[0.875rem] text-[#666]">{stars}</span>
                      <Star className="w-3 h-3" fill="#c9a87c" stroke="none" />
                    </div>
                    <div className="flex-1 h-2 bg-[#f0f0f0]">
                      <div
                        className="h-full bg-[#c9a87c] transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-[0.875rem] text-[#666] w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center lg:justify-end">
              <button className="px-8 py-3 border border-[#1a1a1a] text-[0.875rem] tracking-wide transition-all hover:bg-[#1a1a1a] hover:text-white">
                Write a Review
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8 mb-12">
          {reviews.map((review) => (
            <div key={review.id} className="pb-8 border-b border-[#e5e5e0] last:border-0">
              <div className="flex items-center gap-2 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4"
                    fill={i < review.rating ? '#1a1a1a' : 'none'}
                    stroke={i < review.rating ? '#1a1a1a' : '#e5e5e0'}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <div className="flex items-baseline gap-3 mb-3">
                <h4 className="text-[1rem]">{review.name}</h4>
                <span className="text-[0.8125rem] text-[#999]">{review.date}</span>
              </div>
              <p className="text-[0.9375rem] leading-relaxed text-[#666]">
                {review.comment}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-2 transition-opacity hover:opacity-60 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {[...Array(totalPages)].map((_, i) => {
            const page = i + 1;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 text-[0.9375rem] transition-all ${
                  currentPage === page
                    ? 'bg-[#e5e5e0] text-[#1a1a1a]'
                    : 'text-[#666] hover:bg-[#f5f5f3]'
                }`}
              >
                {page}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-2 transition-opacity hover:opacity-60 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
      </section>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
