import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { useState, useEffect, useRef } from 'react';
import { FaHome, FaShoppingBag, FaLock, FaInfoCircle, FaEnvelope, FaComments } from 'react-icons/fa';
import crownLogo from '../assets/crown_logo_white.svg';
import BackgroundBeams from './BackgroundBeams';

const HeaderContainer = styled(motion.header)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 150px;
    background: linear-gradient(
      180deg,
      rgba(2, 6, 23, 0.95) 0%,
      rgba(2, 6, 23, 0.8) 25%,
      rgba(2, 6, 23, 0.4) 50%,
      rgba(2, 6, 23, 0.2) 75%,
      rgba(2, 6, 23, 0) 100%
    );
    pointer-events: none;
    z-index: -1;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      rgba(0, 102, 255, 0) 0%,
      rgba(0, 102, 255, 0.2) 25%,
      rgba(0, 102, 255, 0.4) 50%,
      rgba(0, 102, 255, 0.2) 75%,
      rgba(0, 102, 255, 0) 100%
    );
    z-index: -1;
  }
`;

const BlurOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(2, 6, 23, 0.3);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  opacity: 0;
  pointer-events: none;
  z-index: 100;
  transition: opacity 0.3s ease;

  &.active {
    opacity: 1;
    pointer-events: auto;
  }
`;

const HalftoneOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 150px;
  background-color: transparent;
  background-image: radial-gradient(transparent 1px, var(--dark-blue) 1px);
  background-size: 4px 4px;
  mask: linear-gradient(rgb(0, 0, 0) 60%, rgba(0, 0, 0, 0) 100%);
  opacity: 0.3;
  pointer-events: none;
  z-index: 99;
`;

const LogoLink = styled.a`
  display: flex;
  align-items: center;
  gap: 1rem;
  text-decoration: none;
  color: white;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.4));
  }
`;

const LogoIcon = styled.img`
  height: 32px;
  width: 32px;
`;

const Logo = styled.div`
  font-family: 'Designer', sans-serif;
  font-size: 1.5rem;
  font-weight: normal;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0;
  color: white;
`;

const HamburgerButton = styled(motion.button)`
  background: none;
  border: none;
  cursor: pointer;
  width: 32px;
  height: 32px;
  position: relative;
  z-index: 102;
  padding: 0;
`;

const HamburgerLine = styled(motion.span)`
  display: block;
  width: 24px;
  height: 2px;
  background: white;
  margin: 5px auto;
`;

const MenuOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  width: auto;
  height: auto;
  background: transparent;
  overflow: hidden;
  z-index: 101;
  padding: 5rem 2rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const MenuItem = styled(motion.a)`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  color: white;
  text-decoration: none;
  font-family: 'Avenir Next', sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.5rem;
  position: relative;
  z-index: 2;
  transition: all 0.2s ease;
  cursor: pointer;
  opacity: 0.8;

  svg {
    font-size: 0.8rem;
  }

  &:hover {
    color: var(--light-blue);
    opacity: 1;
    transform: translateX(-2px);
  }
`;

const MenuItemText = styled.span`
  display: inline-block;
  letter-spacing: 0.05em;
`;

const menuVariants = {
  closed: {
    x: 20,
    opacity: 0,
    transition: {
      type: "tween",
      duration: 0.2
    }
  },
  open: {
    x: 0,
    opacity: 1,
    transition: {
      type: "tween",
      duration: 0.2
    }
  }
};

const menuItemVariants = {
  closed: {
    x: 20,
    opacity: 0
  },
  open: (i) => ({
    x: 0,
    opacity: 1,
    transition: {
      delay: i * 0.05,
      type: "tween",
      duration: 0.2
    }
  })
};

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef();

  const menuItems = [
    { text: 'Home', link: '/', icon: <FaHome size={12} /> },
    { text: 'Shop', link: '/shop', icon: <FaShoppingBag size={12} /> },
    { text: 'Vault', link: '/vault', icon: <FaLock size={12} /> },
    { text: 'About', link: '/about', icon: <FaInfoCircle size={12} /> },
    { text: 'Forum', link: '/forum', icon: <FaComments size={12} /> },
    { text: 'Contact', link: '/contact', icon: <FaEnvelope size={12} /> }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <HeaderContainer>
      <LogoLink href="/">
        <LogoIcon src={crownLogo} alt="Crown Logo" />
        <Logo>Crown</Logo>
      </LogoLink>

      <HamburgerButton
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle Menu"
      >
        <HamburgerLine
          animate={{
            rotate: isMenuOpen ? 45 : 0,
            y: isMenuOpen ? 6 : 0
          }}
        />
        <HamburgerLine
          animate={{
            opacity: isMenuOpen ? 0 : 1
          }}
        />
        <HamburgerLine
          animate={{
            rotate: isMenuOpen ? -45 : 0,
            y: isMenuOpen ? -6 : 0
          }}
        />
      </HamburgerButton>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <BlurOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className={isMenuOpen ? 'active' : ''}
            />
            <MenuOverlay
              ref={menuRef}
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants}
            >
              {menuItems.map((item, i) => (
                <MenuItem
                  key={item.text}
                  href={item.link}
                  variants={menuItemVariants}
                  custom={i}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <MenuItemText>{item.text}</MenuItemText>
                  {item.icon}
                </MenuItem>
              ))}
            </MenuOverlay>
          </>
        )}
      </AnimatePresence>
    </HeaderContainer>
  );
}
