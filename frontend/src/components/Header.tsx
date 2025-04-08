// src/components/Header.tsx
"use client";
import Link from "next/link";
import React from "react";
import Image from "next/image";
import { useAuthenticator } from "@aws-amplify/ui-react"; // Import the hook

import { fetchAuthSession } from "aws-amplify/auth";
const session = await fetchAuthSession({ forceRefresh: false });
const idToken = session.tokens?.idToken;

console.log("Session:", session); // Log the session to the console
console.log("ID Token:", idToken); // Log the ID token to the console

const Header: React.FC = () => {
  // Get authentication status and user details from the hook
  const { user, signOut, route } = useAuthenticator((context) => [
    context.user,
    context.signOut,
    context.route,
  ]);
  const isAuthenticated = route === "authenticated";

  return (
    <header className="bg-white py-4 sticky top-0 z-10 shadow-md">
      <div className="w-full px-4 mx-auto max-w-7xl flex justify-between items-center">
        <div className="flex flex-row items-center text-primary transition-transform duration-200 hover:scale-105">
          <Link href="/" className="flex flex-row items-center gap-2">
            <Image
              src="/alpaco-logo.svg"
              alt="ALPACO"
              width={50}
              height={50}
              priority
            />
            <Image
              src="/alpaco-word-logo.svg"
              alt="ALPACO"
              width={150}
              height={50}
              priority
            />
          </Link>
        </div>
        <nav className="flex gap-6 items-center">
          {" "}
          {/* Added items-center */}
          <Link
            href="/community"
            className="font-medium text-gray-600 relative hover:text-primary transition-colors duration-200 hover:after:content-[''] hover:after:absolute hover:after:bottom-[-0.5rem] hover:after:left-0 hover:after:w-full hover:after:h-0.5 hover:after:bg-primary hover:after:rounded-sm"
          >
            커뮤니티
          </Link>
          <Link
            href="/coding-test"
            className="font-medium text-gray-600 relative hover:text-primary transition-colors duration-200 hover:after:content-[''] hover:after:absolute hover:after:bottom-[-0.5rem] hover:after:left-0 hover:after:w-full hover:after:h-0.5 hover:after:bg-primary hover:after:rounded-sm"
          >
            코딩 테스트
          </Link>
          {isAuthenticated && ( // Only show storage if authenticated
            <Link
              href="/storage"
              className="font-medium text-gray-600 relative hover:text-primary transition-colors duration-200 hover:after:content-[''] hover:after:absolute hover:after:bottom-[-0.5rem] hover:after:left-0 hover:after:w-full hover:after:h-0.5 hover:after:bg-primary hover:after:rounded-sm"
            >
              내 저장소
            </Link>
          )}
          {/* Conditional Login/Logout Button */}
          {isAuthenticated ? (
            <>
              <span className="text-sm text-gray-700 hidden md:inline">
                {/* Display user email if available */}
                {user?.signInDetails?.loginId || "사용자"}님
              </span>
              <button
                onClick={signOut}
                className="font-medium text-gray-600 relative hover:text-primary transition-colors duration-200 hover:after:content-[''] hover:after:absolute hover:after:bottom-[-0.5rem] hover:after:left-0 hover:after:w-full hover:after:h-0.5 hover:after:bg-primary hover:after:rounded-sm"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="font-medium text-gray-600 relative hover:text-primary transition-colors duration-200 hover:after:content-[''] hover:after:absolute hover:after:bottom-[-0.5rem] hover:after:left-0 hover:after:w-full hover:after:h-0.5 hover:after:bg-primary hover:after:rounded-sm"
            >
              로그인
            </Link>
          )}
          {/* Remove signup link as it's handled by Google login */}
          {/* <Link href="/signup" className="...">회원가입</Link> */}
        </nav>
      </div>
    </header>
  );
};

export default Header;
