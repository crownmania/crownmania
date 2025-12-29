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
        name: 'Lil Durk 10-inch Resin Figure',
        type: 1,
        price: 249.99,
        description: `The Lil Durk 10-inch Resin Figure is a premium collectible made for true fans. Crafted from high-quality resin, this figure features detailed sculpting and a solid, display-ready build.

Designed to capture Lil Durk's signature style and presence, it's the perfect piece for shelves, desks, or display cases.

• 10-inch tall resin figure
• High-quality, durable build
• Detailed design and finish
• Limited edition collectible`,
        mainImage: '/images/product1.webp', // Local fallback
        images: [
            '/images/product1.webp',
            '/images/product1-alt1.jpg',
            '/images/product1-alt2.jpg'
        ],
        modelId: 'durk-model',
        active: true,
        limited: true,
        stock: 7000
    },
    {
        id: 'crown-collectible',
        name: 'Crownmania Limited Crown',
        type: 2,
        price: 499.99,
        description: 'Exclusive Crownmania wearable collectible.',
        mainImage: '/images/Placeholder-product.png',
        comingSoon: true,
        active: false
    },
    {
        id: 'vip-pass',
        name: 'VIP Access Pass',
        type: 3,
        price: 99.99,
        description: 'Unlock exclusive content and early access.',
        mainImage: '/images/Placeholder-product.png',
        comingSoon: true,
        active: false
    }
];

export const getProductById = (id) => PRODUCTS.find(p => p.id === id);
