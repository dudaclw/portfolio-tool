import type { NextConfig } from 'next';

const configuracao: NextConfig = {
  reactStrictMode: true,
  // `NEXT_DIST_DIR` deixa o roteiro de aceite (npm run test:e2e) compilar numa pasta própria,
  // sem atrapalhar o `npm run dev` que estiver rodando.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default configuracao;
