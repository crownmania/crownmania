import React from 'react';
import Shop from '../components/Shop';
import Footer from '../components/Footer';

// Standalone collection page so /shop is a real, linkable destination
// rather than only a homepage anchor.
export default function ShopPage() {
  return (
    <>
      <Shop />
      <Footer />
    </>
  );
}
