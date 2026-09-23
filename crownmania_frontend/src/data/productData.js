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
        // Vanity slug for marketing links: crownmania.com/shop/lildurk
        slug: 'lildurk',
        name: 'Lil Durk Collectible Figure',
        type: 1,
        price: '$150.00',
        description: `The Lil Durk 10-inch Resin Figure is a premium collectible made for true fans. Crafted from high-quality resin, this figure features detailed sculpting and a solid, display-ready build.

Designed to capture Lil Durk's signature style and presence, it's the perfect piece for shelves, desks, or display cases.

• 10-inch tall resin figure
• High-quality, durable build
• Detailed design and finish
• Limited edition collectible`,
        // Social preview copy. Kept short and free of claims not already made
        // in the description above; consumed by the build-time OG tag plugin.
        tagline: 'Premium 10-inch resin collectible with detailed sculpting and a display-ready build. Limited edition.',
        ogImage: '/og/lildurk.jpg',
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
        stock: 370
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

export const getProductBySlug = (slug) => PRODUCTS.find(p => p.slug && p.slug === slug);

// Products with a public landing page. Drives both routing and the
// build-time Open Graph tag generation, so the two can never drift.
export const LINKABLE_PRODUCTS = PRODUCTS.filter(p => p.slug && p.active);