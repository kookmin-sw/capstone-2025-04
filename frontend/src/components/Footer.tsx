// frontend/src/components/Footer.tsx
"use client";
import Link from "next/link";
import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-300 py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-primary mb-4">ALPACO</div>
          <nav className="flex justify-center flex-wrap mb-6">
            <Link
              href="/terms"
              className="text-gray-600 mx-4 transition-colors duration-200 hover:text-primary"
            >
              이용약관
            </Link>
            <Link
              href="/privacy"
              className="text-gray-600 mx-4 transition-colors duration-200 hover:text-primary"
            >
              개인정보 처리방침
            </Link>
            <Link
              href="/faq"
              className="text-gray-600 mx-4 transition-colors duration-200 hover:text-primary"
            >
              FAQ/문의
            </Link>
          </nav>
          <div className="h-px bg-gray-300 w-4/5 max-w-[600px] my-4"></div>
          <p className="text-gray-600 text-sm text-center">
            &copy; {new Date().getFullYear()} ALPACO. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
