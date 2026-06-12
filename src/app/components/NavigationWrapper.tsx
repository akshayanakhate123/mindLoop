"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import styles from "./NavigationWrapper.module.css";

export default function NavigationWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showSidebar = pathname !== "/" && pathname !== "/onboarding";

  return (
    <div className={showSidebar ? styles.withSidebar : styles.withoutSidebar}>
      {showSidebar && <Sidebar />}
      <main className={styles.main}>{children}</main>
    </div>
  );
}
