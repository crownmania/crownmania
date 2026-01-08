import { useState, useEffect } from 'react';
import styled from 'styled-components';

const NavContainer = styled.nav`
  position: fixed;
  top: 50%;
  right: 2rem;
  transform: translateY(-50%);
  z-index: 100;
`;

const NavDot = styled.div`
  width: 12px;
  height: 12px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  margin: 1rem 0;
  cursor: pointer;
  transition: all 0.3s ease;

  &.active {
    background: var(--light-blue);
  }

  &:hover {
    background: var(--light-blue);
  }
`;

export default function Navigation() {
  const [activeSection, setActiveSection] = useState('home');

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'shop', 'about', 'vault'];
      const current = sections.find(section => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top >= 0 && rect.top <= window.innerHeight / 2;
        }
        return false;
      });
      if (current) {
        setActiveSection(current);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <NavContainer>
      {['home', 'shop', 'about', 'vault'].map((section) => (
        <NavDot
          key={section}
          className={activeSection === section ? 'active' : ''}
          onClick={() => scrollToSection(section)}
        />
      ))}
    </NavContainer>
  );
}
