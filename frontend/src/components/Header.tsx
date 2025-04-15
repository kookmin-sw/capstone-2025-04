// src/components/Header.tsx
"use client";
import Link from "next/link";
import React, { useState, useEffect } from "react"; // Import useState, useEffect
import { useAuthenticator } from "@aws-amplify/ui-react"; // Import the hook
import { fetchAuthSession } from "aws-amplify/auth"; // Import fetchAuthSession

import AlpacoLogo from "./AlpacoLogo";
import AlpacoWordLogo from "./AlpacoWordLogo";

const Header: React.FC = () => {
  // Optimize: Select only the states needed by the Header
  const { user, signOut, authStatus } = useAuthenticator((context) => [
    context.user,
    context.signOut,
    context.authStatus, // Still need route to determine if authenticated
  ]);
  const isAuthenticated = authStatus === "authenticated";
  console.log("context: ", user, authStatus); // Debugging line

  const [givenName, setGivenName] = useState<string | null>(null); // State for given_name

  useEffect(() => {
    const fetchAttributesFromToken = async () => {
      if (isAuthenticated) {
        try {
          const session = await fetchAuthSession();
          const idTokenPayload = session.tokens?.idToken?.payload;
          console.log("ID Token Payload:", idTokenPayload); // Debug: See what's in the token
          if (idTokenPayload && typeof idTokenPayload.given_name === "string") {
            setGivenName(idTokenPayload.given_name);
          } else {
            // Fallback or handle missing attribute
            console.warn("given_name not found in ID token payload.");
            setGivenName(null); // Explicitly set to null if not found
          }
        } catch (error) {
          console.error(
            "Error fetching auth session or parsing ID token:",
            error
          );
          setGivenName(null);
        }
      } else {
        setGivenName(null); // Clear name when not authenticated
      }
    };

    fetchAttributesFromToken();
  }, [isAuthenticated]); // Re-run only when auth status changes

  // Function to get user identifier (e.g., email or username)
  const getUserIdentifier = () => {
    // Prioritize fetched given_name from state
    if (givenName) return givenName;

    // Fallback logic if given_name is not available or not fetched yet
    if (!user) return "사용자";
    console.log("user (fallback): ", user); // Debugging line for fallback

    return user.signInDetails?.loginId || user.username || "사용자";
  };

  return (
    <header className="bg-white py-4 sticky top-0 z-10 shadow-md">
      <div className="w-full px-4 mx-auto max-w-7xl flex justify-between items-center">
        {/* Logo */}
        <div className="flex flex-row items-center text-primary transition-transform duration-200 hover:scale-105">
          <Link href="/" className="flex flex-row items-center gap-2">
            <AlpacoLogo height={40} />
            <AlpacoWordLogo height={30} />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex gap-6 items-center">
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

          {/* Auth Buttons / User Info */}
          {isAuthenticated ? (
            <>
              <span className="text-sm text-gray-700 hidden md:inline">
                {getUserIdentifier()}님 {/* Display user identifier */}
              </span>
              <button
                onClick={signOut} // Use the signOut function from the hook
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
        </nav>
      </div>
    </header>
  );
};

export default Header;
