// src/app/callback/page.tsx
"use client";

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation"; // useSearchParams 추가
import { useAuthenticator } from "@aws-amplify/ui-react";

const CallbackPage = () => {
  const { route } = useAuthenticator((context) => [context.route]);
  const router = useRouter();
  const searchParams = useSearchParams(); // URL 파라미터 읽기

  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      // Cognito에서 에러 파라미터와 함께 리디렉션된 경우
      console.error("Cognito Auth Error:", error, errorDescription);
      // 에러 메시지를 표시하거나 로그인 페이지로 다시 보낼 수 있습니다.
      // alert(`인증 오류: ${errorDescription || error}`); // 사용자에게 간단히 알림
      router.push(
        "/login?error=" + encodeURIComponent(errorDescription || error),
      ); // 에러 정보를 가지고 로그인 페이지로
      return; // 리디렉션 후에는 더 이상 진행하지 않음
    }

    // Amplify가 URL 처리를 완료하고 상태를 업데이트하면,
    // useAuthenticator 훅이 변경된 상태(authenticated)를 받음
    if (route === "authenticated") {
      // 인증 성공 시 홈페이지로 리디렉션
      console.log("Authentication successful, redirecting to home...");
      router.push("/");
    } else {
      // 아직 처리 중이거나 다른 상태일 경우 (예: 'signIn')
      // 여기에 특별한 처리가 필요 없을 수도 있습니다. Amplify가 상태를 변경할 때까지 기다립니다.
      console.log(
        "Waiting for authentication status change. Current route:",
        route,
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, router]); // searchParams는 useEffect의 의존성 배열에 넣지 않아도 됨 (최초 로드 시 한 번만 읽음)

  // 에러가 없고 아직 인증되지 않은 경우 로딩 표시
  if (!searchParams.get("error") && route !== "authenticated") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold">인증 처리 중...</p>
          {/* 로딩 스피너 등 추가 */}
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mt-4"></div>
        </div>
      </div>
    );
  }

  // 에러가 있거나 이미 인증된 경우 (리디렉션이 발생하기 전 잠깐 동안) null 반환
  return null;
};

export default CallbackPage;
