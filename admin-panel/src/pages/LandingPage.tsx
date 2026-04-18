// LandingPage.tsx — assembles existing landing section components
import React, { useEffect } from 'react';
import LandingNav      from '../components/landing/LandingNav';
import Hero            from '../components/landing/Hero';
import HowItWorks      from '../components/landing/HowItWorks';
import BusinessSection from '../components/landing/BusinessSection';
import CourierSection  from '../components/landing/CourierSection';
import Coverage        from '../components/landing/Coverage';
import SocialProof     from '../components/landing/SocialProof';
import FAQ             from '../components/landing/FAQ';
import FinalCTA        from '../components/landing/FinalCTA';
import LandingFooter   from '../components/landing/LandingFooter';

const LandingPage: React.FC = () => {
  // Ensure light mode on landing page
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <div
      dir="rtl"
      style={{
        background: 'var(--zooz-bg)',
        color:      'var(--zooz-text1)',
        minHeight:  '100vh',
        fontFamily: "'Noto Sans Hebrew', sans-serif",
      }}
    >
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <BusinessSection />
        <CourierSection />
        <Coverage />
        <SocialProof />
        <FAQ />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
