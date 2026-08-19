/**
 * Product Data Configuration
 * 
 * This file defines the core product collection. 
 * In a production environment, this could be fetched from Firestore,
 * but having a local version ensures basic UI stability.
 */

export const PRODUCTS = [
    {
        id: 'lil-durk-figure',
        name: 'Lil Durk Collectible Figure',
        type: 1,
        price: 150,
        description: `The Lil Durk 10-inch Resin Figure is a premium collectible made for true fans. Crafted from high-quality resin, this figure features detailed sculpting and a solid, display-ready build.

Designed to capture Lil Durk's signature style and presence, it's the perfect piece for shelves, desks, or display cases.

• 10-inch tall resin figure
• High-quality, durable build
• Detailed design and finish
• Limited edition collectible`,
        mainImage: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy1.webp?alt=media',
        galleryImages: [
            'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy1.webp?alt=media',
            'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy2.webp?alt=media',
            'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy3.webp?alt=media',
            'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy4.webp?alt=media',
            'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy5.webp?alt=media',
            'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy7.webp?alt=media',
        ],
        images: [
            '/images/product.webp',
        ],
        modelId: 'durk-model',
        active: true,
        limited: true,
        stock: 7000
    },
    {
        id: 'crown-collectible',
        name: '',
        type: 2,
        price: 499.99,
        description: '',
        mainImage: null,
        comingSoon: true,
        active: false
    },
    {
        id: 'vip-pass',
        name: '',
        type: 3,
        price: 99.99,
        description: '',
        mainImage: null,
        comingSoon: true,
        active: false
    }
];

export const getProductById = (id) => PRODUCTS.find(p => p.id === id);