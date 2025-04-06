// src/app/auth/login/page.tsx
"use client";

import React, { useEffect, Suspense } from "react"; // Import Suspense
import Image from "next/image";
import Head from "next/head";
import { useRouter, useSearchParams } from "next/navigation"; // Import useSearchParams
import SimpleHeader from "@/components/SimpleHeader"; // Corrected import path
import Footer from "@/components/Footer"; // Corrected import path
import { useAuthenticator } from "@aws-amplify/ui-react";
import { signInWithRedirect } from "aws-amplify/auth";

// Component to handle logic using hooks
const LoginPageContentInternal = () => {
  // Optimize: Only select the 'route' state we need for redirection logic
  const { route } = useAuthenticator((context) => [context.authStatus]);
  console.log("context: ", route); // Debugging line
  const router = useRouter();
  const searchParams = useSearchParams(); // Get URL search parameters
  const error = searchParams.get("error"); // Check for error parameter

  // Redirect to home if already authenticated
  useEffect(() => {
    if (route === "authenticated") {
      router.push("/");
    }
  }, [route, router]);

  // Show loading or null while redirecting or checking auth state
  if (route === "authenticated") {
    return null; // Or a loading indicator
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithRedirect({
        provider: "Google",
        // Optional: custom state can be passed if needed
        // customState: 'your_custom_state_here',
      });
      // Redirect happens automatically, no router.push needed here
    } catch (error) {
      console.error("Google Sign-In Redirect Error:", error);
      // Display error to user if needed, though Cognito errors usually come via callback
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Head>
        <title>로그인 | ALPACO</title>
        <meta name="description" content="ALPACO 로그인 페이지" />
      </Head>

      <SimpleHeader />

      <main className="flex-1 flex justify-center items-center">
        <div className="max-w-md w-full p-8 border border-gray-200 rounded-lg bg-white shadow-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1 text-gray-900">ALPACO</h1>
            <h2 className="text-base text-gray-600">로그인</h2>
          </div>

          {/* Display error message if present in URL */}
          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
              role="alert"
            >
              <strong className="font-bold">로그인 오류: </strong>
              <span className="block sm:inline">
                {decodeURIComponent(error)}
              </span>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 transition"
          >
            <Image
              width={20}
              height={20}
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5"
            />
            <span className="font-medium text-gray-700">
              Sign In with Google
            </span>
          </button>
          {/* Optional: Add other login methods or information here */}
        </div>
      </main>

      <Footer />
    </div>
  );
};

// Main component wrapping content in Suspense for useSearchParams
const LoginPage = () => {
  return (
    <Suspense fallback={<div>Loading Login...</div>}>
      {" "}
      {/* Add a basic fallback */}
      <LoginPageContentInternal />
    </Suspense>
  );
};

export default LoginPage;
