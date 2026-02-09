import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const Container = styled.div`
  min-height: 100vh;
  padding: 4rem 2rem;
  color: white;
  
  @media (max-width: 768px) {
    padding: 3rem 1.5rem;
  }
`;

const Content = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  font-family: 'Designer', sans-serif;
  font-size: 3rem;
  margin-bottom: 3rem;
  text-align: center;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  
  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 2rem;
  }
`;

const Section = styled(motion.section)`
  margin-bottom: 4rem;
  padding: 2.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  scroll-margin-top: 100px;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    margin-bottom: 2.5rem;
  }
`;

const SectionTitle = styled.h2`
  font-family: 'Designer', sans-serif;
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  color: var(--vault-accent);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  
  @media (max-width: 768px) {
    font-size: 1.4rem;
  }
`;

const Subsection = styled.div`
  margin-bottom: 2rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SubsectionTitle = styled.h3`
  font-family: var(--font-secondary);
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: rgba(255, 255, 255, 0.95);
  text-transform: none;
  letter-spacing: 0.02em;
`;

const Paragraph = styled.p`
  font-family: var(--font-secondary);
  font-size: 0.95rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const List = styled.ul`
  font-family: var(--font-secondary);
  font-size: 0.95rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.75);
  margin: 1rem 0 1rem 1.5rem;
  
  li {
    margin-bottom: 0.5rem;
  }
`;

const LastUpdated = styled.p`
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  margin-top: 4rem;
  font-style: italic;
`;

const Strong = styled.strong`
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
`;

export default function LegalPage() {
    const location = useLocation();

    useEffect(() => {
        // Determine which section to scroll to based on pathname
        const scrollToSection = () => {
            let sectionId = null;

            if (location.pathname === '/privacy-policy') {
                sectionId = 'privacy';
            } else if (location.pathname === '/terms-of-service') {
                sectionId = 'terms';
            } else if (location.pathname === '/returns') {
                sectionId = 'returns';
            }

            if (sectionId) {
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    const element = document.getElementById(sectionId);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
            } else {
                // If on /legal, scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };

        scrollToSection();
    }, [location.pathname]);

    return (
        <Container>
            <Content>
                <PageTitle>Legal</PageTitle>

                {/* Privacy Policy Section */}
                <Section
                    id="privacy"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <SectionTitle>Privacy Policy</SectionTitle>

                    <Subsection>
                        <SubsectionTitle>Information We Collect</SubsectionTitle>
                        <Paragraph>
                            We collect information you provide directly to us, including name, email address, shipping address,
                            and payment information when you make a purchase. We also collect wallet addresses when you connect
                            your digital wallet to claim NFTs.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>How We Use Your Information</SubsectionTitle>
                        <Paragraph>We use the information we collect to:</Paragraph>
                        <List>
                            <li>Process and fulfill your orders</li>
                            <li>Send you order confirmations and shipping updates</li>
                            <li>Verify ownership and enable NFT claiming</li>
                            <li>Communicate with you about our products and services</li>
                            <li>Improve our platform and user experience</li>
                        </List>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>Third-Party Services</SubsectionTitle>
                        <Paragraph>
                            We use trusted third-party services to operate our platform, including Stripe for payment processing,
                            Firebase for data storage, and Web3Auth for wallet authentication. These services have access to your
                            information only to perform tasks on our behalf and are obligated to protect it.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>Data Security</SubsectionTitle>
                        <Paragraph>
                            We implement industry-standard security measures to protect your personal information. However,
                            no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>Your Rights</SubsectionTitle>
                        <Paragraph>
                            You have the right to access, update, or delete your personal information. You may also opt out of
                            marketing communications at any time. To exercise these rights, contact us at support@crownmania.com.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>Blockchain Data</SubsectionTitle>
                        <Paragraph>
                            NFT transactions are recorded on public blockchains. Once an NFT is minted, the transaction record
                            and wallet address become publicly visible and cannot be deleted or modified.
                        </Paragraph>
                    </Subsection>
                </Section>

                {/* Terms of Service Section */}
                <Section
                    id="terms"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <SectionTitle>Terms of Service</SectionTitle>

                    <Subsection>
                        <SubsectionTitle>Acceptance of Terms</SubsectionTitle>
                        <Paragraph>
                            By accessing or using CrownMania, you agree to be bound by these Terms of Service. If you do not
                            agree to these terms, do not use our platform.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>Product Description</SubsectionTitle>
                        <Paragraph>
                            CrownMania offers physical collectibles paired with digital NFT twins. Each physical item includes
                            a unique serial number that can be verified and claimed as an NFT. We make every effort to display
                            products accurately, but we do not guarantee that images or descriptions are error-free.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>Ownership and NFT Claiming</SubsectionTitle>
                        <Paragraph>
                            Purchase of a physical collectible grants you the right to claim the associated NFT. Each serial
                            number can only be claimed once. Once claimed, the NFT is transferred to your wallet and cannot
                            be reversed. You are responsible for maintaining access to your wallet.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>Acceptable Use</SubsectionTitle>
                        <Paragraph>You agree not to:</Paragraph>
                        <List>
                            <li>Use our platform for any unlawful purpose</li>
                            <li>Attempt to bypass security measures or verification systems</li>
                            <li>Resell, duplicate, or fraudulently claim serial numbers</li>
                            <li>Reverse engineer or interfere with the platform's operation</li>
                        </List>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>Intellectual Property</SubsectionTitle>
                        <Paragraph>
                            All content, trademarks, and intellectual property on this platform are owned by CrownMania or
                            licensed to us. NFT ownership grants you a personal, non-commercial license to display the digital
                            asset, but does not transfer underlying intellectual property rights.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>Disclaimers</SubsectionTitle>
                        <Paragraph>
                            <Strong>No Investment Advice:</Strong> CrownMania products are collectibles, not investments.
                            We make no guarantees about future value or resale potential.
                        </Paragraph>
                        <Paragraph>
                            <Strong>Platform Availability:</Strong> We strive for continuous availability but do not guarantee
                            uninterrupted access. We may modify or discontinue features at any time.
                        </Paragraph>
                        <Paragraph>
                            <Strong>Blockchain Risks:</Strong> NFTs are subject to blockchain technology risks including
                            network failures, wallet loss, and smart contract vulnerabilities. You assume all risks associated
                            with blockchain interactions.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>Limitation of Liability</SubsectionTitle>
                        <Paragraph>
                            To the maximum extent permitted by law, CrownMania shall not be liable for any indirect, incidental,
                            or consequential damages arising from your use of our platform or products.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>Governing Law</SubsectionTitle>
                        <Paragraph>
                            These terms are governed by the laws of the United States. Any disputes shall be resolved in the
                            appropriate courts of our jurisdiction.
                        </Paragraph>
                    </Subsection>
                </Section>

                {/* Returns & Refund Policy Section */}
                <Section
                    id="returns"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <SectionTitle>Returns &amp; Refund Policy</SectionTitle>

                    <Subsection>
                        <SubsectionTitle>All Sales Are Final</SubsectionTitle>
                        <Paragraph>
                            <Strong>All sales are final.</Strong> Once you receive your physical collectible, no returns
                            or refunds will be accepted. This policy exists because each collectible is paired with a unique,
                            irreversible NFT that can be claimed upon receipt. By completing your purchase, you acknowledge
                            and accept this all-sales-final policy.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>Damaged or Defective Items Only</SubsectionTitle>
                        <Paragraph>
                            If you receive a product with a <Strong>manufacturing defect or shipping damage</Strong>, you must
                            contact us within <Strong>5 days</Strong> of delivery with photos documenting the issue. We will
                            provide a replacement for verified defects or damage that occurred during shipping.
                        </Paragraph>
                        <Paragraph>
                            <Strong>This does not cover customer damage.</Strong> If you break or damage your collectible after
                            receipt, we cannot replace it. The 5-day window is strictly for items that arrived damaged or defective.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>No Support After 5 Days</SubsectionTitle>
                        <Paragraph>
                            After <Strong>5 days from delivery</Strong>, all sales support ends. We cannot accept claims for
                            damaged items, provide repairs, or offer replacements beyond this window. You assume full responsibility
                            for your collectible after this period.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>What Qualifies as Defective</SubsectionTitle>
                        <Paragraph>Manufacturing defects or shipping damage include:</Paragraph>
                        <List>
                            <li>Item arrived broken or cracked due to shipping</li>
                            <li>Missing components or parts from the manufacturer</li>
                            <li>Paint defects, misprints, or factory errors</li>
                            <li>Packaging was severely damaged causing product damage</li>
                        </List>
                        <Paragraph>
                            <Strong>Not covered:</Strong> Damage caused by customer handling, drops, accidents, or normal wear
                            and tear after delivery.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>NFTs Are Non-Refundable</SubsectionTitle>
                        <Paragraph>
                            <Strong>NFTs cannot be refunded or reversed.</Strong> Once an NFT is claimed and minted to your wallet,
                            the blockchain transaction is permanent. Even if you qualify for a physical replacement due to a defect,
                            the NFT remains with you and cannot be reclaimed or transferred back.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>Replacement Process</SubsectionTitle>
                        <Paragraph>
                            To request a replacement for a defective or damaged item:
                        </Paragraph>
                        <List>
                            <li>Contact <Strong>support@crownmania.com</Strong> within 5 days of delivery</li>
                            <li>Include your order number and clear photos showing the defect or damage</li>
                            <li>Our team will review and respond within 24-48 hours</li>
                            <li>If approved, we will ship a replacement at no cost to you</li>
                        </List>
                        <Paragraph>
                            You may be required to return the defective item. We will provide a prepaid return shipping label
                            for verified defects.
                        </Paragraph>
                    </Subsection>

                    <Subsection>
                        <SubsectionTitle>Contact Information</SubsectionTitle>
                        <Paragraph>
                            For defect claims or questions about this policy, contact us at <Strong>support@crownmania.com</Strong>
                            within the 5-day window.
                        </Paragraph>
                    </Subsection>
                </Section>

                <LastUpdated>Last Updated: February 9, 2026</LastUpdated>
            </Content>
        </Container>
    );
}
