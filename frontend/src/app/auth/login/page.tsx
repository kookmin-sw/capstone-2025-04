// src/app/login/page.tsx
"use client";

import React from "react";
import Image from "next/image";
import Head from "next/head";
import { useRouter } from "next/navigation";
import SimpleHeader from "@/components/SimpleHeader";
import Footer from "@/components/Footer";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { signInWithRedirect } from "aws-amplify/auth";
import "@aws-amplify/ui-react/styles.css"; // Ensure styles are imported

const LoginPageContent = () => {
  const { route } = useAuthenticator((context) => [context.route]);
  const router = useRouter();

  // Redirect to home if already authenticated
  React.useEffect(() => {
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
      });
    } catch (error) {
      console.error("Google Sign-In Error:", error);
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

// Wrap the content to ensure Authenticator context is available
const LoginPage = () => {
  return <LoginPageContent />;
};

export default LoginPage;
