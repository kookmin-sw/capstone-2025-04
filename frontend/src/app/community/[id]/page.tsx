import React from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
// import styles from "@/styles/community.module.css";
import CommunityDetail from "./CommunityDetail"; // 클라이언트 컴포넌트를 불러옴

// 정적 경로 생성용 더미 데이터
const staticPosts = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];

// 정적 경로 생성 함수
export async function generateStaticParams() {
  return staticPosts.map((post) => ({
    id: post.id.toString(),
  }));
}

// Define proper type for page props
interface PageProps {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

// Update component signature to use the proper interface
const CommunityDetailPage = async ({ params }: PageProps) => {
  const { id } = await params;
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
