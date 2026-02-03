import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const NavContainer = styled.nav`
  position: fixed;
  top: 50%;
  right: 2rem;
  transform: translateY(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: flex-end;

  @media (max-width: 768px) {
    right: 1rem;
  }
`;

const NavItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  group: true;

  &:hover .nav-label {
    opacity: 1;
    transform: translateX(0);
  }

  &:hover .nav-dot {
    border-color: var(--vault-accent);
    box-shadow: 0 0 15px rgba(0, 163, 255, 0.4);
  }
`;

const NavLabel = styled.span`
  font-family: var(--font-secondary);
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  background: rgba(0, 0, 0, 0.4);
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;

  ${props => props.$active && `
    opacity: 1;
    transform: translateX(0);
    color: var(--vault-accent);
    border-color: var(--vault-accent-glow);
  `}
`;

const NavDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${props => props.$active ? 'var(--vault-accent)' : 'transparent'};
  border: 2px solid ${props => props.$active ? 'var(--vault-accent)' : 'rgba(255, 255, 255, 0.3)'};
  transition: all 0.3s ease;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 1px solid var(--vault-accent);
    opacity: ${props => props.$active ? 0.4 : 0};
    transform: scale(${props => props.$active ? 1.5 : 1});
    transition: all 0.4s ease;
  }
`;

export default function Navigation() {
  const [activeSection, setActiveSection] = useState('home');

  const sections = [
    { id: 'home', label: 'Identity' },
    { id: 'shop', label: 'Archival Shop' },
    { id: 'about', label: 'The Vision' },
    { id: 'vault', label: 'Access Vault' }
  ];

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const current = sections.find(section => {
        const element = document.getElementById(section.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top >= -200 && rect.top <= window.innerHeight / 2;
        }
        return false;
      });
      if (current) {
        setActiveSection(current.id);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <NavContainer>
      {sections.map((section) => (
        <NavItem key={section.id} onClick={() => scrollToSection(section.id)}>
          <NavLabel className="nav-label" $active={activeSection === section.id}>
            {section.label}
          </NavLabel>
          <NavDot className="nav-dot" $active={activeSection === section.id} />
        </NavItem>
      ))}
    </NavContainer>
  );
}
