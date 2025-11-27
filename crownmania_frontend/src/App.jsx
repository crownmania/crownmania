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
    async function checkStorage() {
      const result = await verifyStorageSetup();
      console.log('Storage verification result:', result);
      
      if (!result.modelsFound?.includes('models/durk-model.glb')) {
        console.error('Warning: durk-model.glb not found in Firebase Storage');
      }
      
      if (!result.imagesFound?.length) {
        console.error('Warning: No product images found in Firebase Storage');
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
            </Routes>
          </MainContent>
        </Router>
      </AppContainer>
  );
}

export default App;
