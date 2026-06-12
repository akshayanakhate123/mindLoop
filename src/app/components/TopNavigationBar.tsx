"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import styles from "./TopNavigationBar.module.css";

export default function TopNavigationBar() {
  const pathname = usePathname();

  return (
    <nav className={styles.navbar} data-testid="top-nav-bar">
      <div className={styles.logo}>
        <Link href="/home">
          <Image 
            src="/owlly-icon.png" 
            alt="MINDLOOP Logo"
            width={40} 
            height={40} 
            className={styles.logoIcon}
            priority
          />
          <span className={styles.logoText}>MINDLOOP</span>
        </Link>
      </div>
      <div className={styles.links}>
        <Link href="/home" className={pathname === "/home" ? styles.active : ""}>
          Home
        </Link>
        <Link href="/insights" className={pathname === "/insights" ? styles.active : ""}>
          Insights
        </Link>
        <Link href="/profile" className={pathname === "/profile" ? styles.active : ""}>
          Profile
        </Link>
      </div>
    </nav>
  );
}
