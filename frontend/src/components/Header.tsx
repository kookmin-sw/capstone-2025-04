// src/components/Header.tsx
"use client";
import Link from "next/link";
import React, { useState, useEffect } from "react"; // Import useState, useEffect
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
          <Link
            href="/submissions"
            className="font-medium text-gray-600 relative hover:text-primary transition-colors duration-200 hover:after:content-[''] hover:after:absolute hover:after:bottom-[-0.5rem] hover:after:left-0 hover:after:w-full hover:after:h-0.5 hover:after:bg-primary hover:after:rounded-sm"
          >
            제출 현황
          </Link>

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
