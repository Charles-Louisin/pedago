import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// CSP : aucun script tiers ; les styles inline sont nécessaires à Next et aux animations.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.ufs.sh https://utfs.io",
  // Film du site : vidéos servies par UploadThing.
  "media-src 'self' https://*.ufs.sh https://utfs.io",
  "font-src 'self' data:",
  "connect-src 'self'" + (isDev ? " ws: http://localhost:*" : ""),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  // Importe uniquement les icônes utilisées (bundle plus léger).
  experimental: { optimizePackageImports: ["lucide-react"] },
  async headers() {
    return [
      {
        // Réponses de l'API relayées (JSON, PDF) : aucun script, affichables seulement dans un cadre de l'admin
        // (aperçu PDF d'un document avant validation).
        source: "/api/proxy/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/((?!api/proxy/).*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
