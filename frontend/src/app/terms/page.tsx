import React from "react";
import Head from "next/head";
import Header from "../../components/header";
import Footer from "../../components/Footer";
import Link from "next/link";
import styles from "../../styles/terms.module.css";

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>이용약관 | ALPACO</title>
        <meta name="description" content="ALPACO 이용약관" />
      </Head>

      <Header />

      <main className="flex-grow">
        <div className={styles.termsContainer}>
          <div className={styles.termsHeader}>
            <h1 className={styles.termsTitle}>이용약관</h1>
            <Link href="/" className={styles.homeLink}>
              홈으로
            </Link>
          </div>

          <div className={styles.termsContent}>
            <div className={styles.termsSection}>
              <h2 className={styles.termsSectionTitle}>이용약관</h2>
              <p className={styles.termsParagraph}>
                약관
                {/* 추가적인 약관 내용을 여기에 계속해서 추가할 수 있습니다 */}
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsPage;
