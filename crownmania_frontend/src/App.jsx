import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import { GlobalStyles } from './styles/GlobalStyles';
import Header from './components/Header';
import LoadingSpinner from './components/common/LoadingSpinner';
import { verifyStorageSetup } from './utils/storageUtils';

// Lazy load components
const Landing = React.lazy(() => import('./components/Landing'));
const Gallery = React.lazy(() => import('./components/Gallery'));
const Shop = React.lazy(() => import('./components/Shop'));
const About = React.lazy(() => import('./components/About'));
const Vault = React.lazy(() => import('./components/Vault'));
const Footer = React.lazy(() => import('./components/Footer'));
const ForumPage = React.lazy(() => import('./pages/ForumPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const ProductPage = React.lazy(() => import('./components/ProductPage'));
const VerifyPage = React.lazy(() => import('./pages/VerifyPage'));
const MintNFTPage = React.lazy(() => import('./pages/MintNFTPage'));
const SuccessPage = React.lazy(() => import('./pages/SuccessPage'));
const CancelPage = React.lazy(() => import('./pages/CancelPage'));
// Password protection removed

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.main`
  flex: 1;
  padding-top: 80px;
`;

const HomePage = () => (
  <>
    <Landing />
    <Gallery />
    <Vault />
    <Shop />
    <About />
    <Footer />
  </>
);

function App() {
  useEffect(() => {
    // Debug environment variables
    if (import.meta.env.DEV) {
      console.log('=== ENV DEBUG ===');
      console.log('VITE_WEB3AUTH_CLIENT_ID:', import.meta.env.VITE_WEB3AUTH_CLIENT_ID ? 'Present' : 'Missing');
      console.log('VITE_WEB3_RPC_TARGET:', import.meta.env.VITE_WEB3_RPC_TARGET ? 'Present' : 'Missing');
      console.log('WEB3_KEYS:', !!(import.meta.env.VITE_WEB3AUTH_CLIENT_ID && import.meta.env.VITE_WEB3_RPC_TARGET));
    }

    async function checkStorage() {
      try {
        const result = await verifyStorageSetup();
        if (import.meta.env.DEV) {
          console.log('Storage verification result:', result);
        }

        if (result.error) {
          console.warn('Storage verification skipped:', result.error);
          return;
        }

        if (!result.modelsFound?.includes('models/durk-model.glb')) {
          console.warn('Note: durk-model.glb not found in Firebase Storage');
        }

        if (!result.imagesFound?.length) {
          console.warn('Note: No product images found in Firebase Storage');
        }
      } catch (err) {
        console.warn('Storage verification failed (this is OK in development):', err.message);
      }
    }

    checkStorage();
  }, []);

  return (
    <AppContainer>
      <GlobalStyles />
      <Router>
        <Header />
        <MainContent>
          <Suspense fallback={<LoadingSpinner fullScreen />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/forum" element={<ForumPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/verify/:serial" element={<VerifyPage />} />
              <Route path="/mintNFT" element={<MintNFTPage />} />
              <Route path="/success" element={<SuccessPage />} />
              <Route path="/cancel" element={<CancelPage />} />
            </Routes>
          </Suspense>
        </MainContent>
      </Router>
    </AppContainer>
  );
}

export default App;
