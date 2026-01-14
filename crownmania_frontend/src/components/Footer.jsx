import { useState } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { FaTwitter, FaInstagram, FaDiscord, FaTiktok } from 'react-icons/fa';

const FooterContainer = styled.footer`
  padding: 4rem 2rem 2rem;
  background: linear-gradient(to top, var(--dark-blue), transparent);
  position: relative;
  overflow: hidden;
`;

const FooterContent = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const FooterSection = styled(motion.div)`
  h3 {
    color: var(--light-blue);
    margin-bottom: 1rem;
    font-size: 1rem;
    font-family: 'Designer', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

const FooterLink = styled(motion.a)`
  display: block;
  color: var(--text-color);
  text-decoration: none;
  margin: 0.5rem 0;
  opacity: 0.8;
  transition: opacity 0.3s ease;
  font-family: 'Avenir Next', sans-serif;
  font-size: 0.9rem;

  &:hover {
    opacity: 1;
    color: var(--light-blue);
  }
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const SocialIcon = styled(motion.a)`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.3s ease;
  
  &:hover {
    background: var(--light-blue);
    color: white;
    transform: translateY(-3px);
  }
`;

const NewsletterForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const NewsletterInput = styled.input`
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-family: 'Avenir Next', sans-serif;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.3s ease;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    border-color: var(--light-blue);
  }
`;

const NewsletterButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: var(--light-blue);
  color: white;
  font-family: 'Designer', sans-serif;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #0077ff;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SuccessMessage = styled.p`
  color: #00ff88;
  font-size: 0.85rem;
  font-family: 'Avenir Next', sans-serif;
`;

const Copyright = styled.div`
  text-align: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(0, 166, 251, 0.2);
  opacity: 0.8;
  font-family: 'Avenir Next', sans-serif;
  font-size: 0.85rem;
`;

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    // TODO: Integrate with actual newsletter service (Mailchimp, ConvertKit, etc.)
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSubscribed(true);
    setIsSubmitting(false);
  };

  return (
    <FooterContainer>
      <FooterContent>
        <FooterSection
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <h3>Support</h3>
          <FooterLink href="#" whileHover={{ x: 5 }}>FAQ</FooterLink>
          <FooterLink href="/contact" whileHover={{ x: 5 }}>Contact Us</FooterLink>
          <FooterLink href="#" whileHover={{ x: 5 }}>Help Center</FooterLink>
        </FooterSection>

        <FooterSection
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
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
          transition={{ delay: 0.3 }}
        >
          <h3>Follow Us</h3>
          <SocialLinks>
            <SocialIcon
              href="https://twitter.com/crownmania"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaTwitter size={18} />
            </SocialIcon>
            <SocialIcon
              href="https://instagram.com/crownmania"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaInstagram size={18} />
            </SocialIcon>
            <SocialIcon
              href="https://discord.gg/crownmania"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaDiscord size={18} />
            </SocialIcon>
            <SocialIcon
              href="https://tiktok.com/@crownmania"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaTiktok size={18} />
            </SocialIcon>
          </SocialLinks>
        </FooterSection>

        <FooterSection
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <h3>Newsletter</h3>
          {subscribed ? (
            <SuccessMessage>Thanks for subscribing! 🎉</SuccessMessage>
          ) : (
            <NewsletterForm onSubmit={handleNewsletterSubmit}>
              <NewsletterInput
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <NewsletterButton
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? 'Subscribing...' : 'Subscribe'}
              </NewsletterButton>
            </NewsletterForm>
          )}
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
