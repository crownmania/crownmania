import { motion } from 'framer-motion';
import styled from 'styled-components';

const FooterContainer = styled.footer`
  padding: 4rem 2rem 2rem;
  background: linear-gradient(to top, var(--dark-blue), transparent);
  position: relative;
  overflow: hidden;
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const FooterSection = styled(motion.div)`
  h3 {
    color: var(--light-blue);
    margin-bottom: 1rem;
    font-size: 1.2rem;
  }
`;

const FooterLink = styled(motion.a)`
  display: block;
  color: var(--text-color);
  text-decoration: none;
  margin: 0.5rem 0;
  opacity: 0.8;
  transition: opacity 0.3s ease;

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
`;

export default function Footer() {
  return (
    <FooterContainer>
      <FooterContent>
        <FooterSection
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <h3>About</h3>
          <FooterLink href="#" whileHover={{ x: 5 }}>Our Story</FooterLink>
          <FooterLink href="#" whileHover={{ x: 5 }}>Team</FooterLink>
          <FooterLink href="#" whileHover={{ x: 5 }}>Careers</FooterLink>
        </FooterSection>

        <FooterSection
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <h3>Support</h3>
          <FooterLink href="#" whileHover={{ x: 5 }}>FAQ</FooterLink>
          <FooterLink href="#" whileHover={{ x: 5 }}>Contact Us</FooterLink>
          <FooterLink href="#" whileHover={{ x: 5 }}>Help Center</FooterLink>
        </FooterSection>

        <FooterSection
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <h3>Legal</h3>
          <FooterLink href="#" whileHover={{ x: 5 }}>Privacy Policy</FooterLink>
          <FooterLink href="#" whileHover={{ x: 5 }}>Terms of Service</FooterLink>
          <FooterLink href="#" whileHover={{ x: 5 }}>Returns</FooterLink>
        </FooterSection>

        <FooterSection
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <h3>Connect</h3>
          <FooterLink href="#" whileHover={{ x: 5 }}>Twitter</FooterLink>
          <FooterLink href="#" whileHover={{ x: 5 }}>Instagram</FooterLink>
          <FooterLink href="#" whileHover={{ x: 5 }}>Discord</FooterLink>
        </FooterSection>
      </FooterContent>

      <Copyright>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          © 2023 Crownmania. All rights reserved.
        </motion.p>
      </Copyright>
    </FooterContainer>
  );
}
