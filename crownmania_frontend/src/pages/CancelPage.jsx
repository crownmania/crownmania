import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaTimesCircle, FaArrowRight } from 'react-icons/fa';

const Container = styled.div`
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: white;
  text-align: center;
`;

const Card = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 3rem;
  border-radius: 20px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
`;

const Icon = styled.div`
  font-size: 4rem;
  color: #ef4444;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-family: 'Designer', sans-serif;
  font-size: 2rem;
  margin-bottom: 1rem;
`;

const Message = styled.p`
  font-size: 1.1rem;
  opacity: 0.8;
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const Button = styled(motion.button)`
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1rem 2rem;
  border-radius: 12px;
  font-family: 'Designer', sans-serif;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin: 0 auto;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

export default function CancelPage() {
  const navigate = useNavigate();

  return (
    <Container>
      <Card
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Icon>
          <FaTimesCircle />
        </Icon>
        <Title>Checkout Cancelled</Title>
        <Message>
          Your checkout process has been cancelled. No charges were made.
          If you had any issues, please contact our support.
        </Message>
        <Button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
        >
          Return to Shop <FaArrowRight />
        </Button>
      </Card>
    </Container>
  );
}
