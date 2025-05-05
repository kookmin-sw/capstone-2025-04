// src/components/Header.tsx
"use client";
import Link from "next/link";
import React, { useState, useEffect } from "react"; // Import useState, useEffect
import { useAuthenticator } from "@aws-amplify/ui-react"; // Import the hook
import { fetchAuthSession } from "aws-amplify/auth"; // Import fetchAuthSession
import { fetchUserAttributes } from "aws-amplify/auth"; // Import fetchUserAttributes back

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
  const [nickname, setNickname] = useState<string | null>(null); // State for nickname

  useEffect(() => {
    const fetchAttributesFromToken = async () => {
      if (isAuthenticated) {
        try {
          // Get data from session token first
          const session = await fetchAuthSession();
          const idTokenPayload = session.tokens?.idToken?.payload;
          console.log("ID Token Payload:", idTokenPayload); // Debug: See what's in the token
          
          if (idTokenPayload && typeof idTokenPayload.given_name === "string") {
            setGivenName(idTokenPayload.given_name);
          }
          
          // Try to get additional attributes safely
          try {
            const userAttributes = await fetchUserAttributes();
            console.log("User Attributes:", userAttributes); // Debug: See what's in the attributes
            
            // Set nickname if available
            if (userAttributes.nickname) {
              setNickname(userAttributes.nickname);
            }
          } catch (attrError) {
            console.warn("Could not fetch user attributes:", attrError);
            // Continue with the flow, we'll just use what we have from the token
          }
        } catch (error) {
          console.error(
            "Error fetching auth session or parsing ID token:",
            error
          );
          setGivenName(null);
          setNickname(null);
        }
      } else {
        setGivenName(null);
        setNickname(null);
      }
    };

    fetchAttributesFromToken();
  }, [isAuthenticated]); // Re-run only when auth status changes

  // Function to get user identifier (e.g., email or username)
  const getUserIdentifier = () => {
    // Prioritize nickname over given_name
    if (nickname) return nickname;
    if (givenName) return givenName;

    // Fallback logic if attributes are not available or not fetched yet
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 hidden md:inline">
                  {getUserIdentifier()}님 {/* Display user identifier */}
                </span>
                <Link 
                  href="/user/settings" 
                  className="text-gray-600 hover:text-primary transition-colors duration-200"
                  title="설정"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={1.5} 
                    stroke="currentColor" 
                    className="w-5 h-5"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" 
                    />
                  </svg>
                </Link>
              </div>
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
