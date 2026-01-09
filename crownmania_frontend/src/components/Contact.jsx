import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaPaperPlane } from 'react-icons/fa';

const ContactSection = styled.section`
  min-height: 100vh;
  padding: 6rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgb(2, 6, 23);
  position: relative;
  overflow: hidden;
`;

const ContactContainer = styled.div`
  max-width: 800px;
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 3rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h2`
  font-size: 2.5rem;
  margin-bottom: 2rem;
  text-align: center;
  background: linear-gradient(135deg, #FFFFFF, #0066FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: #FFFFFF;
  font-size: 1rem;
`;

const Input = styled.input`
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #FFFFFF;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #0066FF;
    box-shadow: 0 0 10px rgba(0, 102, 255, 0.2);
  }
`;

const TextArea = styled.textarea`
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #FFFFFF;
  font-size: 1rem;
  min-height: 150px;
  resize: vertical;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #0066FF;
    box-shadow: 0 0 10px rgba(0, 102, 255, 0.2);
  }
`;

const SubmitButton = styled.button`
  padding: 1rem 2rem;
  background: #0066FF;
  border: none;
  border-radius: 8px;
  color: #FFFFFF;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  align-self: flex-end;
  transition: all 0.3s ease;

  &:hover {
    background: #0052CC;
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const GlowOrb = styled.div`
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle at center, rgba(0, 102, 255, 0.2), transparent 70%);
  filter: blur(40px);
  z-index: 0;
`;

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Reset form
    setFormData({ name: '', email: '', message: '' });
    setIsSubmitting(false);
  };

  return (
    <ContactSection id="contact">
      <GlowOrb
        as={motion.div}
        initial={{ x: -200, y: -200 }}
        animate={{
          x: [-200, 200, -200],
          y: [-200, 200, -200]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      <ContactContainer>
        <Title>Get in Touch</Title>
        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="name">Name</Label>
            <Input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </InputGroup>

          <InputGroup>
            <Label htmlFor="message">Message</Label>
            <TextArea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
            />
          </InputGroup>

          <SubmitButton
            as={motion.button}
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSubmitting ? 'Sending...' : (
              <>
                Send Message
                <FaPaperPlane />
              </>
            )}
          </SubmitButton>
        </Form>
      </ContactContainer>
    </ContactSection>
  );
}
