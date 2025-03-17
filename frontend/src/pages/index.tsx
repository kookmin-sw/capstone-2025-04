import Head from "next/head";
import Header from "../components/header";
import Banner from "../components/banner";
import Features from "../components/Features";
import ProblemExample from "../components/ProblemExample";
import Footer from "../components/Footer";
import Link from "next/link";

import styles from "../styles/home.module.css";

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
        <div className="container">
          <section className={styles.hero}>
            <Banner />
            <div className={styles.heroButtons}>
              <Link href="/login" className="button button-primary">
                시작하기
              </Link>
              <Link
                href="https://kookmin-sw.github.io/capstone-2025-04/"
                className="button button-outline"
              >
                더 알아보기
              </Link>
            </div>
          </section>

          <section className={styles.featuresSection}>
            <h2 className={styles.featureTitle}>주요 기능</h2>
            <div className={styles.featureGrid}>
              <Features />
            </div>
          </section>

          <section className={styles.exampleSection}>
            <h2 className={styles.exampleHeader}>문제 예시</h2>
            <ProblemExample />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
