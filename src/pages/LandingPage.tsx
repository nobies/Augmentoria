import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import StatsStrip from '../components/StatsStrip';
import HeroAdminLauncher from '../components/HeroAdminLauncher';
import { LandingSectionView, SiteFooter } from '../components/sections/sections';
import { useLandingSections } from '../hooks/useLandingSections';

export default function LandingPage() {
  const { sections, imageUrl } = useLandingSections();

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Navbar />
      <Hero />
      <StatsStrip />
      {sections.filter((s) => s.visible).map((s, i) => (
        <LandingSectionView key={s.id} section={s} index={i} imageUrl={imageUrl} />
      ))}
      <SiteFooter />
      <HeroAdminLauncher />
    </div>
  );
}
