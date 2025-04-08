import React from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
// import styles from "@/styles/community.module.css";
import CommunityDetail from "./CommunityDetail"; // 클라이언트 컴포넌트를 불러옴

export const dynamicParams = false; // Add this line

// For static export with dynamic routes handled client-side,
// generateStaticParams should exist but return an empty array.
export async function generateStaticParams() {
  // Return an empty array because we don't know the post IDs at build time.
  // The actual data fetching happens client-side in CommunityDetail.tsx.
  return [];
}

// This page now acts as a simple layout wrapper for the client component
// It doesn't need to be async or handle params directly
const CommunityDetailPage = ({ params }: { params: { id: string } }) => {
  const { id } = params; // Get id from params provided by Next.js router
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>Community Detail</title>
      </Head>
      <Header />
      <main className="flex-grow">
        {/* 클라이언트 컴포넌트에 id 전달 */}
        <CommunityDetail id={id} />
      </main>
      <Footer />
    </div>
  );
};

export default CommunityDetailPage;
