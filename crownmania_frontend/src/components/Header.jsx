import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaShoppingBag, FaLock, FaInfoCircle, FaEnvelope, FaComments, FaWallet, FaSpinner, FaSun, FaMoon } from 'react-icons/fa';
import crownLogo from '../assets/crown_logo_white.svg';
import BackgroundBeams from './BackgroundBeams';
import useWeb3Auth from '../hooks/useWeb3Auth';
import { StickyHalfToneSeparator } from './HalfToneSeparator';

const HeaderContainer = styled(motion.header)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  padding: 1.25rem 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  background: #000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  ${props => props.$scrolled && `
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1rem 3rem;
  `}

  @media (max-width: 768px) {
    padding: 1rem 1.5rem;
  }

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    height: 50px;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.85), transparent);
    pointer-events: none;
    z-index: -1;
  }
`;

const LogoContainer = styled.a`
  display: flex;
  align-items: center;
  gap: 1.25rem;
  text-decoration: none;
  cursor: pointer;
  z-index: 2100;

  &:hover .logo-text {
    color: var(--white);
    filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.4));
  }
`;

const LogoIcon = styled.img`
  height: 40px;
  width: auto;
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.2));
  transition: all 0.4s ease;

  @media (max-width: 768px) {
    height: 32px;
  }
`;

const LogoText = styled.span`
  font-family: var(--font-primary);
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #fff;
  text-transform: uppercase;
  transition: all 0.4s ease;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 2.5rem;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const NavItem = styled.a`
  font-family: var(--font-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  text-decoration: none;
  transition: all 0.3s ease;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--vault-accent);
    transition: all 0.3s ease;
  }

  &:hover {
    color: #fff;
    &::after {
      width: 100%;
    }
  }

  ${props => props.$active && `
    color: var(--vault-accent);
    &::after {
      width: 100%;
    }
  `}
`;

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const AccessButton = styled(motion.button)`
  background: ${props => props.$connected ? 'rgba(0, 163, 255, 0.1)' : 'var(--vault-accent)'};
  border: 1px solid ${props => props.$connected ? 'var(--vault-accent)' : 'transparent'};
  color: ${props => props.$connected ? 'var(--vault-accent)' : '#000'};
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-family: var(--font-secondary);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);

  &:hover {
    background: #fff;
    color: #000;
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1rem;
    font-size: 0.7rem;
  }
`;

const MenuToggle = styled(motion.button)`
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px;
  z-index: 2100;

  span {
    display: block;
    width: 24px;
    height: 2px;
    background: #fff;
    transition: all 0.3s ease;
  }

  ${props => props.$isOpen && `
    span:nth-child(1) { transform: translateY(8px) rotate(45deg); }
    span:nth-child(2) { opacity: 0; }
    span:nth-child(3) { transform: translateY(-8px) rotate(-45deg); }
  `}
`;

const MobileMenu = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 2050;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 8rem 3rem;
  gap: 2rem;
`;

const MobileNavItem = styled(motion.a)`
  font-family: var(--font-primary);
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  text-transform: uppercase;
  text-decoration: none;
  letter-spacing: -0.02em;
  text-align: right;

  &:hover {
    color: var(--vault-accent);
  }

  ${props => props.$active && `
    color: var(--vault-accent);
  `}
`;

const menuVariants = {
  closed: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    }
  },
  open: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const mobileItemVariants = {
  closed: { opacity: 0, x: 20 },
  open: { opacity: 1, x: 0 }
};

const CloseButton = styled(motion.button)`
  position: absolute;
  top: 2rem;
  right: 3rem;
  background: none;
  border: none;
  cursor: pointer;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: #fff;
  font-size: 2rem;
  transition: all 0.3s ease;

  &:hover {
    color: var(--vault-accent);
    transform: rotate(90deg);
  }
`;

const ThemeToggle = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  color: #fff;
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 2rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--vault-accent);
    color: var(--vault-accent);
  }
  
  svg {
    font-size: 1.1rem;
  }
`;

const MenuDivider = styled.div`
  width: 100%;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 1rem 0;
`;

export default function Header() {
  const navigate = useNavigate();
  const { isInitialized, isWeb3Available, user, isLoading, login, logout, walletAddress } = useWeb3Auth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('landing');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const { scrollY } = useScroll();
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // Note: Full light mode implementation would require global state/context
    // For now, this shows the toggle UI - full implementation can be added later
    document.body.classList.toggle('light-mode', !isDarkMode);
  };

  const menuItems = [
    { text: 'CROWNMANIA', link: '/' },
    { text: 'The Shop', link: '/#shop' },
    { text: 'The Vision', link: '/#about' },
    { text: 'Access Vault', link: '/#vault' },
    { text: 'Forum', link: '/forum' },
    { text: 'Contact', link: '/contact' }
  ];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleConnect = async () => {
    if (user) {
      const confirmDisconnect = window.confirm('Disconnect session?');
      if (confirmDisconnect) {
        await logout();
      }
      return;
    }

    try {
      await login();
      navigate('/#vault');
      setTimeout(() => {
        const vaultSection = document.getElementById('vault');
        if (vaultSection) {
          vaultSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMenuClick = (e, link) => {
    e.preventDefault();
    setIsMenuOpen(false);

    if (link === '/') {
      scrollToTop();
      navigate('/');
      return;
    }

    if (link.startsWith('/#')) {
      const sectionId = link.substring(2);
      navigate('/');
      setTimeout(() => {
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      navigate(link);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);

      const sections = ['landing', 'shop', 'about', 'vault'];
      const offset = 200;

      for (const sectionId of sections) {
        const section = document.getElementById(sectionId);
        if (section) {
          const rect = section.getBoundingClientRect();
          if (rect.top <= offset && rect.bottom >= offset) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target) && !buttonRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <>
      <HeaderContainer $scrolled={scrolled}>
        <LogoContainer href="#" onClick={(e) => { e.preventDefault(); scrollToTop(); }}>
          <LogoIcon src={crownLogo} alt="Crownmania Logo" />
          <LogoText className="logo-text">CROWNMANIA</LogoText>
        </LogoContainer>

        <ActionsContainer>
          <MenuToggle
            onClick={toggleMenu}
            ref={buttonRef}
            $isOpen={isMenuOpen}
          >
            <span />
            <span />
            <span />
          </MenuToggle>
        </ActionsContainer>
      </HeaderContainer>
      <StickyHalfToneSeparator topOffset={scrolled ? 55 : 70} />

      <AnimatePresence>
        {isMenuOpen && (
          <MobileMenu
            ref={menuRef}
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
          >
            <CloseButton
              onClick={() => setIsMenuOpen(false)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ×
            </CloseButton>
            {menuItems.map((item, i) => (
              <MobileNavItem
                key={item.text}
                href={item.link}
                variants={mobileItemVariants}
                onClick={(e) => handleMenuClick(e, item.link)}
                $active={activeSection === (item.link === '/' ? 'landing' : item.link.replace('/#', ''))}
              >
                {item.text}
              </MobileNavItem>
            ))}
            <MenuDivider />
            <ThemeToggle
              onClick={toggleTheme}
              variants={mobileItemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isDarkMode ? <FaSun /> : <FaMoon />}
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </ThemeToggle>
          </MobileMenu>
        )}
      </AnimatePresence>
    </>
  );
}
