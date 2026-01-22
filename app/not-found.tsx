import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary text-text-primary p-4">
      <div className="text-center">
        <h1 className="text-9xl font-black text-white/5">404</h1>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <h2 className="text-3xl font-bold mb-4">Page Not Found</h2>
          <p className="text-text-secondary mb-8 max-w-md">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <Link
            href="/"
            className="pointer-events-auto btn btn-primary px-8 py-3 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
