import React from 'react';
import styled from 'styled-components';

const FallbackContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 2rem;
  text-align: center;
`;

const FallbackTitle = styled.h2`
  font-family: var(--font-primary);
  color: #fff;
  font-size: 1.5rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
`;

const FallbackText = styled.p`
  font-family: var(--font-secondary);
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  line-height: 1.7;
  margin-bottom: 2rem;
  max-width: 28rem;
`;

const ReloadButton = styled.button`
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-family: var(--font-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  padding: 0.9rem 2rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--vault-accent);
    color: var(--vault-accent);
  }
`;

// Catches render errors below it so one failing component (e.g. the lazy 3D
// viewer or a route chunk) can't unmount the whole app into a white screen.
// Pass `fallback={null}` to fail a section silently, or a node for custom UI.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught render error:', error, info?.componentStack);
    this.props.onError?.(error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    return (
      <FallbackContainer>
        <FallbackTitle>Something went wrong</FallbackTitle>
        <FallbackText>
          This section failed to load. Try refreshing the page — if it keeps
          happening, let us know through the contact page.
        </FallbackText>
        <ReloadButton onClick={() => window.location.reload()}>
          Reload Page
        </ReloadButton>
      </FallbackContainer>
    );
  }
}

export default ErrorBoundary;
