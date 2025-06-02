// frontend/src/components/Footer.tsx
"use client";
import Link from "next/link";
import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
      <div className="w-full px-4 mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row items-center justify-center">
          <div className="text-lg font-bold text-primary mr-4">ALPACO</div>
          <nav className="flex justify-center flex-wrap">
            <Link
              href="/terms"
              className="text-gray-600 mx-2 text-sm transition-colors duration-200 hover:text-primary"
            >
              이용약관
            </Link>
            <span className="text-gray-300 mx-1">|</span>
            <Link
              href="/privacy"
              className="text-gray-600 mx-2 text-sm transition-colors duration-200 hover:text-primary"
            >
              개인정보 처리방침
            </Link>
            <span className="text-gray-300 mx-1">|</span>
            <Link
              href="/faq"
              className="text-gray-600 mx-2 text-sm transition-colors duration-200 hover:text-primary"
            >
              FAQ/문의
            </Link>
            <span className="text-gray-300 mx-1">|</span>
            <Link
              href="/license"
              className="text-gray-600 mx-2 text-sm transition-colors duration-200 hover:text-primary"
            >
              라이센스
            </Link>
            <span className="text-gray-300 mx-1">|</span>
            <span className="text-gray-600 text-sm ml-2">
              © 2025 ALPACO Team
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
