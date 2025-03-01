/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.BACKEND_API ? undefined : "export",
}

if (process.env.BACKEND_API) {
  nextConfig.rewrites = async () => {
      return [
          {
              source: '/api/:path*',
              destination: `${process.env.BACKEND_API}/:path*`
          }
      ]
  }
}

module.exports = nextConfig
