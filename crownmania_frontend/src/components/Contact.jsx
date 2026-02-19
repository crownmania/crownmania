import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaPaperPlane } from 'react-icons/fa';

const ContactSection = styled.section`
  min-height: 100vh;
  padding: 12rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  background: radial-gradient(circle at 50% 10%, rgba(0, 163, 255, 0.05) 0%, transparent 50%);
  overflow: hidden;
`;

const ContactContainer = styled(motion.div)`
  max-width: 600px;
  width: 100%;
  background: var(--vault-bg);
  backdrop-filter: blur(var(--vault-blur));
  -webkit-backdrop-filter: blur(var(--vault-blur));
  border: 1px solid var(--vault-border);
  border-radius: 24px;
  padding: 4rem;
  position: relative;
  z-index: 2;

  @media (max-width: 768px) {
    padding: 2.5rem 1.5rem;
  }
`;

const TitleHeader = styled.div`
  text-align: center;
  margin-bottom: 4rem;
  z-index: 2;

  h2 {
    font-size: clamp(2.5rem, 8vw, 4rem);
    font-family: var(--font-primary);
    margin-bottom: 1rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.02em;
    color: #fff;
  }

  p {
    font-family: var(--font-secondary);
    color: var(--vault-accent);
    letter-spacing: 0.3em;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Label = styled.label`
  font-family: var(--font-secondary);
  font-size: 0.7rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.2em;
`;

const Input = styled.input`
  padding: 1.25rem 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #fff;
  font-family: var(--font-secondary);
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:focus {
    outline: none;
    border-color: var(--vault-accent);
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 0 0 20px rgba(0, 163, 255, 0.1);
  }
`;

const TextArea = styled.textarea`
  padding: 1.25rem 1.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #fff;
  font-family: var(--font-secondary);
  font-size: 0.95rem;
  min-height: 180px;
  resize: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:focus {
    outline: none;
    border-color: var(--vault-accent);
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 0 0 20px rgba(0, 163, 255, 0.1);
  }
`;

const SubmitButton = styled(motion.button)`
  padding: 1.25rem;
  background: var(--vault-accent);
  border: none;
  border-radius: 12px;
  color: #000;
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: #fff;
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(0, 163, 255, 0.2);
  }
`;

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        setSubmitted(true);
        setFormData({ name: '', email: '', message: '' });
      }
    } catch (err) {
      setError('Unable to send. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ContactSection id="contact">
      <TitleHeader>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Direct Communication
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          CONTACT THE ARCHIVE
        </motion.h2>
      </TitleHeader>

      <ContactContainer
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center', padding: '2rem 0' }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>👑</div>
            <h3 style={{ fontFamily: 'var(--font-primary)', color: 'white', marginBottom: '0.75rem', fontSize: '1.5rem' }}>TRANSMISSION SENT</h3>
            <p style={{ fontFamily: 'var(--font-secondary)', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.7 }}>
              We've received your message. Expect a reply within 1–2 business days.
            </p>
          </motion.div>
        ) : (
          <Form onSubmit={handleSubmit}>
            <InputGroup>
              <Label htmlFor="name">Full Identity</Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your Name"
                required
              />
            </InputGroup>

            <InputGroup>
              <Label htmlFor="email">Nexus Address</Label>
              <Input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                required
              />
            </InputGroup>

            <InputGroup>
              <Label htmlFor="message">Transmission</Label>
              <TextArea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Describe your inquiry..."
                required
              />
            </InputGroup>

            {error && (
              <p style={{ color: '#ff4d4d', fontFamily: 'var(--font-secondary)', fontSize: '0.85rem', margin: 0 }}>
                ⚠️ {error}
              </p>
            )}

            <SubmitButton
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isSubmitting ? 'TRANSMITTING...' : (
                <>
                  SEND TRANSMISSION
                  <FaPaperPlane size={14} />
                </>
              )}
            </SubmitButton>
          </Form>
        )}
      </ContactContainer>
    </ContactSection>
  );
}
