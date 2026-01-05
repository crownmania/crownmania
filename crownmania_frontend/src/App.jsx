import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import { GlobalStyles } from './styles/GlobalStyles';
import Header from './components/Header';
import Landing from './components/Landing';
import Gallery from './components/Gallery';
import Shop from './components/Shop';
import About from './components/About';
import Vault from './components/Vault';
import Footer from './components/Footer';
import ForumPage from './pages/ForumPage';
import ContactPage from './pages/ContactPage';
import ProductPage from './components/ProductPage';
import VerifyPage from './pages/VerifyPage';
import MintNFTPage from './pages/MintNFTPage';
import SuccessPage from './pages/SuccessPage';
import CancelPage from './pages/CancelPage';
import { verifyStorageSetup } from './utils/storageUtils';
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
    <Shop />
    <About />
    <Vault />
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
        </MainContent>
      </Router>
    </AppContainer>
  );
}

export default App;
