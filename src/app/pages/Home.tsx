import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ArrowRight } from "lucide-react";

const featuredProducts = [
  {
    id: 1,
    name: "Rose Whisper",
    price: "$12",
    image: "https://images.unsplash.com/photo-1620567838728-6406c0366f30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    category: "Classic"
  },
  {
    id: 2,
    name: "Charcoal Cleanse",
    price: "$13",
    image: "https://images.unsplash.com/photo-1620567838672-a4a88a011a67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    category: "Deep Clean"
  },
  {
    id: 3,
    name: "Jasmine Garden",
    price: "$12",
    image: "https://images.unsplash.com/photo-1624459310096-78ea56ad7e05?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    category: "Soothing"
  }
];

export function Home() {
  return (
    <div>
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-16 pb-24">
        <div className="max-w-[720px]">
          <h1
            className="text-[4rem] lg:text-[6rem] leading-[0.95] tracking-tight mb-8"
            style={{
              fontFamily: 'var(--font-display)',
              animation: 'fadeInUp 0.8s ease-out'
            }}
          >
            Back to simple, back to nature
          </h1>
          <p
            className="text-[1.125rem] leading-relaxed text-[#666] mb-12 max-w-[520px]"
            style={{ animation: 'fadeInUp 0.8s ease-out 0.2s both' }}
          >
            Crafted with natural botanicals and traditional methods, bringing harmony and wellness to your skin and soul.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-[0.9375rem] tracking-wide border-b border-[#1a1a1a] pb-1 transition-opacity hover:opacity-60"
            style={{ animation: 'fadeInUp 0.8s ease-out 0.4s both' }}
          >
            Explore Collection
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 pb-32">
        <h2
          className="text-[2.5rem] lg:text-[3.5rem] tracking-tight mb-16"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Featured
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {featuredProducts.map((product, i) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="group"
              style={{ animation: `fadeInUp 0.6s ease-out ${0.1 * i}s both` }}
            >
              <div className="aspect-[3/4] bg-white mb-6 overflow-hidden">
                <ImageWithFallback
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[0.8125rem] tracking-widest uppercase text-[#999]">
                  {product.category}
                </p>
                <h3
                  className="text-[1.5rem] tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {product.name}
                </h3>
                <p className="text-[1rem]">{product.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-[#e5e5e0]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div className="order-2 lg:order-1">
              <h2
                className="text-[3rem] lg:text-[4rem] tracking-tight mb-8"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Our Belief
              </h2>
              <p className="text-[1.25rem] leading-[1.8] text-[#666] mb-6">
                We believe that true goodness is often quiet.
              </p>
              <p className="text-[1.0625rem] leading-[1.8] text-[#666]">
                No complicated formulas, no flashy claims. Just pure, gentle, and trustworthy handmade soap — crafted with care to bring comfort to your skin.
              </p>
            </div>
            <div className="aspect-square bg-[#faf5f0] order-1 lg:order-2">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1761864293818-603c23655cee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
                alt="Natural spa ingredients"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 py-32 border-t border-[#e5e5e0]">
        <h2
          className="text-[2.5rem] lg:text-[3.5rem] tracking-tight mb-20 text-center"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          What Makes Us Different
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
          <div className="space-y-6">
            <div className="aspect-[4/3] bg-white">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1773565744218-d8d11de58362?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
                alt="Natural ingredients"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-3">
              <h3
                className="text-[1.5rem] tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Natural First
              </h3>
              <p className="text-[0.9375rem] leading-[1.8] text-[#666]">
                Plant-based oils and natural ingredients bring your skin back to its comfortable balance.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="aspect-[4/3] bg-white">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1768235146410-2c5196dfe48c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
                alt="Handcrafted soap"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-3">
              <h3
                className="text-[1.5rem] tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Cold-Process Craft
              </h3>
              <p className="text-[0.9375rem] leading-[1.8] text-[#666]">
                Slow saponification and curing preserve moisture and create a delicate lather.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="aspect-[4/3] bg-white">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1620567838728-6406c0366f30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
                alt="Minimal formula"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-3">
              <h3
                className="text-[1.5rem] tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Minimal Formula
              </h3>
              <p className="text-[0.9375rem] leading-[1.8] text-[#666]">
                Simplified recipes with fewer additives, so even sensitive skin can feel at ease.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#e5e5e0] bg-[#f9f7f4]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
            <div className="lg:col-span-2 aspect-[3/4] bg-white">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1508759073847-9ca702cec7d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
                alt="Natural soap experience"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="lg:col-span-3 space-y-12">
              <h2
                className="text-[2.5rem] lg:text-[3.5rem] tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                The Experience
              </h2>

              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-[#1a1a1a] rounded-full mt-3 flex-shrink-0"></div>
                  <p className="text-[1.125rem] leading-[1.8] text-[#666]">
                    Fine lather, clean rinse
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-[#1a1a1a] rounded-full mt-3 flex-shrink-0"></div>
                  <p className="text-[1.125rem] leading-[1.8] text-[#666]">
                    No tightness after wash, softer touch
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-[#1a1a1a] rounded-full mt-3 flex-shrink-0"></div>
                  <p className="text-[1.125rem] leading-[1.8] text-[#666]">
                    Natural fragrance, subtle and calm
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1546762013-ee3f13d5ebe4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920"
            alt="Southwest China landscape"
            className="w-full h-full object-cover"
            style={{ filter: 'saturate(0.6) brightness(0.85)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/50"></div>
        </div>

        <div className="relative z-10 max-w-[900px] mx-auto px-6 lg:px-12 text-center text-white">
          <h2
            className="text-[3.5rem] lg:text-[5rem] tracking-tight mb-8"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Our Story
          </h2>
          <p className="text-[1.25rem] lg:text-[1.5rem] leading-[1.8] mb-8 opacity-95 font-light">
            We come from Southwest China, a region renowned as the Kingdom of Plants.
          </p>
          <p className="text-[1.125rem] lg:text-[1.25rem] leading-[1.8] opacity-90 max-w-[700px] mx-auto font-light">
            Natural, botanical, and healing define who we are. Each bar of soap embodies nature's gifts, blending traditional craftsmanship with modern aesthetics to deliver pure care for your skin.
          </p>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 py-32 border-t border-[#e5e5e0]">
        <div className="max-w-[680px] mx-auto text-center">
          <h2
            className="text-[2.5rem] lg:text-[3.5rem] tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Track Your Order
          </h2>
          <p className="text-[1.0625rem] leading-[1.8] text-[#666] mb-8">
            Enter your email address to check your order status
          </p>
          <form className="max-w-[480px] mx-auto mb-8" onSubmit={(e) => e.preventDefault()}>
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 bg-white border border-[#e5e5e0] focus:outline-none focus:border-[#1a1a1a] transition-colors"
              />
              <button
                type="submit"
                className="px-8 py-3 bg-[#1a1a1a] text-white text-[0.9375rem] tracking-wide transition-opacity hover:opacity-90 whitespace-nowrap"
              >
                Track Order
              </button>
            </div>
          </form>
        </div>
      </section>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
