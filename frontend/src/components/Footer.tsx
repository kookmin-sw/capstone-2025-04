// frontend/src/components/Footer.tsx
"use client";
import Link from "next/link";
import React from "react";
import styles from "../styles/components/Footer.module.css";

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.container} container`}>
        <div className={styles.content}>
          <div className={styles.logo}>ALPACO</div>
          <nav className={styles.navigation}>
            <Link href="/terms" className={styles.navLink}>
              이용약관
            </Link>
            <Link href="/privacy" className={styles.navLink}>
              개인정보 처리방침
            </Link>
            <Link href="/faq" className={styles.navLink}>
              FAQ/문의
            </Link>
          </nav>
          <div className={styles.divider}></div>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} ALPACO. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
