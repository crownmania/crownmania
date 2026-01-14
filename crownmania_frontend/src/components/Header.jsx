import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaShoppingBag, FaLock, FaInfoCircle, FaEnvelope, FaComments, FaWallet, FaSpinner } from 'react-icons/fa';
import crownLogo from '../assets/crown_logo_white.svg';
import BackgroundBeams from './BackgroundBeams';
import useWeb3Auth from '../hooks/useWeb3Auth';

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
  
  @media (max-width: 600px) {
    padding: 0.75rem 1rem;
  }
  
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
  margin-left: 0.5rem;
  margin-top: 0.25rem;

  @media (max-width: 600px) {
    gap: 0.5rem;
    margin-left: 0;
  }

  &:hover {
    filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.4));
  }
`;

const LogoIcon = styled.img`
  height: 36px;
  width: 36px;
  
  @media (max-width: 600px) {
    height: 28px;
    width: 28px;
  }
`;

const Logo = styled.div`
  font-family: 'Designer', sans-serif;
  font-size: 2.0rem;
  font-weight: normal;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0;
  color: white;
  
  @media (max-width: 480px) {
    font-size: 1.4rem;
    letter-spacing: 0.08em;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  @media (max-width: 600px) {
    gap: 0.5rem;
  }
`;

const ConnectButton = styled(motion.button)`
  background: transparent;
  border: 1px solid ${props => props.$connected ? 'rgba(0, 255, 136, 0.6)' : 'rgba(255, 255, 255, 0.6)'};
  color: ${props => props.$connected ? '#00ff88' : 'white'};
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  font-family: 'Designer', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.3s ease;
  ${props => props.$connected && `
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
  `}
  
  &:hover {
    background: ${props => props.$connected ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.1)'};
    border-color: ${props => props.$connected ? '#00ff88' : 'white'};
    box-shadow: 0 0 15px ${props => props.$connected ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 255, 255, 0.2)'};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  svg.spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @media (max-width: 600px) {
    padding: 0.25rem 0.6rem;
    font-size: 0.6rem;
    gap: 0;
    border-width: 1px;
    
    span {
      display: inline-block;
    }
  }
`;

const HamburgerButton = styled(motion.button)`
  background: none;
  border: none;
  cursor: pointer;
  width: 44px;
  height: 44px;
  position: relative;
  z-index: 102;
  padding: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const HamburgerLine = styled(motion.span)`
  display: block;
  width: 24px;
  height: 2px;
  background: white;
  margin: 4px 0;
`;

const MenuOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  width: 200px;
  height: 100vh;
  background: rgba(2, 6, 23, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  z-index: 101;
  padding: 5rem 0.5rem 2rem;
  opacity: ${props => (props.$isOpen ? 1 : 0)};
  transform: translateY(${props => (props.$isOpen ? '0' : '-10px')});
  pointer-events: ${props => (props.$isOpen ? 'auto' : 'none')};
  transition: all 0.3s ease;
`;

const MenuItem = styled(motion.a)`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.$active ? 'var(--light-blue)' : 'white'};
  text-decoration: none;
  font-family: 'Designer', sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.6rem 1rem;
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
  cursor: pointer;
  background: ${props => props.$active ? 'rgba(0, 102, 255, 0.1)' : 'transparent'};
  border-left: ${props => props.$active ? '2px solid var(--light-blue)' : '2px solid transparent'};

  svg {
    font-size: 1rem;
    min-width: 16px;
  }

  &:hover {
    color: var(--light-blue);
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

const MenuItemText = styled.span`
  display: inline-block;
  letter-spacing: 0.02em;
`;

const menuVariants = {
  closed: {
    x: "100%",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  open: {
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.04,
      delayChildren: 0.1
    }
  }
};

const menuItemVariants = {
  closed: {
    x: 20,
    opacity: 0
  },
  open: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  }
};

export default function Header() {
  const navigate = useNavigate();
  const { isInitialized, isWeb3Available, user, isLoading, login, logout, walletAddress } = useWeb3Auth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState('landing');
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.8]);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const menuItems = [
    { text: 'Home', icon: <FaHome size={16} />, link: '/' },
    { text: 'Shop', icon: <FaShoppingBag size={16} />, link: '/#shop' },
    { text: 'Vault', icon: <FaLock size={16} />, link: '/#vault' },
    { text: 'About', icon: <FaInfoCircle size={16} />, link: '/#about' },
    { text: 'Forum', icon: <FaComments size={16} />, link: '/forum' },
    { text: 'Contact', icon: <FaEnvelope size={16} />, link: '/contact' }
  ];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // Format wallet address for display (0x1234...5678)
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleConnect = async () => {
    if (user) {
      // Already connected - show disconnect option
      const confirmDisconnect = window.confirm('Disconnect wallet?');
      if (confirmDisconnect) {
        await logout();
      }
      return;
    }

    try {
      await login();
      // After successful login, navigate to vault
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
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Handle menu item click with smooth scrolling
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
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        // Scrolling up or at the top
        setShowHeader(true);
      } else {
        // Scrolling down
        setShowHeader(false);
      }

      setLastScrollY(currentScrollY);

      // Detect active section
      const sections = ['landing', 'gallery', 'shop', 'about', 'vault'];
      const offset = 200; // Offset from top to trigger section

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

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleScroll = () => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    const handleTouchStart = (event) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll);
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('keydown', handleEscape);

    // Clean up event listeners
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  return (
    <>
      <BackgroundBeams />
      <HeaderContainer style={{ opacity: headerOpacity }} $show={showHeader}>
        <LogoLink href="#" onClick={(e) => {
          e.preventDefault();
          scrollToTop();
        }}>
          <LogoIcon src={crownLogo} alt="Crownmania Logo" />
          <Logo>CROWNMANIA</Logo>
        </LogoLink>

        <HeaderActions>
          <ConnectButton
            onClick={handleConnect}
            disabled={isLoading || !isWeb3Available}
            $connected={!!user}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title={walletAddress || (user ? 'Click to disconnect' : 'Connect wallet')}
          >
            <span>
              {isLoading
                ? '...'
                : (user
                  ? (walletAddress ? <><FaWallet style={{ fontSize: '0.8rem' }} /> {formatAddress(walletAddress)}</> : 'Connected')
                  : <><FaWallet style={{ fontSize: '0.8rem' }} /> Connect</>
                )
              }
            </span>
          </ConnectButton>

          <HamburgerButton
            onClick={toggleMenu}
            ref={buttonRef}
          >
            <HamburgerLine
              animate={isMenuOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
            />
            <HamburgerLine
              animate={isMenuOpen ? { opacity: 0 } : { opacity: 1 }}
            />
            <HamburgerLine
              animate={isMenuOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
            />
          </HamburgerButton>
        </HeaderActions>
      </HeaderContainer>

      <HalftoneOverlay />

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
              $isOpen={isMenuOpen}
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants}
            >
              {menuItems.map((item, i) => {
                // Determine if this menu item is active
                const sectionId = item.link === '/' ? 'landing' : item.link.replace('/#', '');
                const isActive = activeSection === sectionId || (item.link === '/' && activeSection === 'landing');

                return (
                  <MenuItem
                    key={item.text}
                    href={item.link}
                    custom={i}
                    variants={menuItemVariants}
                    onClick={(e) => handleMenuClick(e, item.link)}
                    $active={isActive}
                  >
                    {item.icon}
                    <MenuItemText>{item.text}</MenuItemText>
                  </MenuItem>
                );
              })}
            </MenuOverlay>
          </>
        )}
      </AnimatePresence>
    </>
  );
}