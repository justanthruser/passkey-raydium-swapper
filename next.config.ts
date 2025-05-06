import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '3000-idx-studio-1746440345675.cluster-oayqgyglpfgseqclbygurw4xd4.cloudworkstations.dev',
  ],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
