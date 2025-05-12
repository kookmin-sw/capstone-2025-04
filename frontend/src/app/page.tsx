"use client";

import Head from "next/head";
import { motion } from "framer-motion";

import Features from "@/components/Features";
import ProblemExample from "@/components/ProblemExample";
import Banner from "@/components/Banner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Head>
        <title>ALPACO | Capstone Project 2025-04</title>
        <meta
          name="description"
          content="ALPACO - Capstone project application"
        />
      </Head>

      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow relative bg-gradient-to-b from-primary-300 via-primary-100 to-background">
          
          <div className="w-full px-4 mx-auto max-w-7xl">
            <motion.section
              className="pt-16 pb-10 px-16 text-center bg-white rounded-lg shadow-sm my-8 border-t-8 border-t-primary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Banner />
            </motion.section>

            <motion.section
              className="pt-4 my-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <motion.h2
                className="text-3xl font-semibold text-center mb-16 text-gray-900 relative after:content-[''] after:absolute after:bottom-[-0.75rem] after:left-1/2 after:-translate-x-1/2 after:w-[60px] after:h-[3px] after:bg-primary after:rounded-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                주요 기능
              </motion.h2>
              <Features />
            </motion.section>

            <motion.section
              className="pt-8 my-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ProblemExample />
            </motion.section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
