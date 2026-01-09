import { motion } from 'framer-motion';
import styled from 'styled-components';

const FooterContainer = styled.footer`
  padding: 4rem 2rem 2rem;
  background: linear-gradient(to top, var(--dark-blue), transparent);
  position: relative;
  overflow: hidden;
`;

const FooterContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 3rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const FooterSection = styled.div`
  h3 {
    color: var(--light-blue);
    margin-bottom: 1rem;
    font-size: 1.2rem;
    font-family: 'Designer', sans-serif;
  }
`;

const FooterLink = styled.a`
  display: block;
  color: var(--text-color);
  text-decoration: none;
  margin: 0.5rem 0;
  opacity: 0.8;
  transition: opacity 0.3s ease;
  font-family: 'Source Sans Pro', sans-serif;

  &:hover {
    opacity: 1;
    color: var(--light-blue);
  }
`;

const Copyright = styled.div`
  text-align: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(0, 166, 251, 0.2);
  opacity: 0.8;
  font-family: 'Source Sans Pro', sans-serif;
`;

export default function Footer() {
  return (
    <FooterContainer>
      <FooterContent>
        <FooterSection
          as={motion.div}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <h3>Support</h3>
          <FooterLink as={motion.a} href="#" whileHover={{ x: 5 }}>FAQ</FooterLink>
          <FooterLink as={motion.a} href="/contact" whileHover={{ x: 5 }}>Contact Us</FooterLink>
          <FooterLink as={motion.a} href="#" whileHover={{ x: 5 }}>Help Center</FooterLink>
        </FooterSection>

        <FooterSection
          as={motion.div}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <h3>Legal</h3>
          <FooterLink as={motion.a} href="#" whileHover={{ x: 5 }}>Privacy Policy</FooterLink>
          <FooterLink as={motion.a} href="#" whileHover={{ x: 5 }}>Terms of Service</FooterLink>
          <FooterLink as={motion.a} href="#" whileHover={{ x: 5 }}>Returns</FooterLink>
        </FooterSection>
      </FooterContent>

      <Copyright>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          © 2025 Crownmania. All rights reserved.
        </motion.p>
      </Copyright>
    </FooterContainer>
  );
}
