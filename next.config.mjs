/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // The results file is read at runtime with fs, so make sure deployments ship it.
  outputFileTracingIncludes: { "/**": ["./data/**"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
export default nextConfig;
