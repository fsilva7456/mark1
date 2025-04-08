import React, { useState, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Assuming you might use an Image component for the logo
import { AuthContext } from '../contexts/AuthContext';
import { ProjectContext } from '../contexts/ProjectContext';
import styles from '../styles/Header.module.css'; // We'll create this file next
import { MenuIcon, UserCircleIcon, BellIcon, XIcon } from '@heroicons/react/outline'; // Example using Heroicons

const Header = ({ isMenuOpen, toggleMenu }) => {
  const { user, logout } = useContext(AuthContext);
  const { currentProject } = useContext(ProjectContext);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <Link href={currentProject ? "/" : "/"} passHref> {/* Adjust link as needed */}
          <a className={styles.logo}>
            {/* Replace with your actual logo/name */}
            {/* <Image src="/logo.png" alt="Mark1 Logo" width={30} height={30} /> */}
            <span>Mark1</span>
          </a>
        </Link>
        {currentProject && (
          <span className={styles.projectName}>Project: {currentProject.name}</span>
        )}
      </div>
      <div className={styles.rightSection}>
        <div className={styles.iconWrapper}>
          <BellIcon className={styles.icon} />
          {/* Add notification count logic here if needed */}
        </div>
        <div className={`${styles.iconWrapper} ${styles.userProfile}`} onClick={() => setShowUserDropdown(!showUserDropdown)}>
          <UserCircleIcon className={styles.icon} />
          {showUserDropdown && (
            <div className={styles.userDropdown}>
              {/* Add Account Settings link later */}
              {/* <Link href="/account-settings"><a>Account Settings</a></Link> */}
              <button onClick={logout}>Logout</button>
            </div>
          )}
        </div>
        <div className={styles.iconWrapper} onClick={toggleMenu}>
          {isMenuOpen ? (
            <XIcon className={styles.icon} />
          ) : (
            <MenuIcon className={styles.icon} />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 