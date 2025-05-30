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
        <main className="flex-grow relative overflow-hidden">
          {/* Clean Modern Background with Morphing Animation */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-primary-25 to-slate-50">
            {/* Animated Gradient Overlay - More Dynamic */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-100/30 via-blue-200/20 to-indigo-100/25 animate-gradient-morph"></div>
            
            {/* Morphing Blob Shapes - Organic and Dynamic */}
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary-300/25 to-blue-400/20 animate-blob-morph"></div>
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-blue-200/25 to-primary-200/20 animate-blob-morph-reverse"></div>
            
            {/* Additional Morphing Elements for More Dynamic Feel */}
            <div className="absolute top-1/4 left-1/3 w-32 h-32 bg-gradient-to-r from-indigo-200/20 to-purple-200/15 rounded-full blur-2xl animate-pulse-morph"></div>
            <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-gradient-to-l from-primary-200/25 to-blue-300/20 rounded-full blur-xl animate-blob-morph" style={{animationDelay: '5s'}}></div>
            
            {/* Minimal Grid - Very Subtle */}
            <div className="absolute inset-0 opacity-[0.02]" style={{
              backgroundImage: `
                linear-gradient(to right, rgb(37, 99, 235, 0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgb(37, 99, 235, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '100px 100px'
            }}></div>
          </div>
          
          {/* Content */}
          <div className="relative z-[5] w-full px-4 mx-auto max-w-7xl">
            <motion.section
              className="pt-16 pb-10 px-8 md:px-16 text-center bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-blue-500/10 my-8 border border-white/20 relative overflow-hidden" 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Card Background Enhancement */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/90 to-blue-50/30 rounded-2xl"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-2xl"></div>
              
              <div className="relative z-10">
                <Banner />
              </div>
            </motion.section>

            <motion.section
              className="pt-4 my-8 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <motion.h2
                className="text-3xl font-semibold text-center mb-16 text-gray-900 relative after:content-[''] after:absolute after:bottom-[-0.75rem] after:left-1/2 after:-translate-x-1/2 after:w-[60px] after:h-[3px] after:bg-gradient-to-r after:from-blue-500 after:to-indigo-500 after:rounded-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                주요 기능
              </motion.h2>
              <Features />
            </motion.section>

            <motion.section
              className="pt-8 my-8 relative"
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
