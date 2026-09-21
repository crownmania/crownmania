import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { LINKABLE_PRODUCTS } from '../src/data/productData.js';

const SITE_URL = 'https://crownmania.com';
const START = '<!-- SOCIAL_META_START';
const END = '<!-- SOCIAL_META_END -->';

const escapeAttr = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Collapses the multi-line, bulleted product description into a single line
// suitable for a meta tag, and trims it to a length crawlers actually show.
const toMetaText = (text, limit = 200) => {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  if (flat.length <= limit) return flat;
  return `${flat.slice(0, limit - 1).trimEnd()}…`;
};

const priceAmount = (price) => {
  const match = String(price).match(/[\d.]+/);
  return match ? match[0] : null;
};

function buildMetaBlock(product) {
  const url = `${SITE_URL}/shop/${product.slug}`;
  const title = `${product.name} — Crownmania`;
  const description = toMetaText(product.tagline || product.description);
  const image = product.ogImage
    ? `${SITE_URL}${product.ogImage}`
    : product.mainImage;
  const amount = priceAmount(product.price);

  const tags = [
    `<title>${escapeAttr(title)}</title>`,
    `<meta name="description" content="${escapeAttr(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="product" />`,
    `<meta property="og:site_name" content="Crownmania" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${escapeAttr(title)}" />`,
    `<meta property="og:description" content="${escapeAttr(description)}" />`,
    `<meta property="og:image" content="${escapeAttr(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(image)}" />`,
  ];

  if (amount) {
    tags.push(
      `<meta property="product:price:amount" content="${amount}" />`,
      `<meta property="product:price:currency" content="USD" />`
    );
  }

  return tags.map(tag => `  ${tag}`).join('\n');
}

/**
 * Emits a static HTML entry per product landing page with real Open Graph and
 * Twitter card tags.
 *
 * The app is a client-rendered SPA behind a catch-all rewrite to index.html,
 * so crawlers (which don't execute JS) would otherwise see only the generic
 * homepage tags. Firebase Hosting serves matching static files before applying
 * rewrites, so dist/shop/<slug>/index.html wins for /shop/<slug> while the
 * React router still renders the page for humans.
 */
export default function productOgTags() {
  return {
    name: 'crownmania-product-og-tags',
    apply: 'build',
    async closeBundle() {
      const outDir = 'dist';
      const indexPath = join(outDir, 'index.html');
      const html = await readFile(indexPath, 'utf8');

      const startIndex = html.indexOf(START);
      const endIndex = html.indexOf(END);
      if (startIndex === -1 || endIndex === -1) {
        throw new Error(
          'productOgTags: SOCIAL_META markers not found in index.html. ' +
          'Product links would ship without social preview tags.'
        );
      }

      for (const product of LINKABLE_PRODUCTS) {
        const page =
          html.slice(0, startIndex) +
          buildMetaBlock(product).trimStart() +
          '\n  ' +
          html.slice(endIndex + END.length).trimStart();

        const target = join(outDir, 'shop', product.slug, 'index.html');
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, page, 'utf8');
        this.info?.(`generated /shop/${product.slug}/index.html with product OG tags`);
      }
    },
  };
}
