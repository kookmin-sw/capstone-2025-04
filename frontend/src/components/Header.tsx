// src/components/Header.tsx
"use client";
import Link from "next/link";
import React, { useState, useEffect, useRef } from "react"; // Added useRef
import { useAuthenticator } from "@aws-amplify/ui-react"; // Import the hook
import { fetchAuthSession } from "aws-amplify/auth"; // Import fetchAuthSession
import { fetchUserAttributes } from "aws-amplify/auth"; // Import fetchUserAttributes back
import { useRouter } from "next/navigation"; // 리디렉션을 위한 useRouter 추가

import AlpacoLogo from "./AlpacoLogo";
import AlpacoWordLogo from "./AlpacoWordLogo";

// 로컬 스토리지 키
const NICKNAME_STORAGE_KEY = "alpaco_user_nickname";

const Header: React.FC = () => {
  const router = useRouter(); // 라우터 인스턴스 생성
  // Optimize: Select only the states needed by the Header
  const { user, signOut, authStatus } = useAuthenticator((context) => [
    context.user,
    context.signOut,
    context.authStatus, // Still need route to determine if authenticated
  ]);
  const isAuthenticated = authStatus === "authenticated";
  console.log("context: ", user, authStatus); // Debugging line

  const [nickname, setNickname] = useState<string | null>(() => {
    // 브라우저 환경에서만 로컬 스토리지 접근
    if (typeof window !== "undefined") {
      const savedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY);
      return savedNickname;
    }
    return null;
  });
  const [isNicknameChecked, setIsNicknameChecked] = useState<boolean>(false);
  const [shouldRedirect, setShouldRedirect] = useState<boolean>(false);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false); // Added state for mobile menu
  const menuRef = useRef<HTMLDivElement>(null); // Ref for click outside handling
  const hamburgerRef = useRef<HTMLButtonElement>(null); // Ref for hamburger button

  // 메뉴 열기/닫기 핸들러
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // 메뉴 닫기 핸들러
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // 링크 클릭 핸들러 - 모바일 메뉴를 닫고 페이지 이동
  const handleLinkClick = (href: string) => {
    closeMenu();
    router.push(href);
  };

  // 닉네임이 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    if (!isInitialLoad && nickname && typeof window !== "undefined") {
      localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
    }
  }, [nickname, isInitialLoad]);

  // 로그아웃 시 로컬 스토리지에서 닉네임 제거
  useEffect(() => {
    if (!isAuthenticated && typeof window !== "undefined") {
      localStorage.removeItem(NICKNAME_STORAGE_KEY);
    }
  }, [isAuthenticated]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // 햄버거 버튼이나 메뉴 자체를 클릭한 경우에는 무시
      if (
        (hamburgerRef.current && hamburgerRef.current.contains(event.target as Node)) ||
        (menuRef.current && menuRef.current.contains(event.target as Node))
      ) {
        return;
      }
      closeMenu();
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchAttributesFromToken = async () => {
      if (isAuthenticated) {
        try {
          // Try to get user attributes safely
          try {
            const userAttributes = await fetchUserAttributes();
            console.log("User Attributes:", userAttributes); // Debug: See what's in the attributes

            // Set nickname if available
            if (userAttributes.nickname) {
              setNickname(userAttributes.nickname);
              setIsNicknameChecked(true);
              setShouldRedirect(false); // 닉네임이 있으면 리디렉션하지 않음
            } else {
              // 닉네임이 없는 경우에만 리디렉션 필요
              setNickname(null);
              setIsNicknameChecked(true);
              setShouldRedirect(true);
            }
          } catch (attrError) {
            console.warn("Could not fetch user attributes:", attrError);
            // Continue with the flow, we'll just use what we have from the token

            // Fallback to token if we couldn't get attributes
            const session = await fetchAuthSession();
            const idTokenPayload = session.tokens?.idToken?.payload;
            console.log("ID Token Payload:", idTokenPayload); // Debug: See what's in the token

            // 닉네임 체크 완료 표시
            setIsNicknameChecked(true);

            // 토큰에서 nickname 확인
            if (idTokenPayload && typeof idTokenPayload.nickname === "string") {
              setNickname(idTokenPayload.nickname);
              setShouldRedirect(false);
            } else {
              // 토큰에도 nickname이 없으면 리디렉션 필요
              setShouldRedirect(true);
            }
          }
        } catch (error) {
          console.error(
            "Error fetching auth session or parsing ID token:",
            error,
          );
          setNickname(null);
          // 에러가 발생해도 체크는 완료된 것으로 표시
          setIsNicknameChecked(true);
          setShouldRedirect(false); // 에러 상황에서는 리디렉션하지 않음
        }

        // 초기 로드 완료
        setIsInitialLoad(false);
      } else {
        setNickname(null);
        setIsNicknameChecked(true);
        setShouldRedirect(false);
        setIsInitialLoad(false);
      }
    };

    fetchAttributesFromToken();
  }, [isAuthenticated]); // Re-run only when auth status changes

  // 닉네임이 없는 경우 설정 페이지로 리디렉션
  useEffect(() => {
    if (isAuthenticated && isNicknameChecked && shouldRedirect) {
      const currentPath = window.location.pathname;
      // 이미 설정 페이지에 있거나 콜백 페이지인 경우에는 리디렉션하지 않음
      if (
        currentPath !== "/user/settings" &&
        !currentPath.includes("/auth/callback")
      ) {
        console.log("리디렉션: 닉네임이 없어서 설정 페이지로 이동합니다.");
        router.push("/user/settings");
      }
    }
  }, [isAuthenticated, isNicknameChecked, shouldRedirect, router]);

  // Function to get user identifier (e.g., email or username)
  const getUserIdentifier = () => {
    // Use nickname if available
    if (nickname) return nickname;

    // 닉네임이 없으면 '사용자'로 표시
    return "사용자";
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

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6 items-center">
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
          {isAuthenticated && (
            <Link
              href="/storage"
              className="font-medium text-gray-600 relative hover:text-primary transition-colors duration-200 hover:after:content-[''] hover:after:absolute hover:after:bottom-[-0.5rem] hover:after:left-0 hover:after:w-full hover:after:h-0.5 hover:after:bg-primary hover:after:rounded-sm"
            >
              내 저장소
            </Link>
          )}
          <Link
            href="/submissions"
            className="font-medium text-gray-600 relative hover:text-primary transition-colors duration-200 hover:after:content-[''] hover:after:absolute hover:after:bottom-[-0.5rem] hover:after:left-0 hover:after:w-full hover:after:h-0.5 hover:after:bg-primary hover:after:rounded-sm"
          >
            제출 현황
          </Link>

          {/* Auth Buttons / User Info - Desktop */}
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  {getUserIdentifier()}님
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
                onClick={signOut}
                className="font-medium text-gray-600 relative hover:text-primary transition-colors duration-200 hover:after:content-[''] hover:after:absolute hover:after:bottom-[-0.5rem] hover:after:left-0 hover:after:w-full hover:after:h-0.5 hover:after:bg-primary hover:after:rounded-sm break-words"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="font-medium text-gray-600 relative hover:text-primary transition-colors duration-200 hover:after:content-[''] hover:after:absolute hover:after:bottom-[-0.5rem] hover:after:left-0 hover:after:w-full hover:after:h-0.5 hover:after:bg-primary hover:after:rounded-sm break-words"
            >
              로그인
            </Link>
          )}
        </nav>

        {/* Mobile Hamburger Button */}
        <button 
          ref={hamburgerRef}
          className="md:hidden flex items-center" 
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={1.5} 
            stroke="currentColor" 
            className="w-6 h-6 text-gray-700"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d={isMenuOpen 
                ? "M6 18L18 6M6 6l12 12" // X icon when open
                : "M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" // Hamburger icon when closed
              } 
            />
          </svg>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div 
          ref={menuRef}
          className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg z-20 px-4 py-2 border-t border-gray-200 animate-slide-down"
        >
          <div className="flex flex-col">
            {/* Mobile Navigation Links */}
            <button 
              onClick={() => handleLinkClick('/community')}
              className="text-left font-medium text-gray-600 block py-2 hover:text-primary transition-colors duration-200"
            >
              커뮤니티
            </button>
            <button 
              onClick={() => handleLinkClick('/coding-test')}
              className="text-left font-medium text-gray-600 block py-2 hover:text-primary transition-colors duration-200"
            >
              코딩 테스트
            </button>
            {isAuthenticated && (
              <button 
                onClick={() => handleLinkClick('/storage')}
                className="text-left font-medium text-gray-600 block py-2 hover:text-primary transition-colors duration-200"
              >
                내 저장소
              </button>
            )}
            <button 
              onClick={() => handleLinkClick('/submissions')}
              className="text-left font-medium text-gray-600 block py-2 hover:text-primary transition-colors duration-200"
            >
              제출 현황
            </button>

            {/* Auth Buttons / User Info - Mobile */}
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => handleLinkClick('/user/settings')}
                  className="text-left font-medium text-gray-700 block py-2 hover:text-primary transition-colors duration-200"
                >
                  {getUserIdentifier()}님
                </button>
                <button 
                  onClick={() => handleLinkClick('/user/settings')}
                  className="text-left font-medium text-gray-600 block py-2 hover:text-primary transition-colors duration-200"
                >
                  설정
                </button>
                <button
                  onClick={() => {
                    closeMenu();
                    signOut();
                  }}
                  className="text-left font-medium text-gray-600 block py-2 hover:text-primary transition-colors duration-200"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button 
                onClick={() => handleLinkClick('/auth/login')}
                className="text-left font-medium text-gray-600 block py-2 hover:text-primary transition-colors duration-200"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
