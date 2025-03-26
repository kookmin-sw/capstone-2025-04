import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export", // 정적 사이트 생성 (S3 배포 가능)
  trailingSlash: true, // S3 호환을 위해 URL 끝에 슬래시 추가
  reactStrictMode: true,
};

export default nextConfig;
