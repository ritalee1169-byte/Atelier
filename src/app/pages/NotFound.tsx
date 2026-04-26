import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

export function NotFound() {
  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center px-6">
      <div className="text-center max-w-[600px]">
        <h1
          className="text-[8rem] lg:text-[12rem] tracking-tight leading-none mb-4 opacity-20"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          404
        </h1>
        <h2
          className="text-[2.5rem] lg:text-[3.5rem] tracking-tight mb-6"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Page Not Found
        </h2>
        <p className="text-[1.125rem] text-[#666] mb-12 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[0.9375rem] tracking-wide border-b border-[#1a1a1a] pb-1 transition-opacity hover:opacity-60"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
