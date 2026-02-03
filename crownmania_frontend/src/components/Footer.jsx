import { useState } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { FaTwitter, FaInstagram, FaDiscord, FaTiktok, FaPaperPlane } from 'react-icons/fa';

const FooterContainer = styled.footer`
  padding: 8rem 2rem 4rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.4) 100%);
  position: relative;
  border-top: 1px solid var(--vault-border);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -100px;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 200px;
    background: radial-gradient(ellipse at center, rgba(0, 163, 255, 0.1), transparent 70%);
    pointer-events: none;
  }
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1.5fr;
  gap: 4rem;
  z-index: 2;
  position: relative;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 3rem;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
`;

const FooterSection = styled(motion.div)`
  h3 {
    color: #fff;
    margin-bottom: 2rem;
    font-size: 0.75rem;
    font-family: var(--font-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3em;
    font-weight: 800;
    opacity: 0.9;
  }
`;

const FooterLink = styled(motion.a)`
  display: block;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  margin: 0.8rem 0;
  transition: all 0.3s ease;
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  font-weight: 500;

  &:hover {
    color: var(--vault-accent);
    transform: translateX(5px);
  }
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
`;

const SocialIcon = styled(motion.a)`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
  
  &:hover {
    background: var(--vault-accent);
    border-color: var(--vault-accent);
    color: #000;
    transform: translateY(-5px) rotate(5deg);
    box-shadow: 0 10px 20px rgba(0, 163, 255, 0.2);
  }
`;

const NewsletterForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const NewsletterInput = styled.input`
  width: 100%;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-family: var(--font-secondary);
  font-size: 0.9rem;
  outline: none;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
  
  &:focus {
    border-color: var(--vault-accent);
    background: rgba(255, 255, 255, 0.05);
  }
`;

const NewsletterButton = styled(motion.button)`
  padding: 1rem;
  background: var(--vault-accent);
  border: none;
  border-radius: 12px;
  color: #000;
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: #fff;
    transform: scale(1.02);
  }
`;

const Copyright = styled.div`
  text-align: center;
  margin-top: 6rem;
  padding-top: 3rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-family: var(--font-secondary);
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.05em;
`;

const SuccessMessage = styled.p`
  color: var(--vault-accent);
  font-family: var(--font-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  margin-top: 1rem;
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
