/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Phase 10: standalone server output for Docker/Amplify parity - the BFF
  // route handlers (app/api/**) ship with the standalone server bundle.
  output: "standalone",
}

export default nextConfig
