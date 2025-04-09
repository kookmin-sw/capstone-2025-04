// src/app/auth/callback/page.tsx
"use client";

import React, { useEffect, Suspense, useState } from "react";
import { Metadata } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { configureAmplify } from "@/utils/configureAmplify"; // 👈 꼭 import!

// Metadata for the page
export const metadata: Metadata = {
  title: "인증 처리 | ALPACO",
  description: "사용자 인증을 처리하는 페이지입니다.",
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="text-center">
      <p className="text-lg font-semibold">인증 처리 중...</p>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mt-4"></div>
    </div>
  </div>
);

const CallbackContentInternal = () => {
  const { route, user } = useAuthenticator((context) => [
    context.route,
    context.user,
  ]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [configured, setConfigured] = useState(false);
  console.log("context: ", route); // Debugging line
  console.log("user: ", user); // Debugging line
  console.log("configured: ", configured); // Debugging line

  useEffect(() => {
    configureAmplify(); // 👈 콜백 페이지에서 한 번 더 설정
    setConfigured(true);
  }, []);

  useEffect(() => {
    if (!configured) return;

    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      console.error(
        "Cognito Callback Error:",
        error,
        errorDescription || "(no description)"
      );
      router.replace(
        `/auth/login?error=${encodeURIComponent(errorDescription || error)}`
      );
      return;
    }

    if (user !== undefined || route === "authenticated") {
      console.log("Authentication successful via hook, redirecting to home...");
      router.replace("/");
      return;
    }
  }, [route, configured, router, searchParams, user]);

  if (
    !configured ||
    (route !== "authenticated" && !searchParams.get("error"))
  ) {
    return <LoadingSpinner />;
  }

  return null;
};

const CallbackPage = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CallbackContentInternal />
    </Suspense>
  );
};

export default CallbackPage;
