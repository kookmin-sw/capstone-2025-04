import Head from "next/head";

import Features from "../components/Features";
import ProblemExample from "../components/ProblemExample";
import Banner from "@/components/Banner";
import Header from "@/components/Header";
import Footer from "../components/Footer";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>ALPACO | Capstone Project 2025-04</title>
        <meta
          name="description"
          content="ALPACO - Capstone project application"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4">
          <section className="py-20 text-center bg-white rounded-lg shadow-sm my-8">
            <Banner />
            <div className="flex gap-4 justify-center">
              <Link
                href="/coding-test"
                className="bg-primary text-white py-2 px-4 rounded-md font-medium transition-colors duration-200 hover:bg-primary-hover"
              >
                테스트 시작하기
              </Link>
              <Link
                href="https://kookmin-sw.github.io/capstone-2025-04/"
                className="bg-transparent border border-gray-300 py-2 px-4 rounded-md font-medium transition-all duration-200 hover:bg-gray-100"
              >
                더 알아보기
              </Link>
            </div>
          </section>

          <section className="py-16 bg-white rounded-lg shadow-sm my-8">
            <h2 className="text-3xl font-semibold text-center mb-10 text-gray-900 relative after:content-[''] after:absolute after:bottom-[-0.75rem] after:left-1/2 after:-translate-x-1/2 after:w-[60px] after:h-[3px] after:bg-primary after:rounded-md">
              주요 기능
            </h2>
            <Features />
          </section>

          <section className="py-16 bg-white rounded-lg shadow-sm my-8 mb-16">
            <h2 className="text-3xl font-semibold text-center mb-10 text-gray-900 relative after:content-[''] after:absolute after:bottom-[-0.75rem] after:left-1/2 after:-translate-x-1/2 after:w-[60px] after:h-[3px] after:bg-primary after:rounded-md">
              문제 예시
            </h2>
            <ProblemExample />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
