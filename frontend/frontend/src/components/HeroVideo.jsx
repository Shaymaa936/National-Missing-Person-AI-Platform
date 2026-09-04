import { useState , useEffect } from 'react';
import heroVideo from '../assets/video/LandingPage.mp4';
import './HeroVideo.css'

function HeroVideo() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (reducedMotion) {
    return <div className="hero-video hero-video--static" style={{ backgroundColor: '#000' }} />;
  }

  return (
    <video className="hero-video" autoPlay muted loop playsInline>
      <source src={heroVideo} type="video/mp4" />
    </video>
  );
}

export default HeroVideo;