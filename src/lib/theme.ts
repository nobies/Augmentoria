/**
 * Luxury Atmospheric Client Accent & Ambient Theme Engine
 * Generates ambient lighting, tinted glassmorphism surfaces, and brand styling
 * inspired by high-end cinema tools (blklightstudio / Apple Pro dark aesthetics).
 */

export function getClientAmbientStyles(accentColor?: string): React.CSSProperties {
  const color = accentColor || '#6366f1';
  return {
    ['--client-accent' as string]: color,
    ['--client-accent-glow' as string]: `${color}1f`,
    ['--client-accent-muted' as string]: `${color}14`,
    ['--client-accent-border' as string]: `${color}38`,
    ['--client-accent-solid' as string]: color,
  };
}

export function getAmbientBackground(accentColor?: string): string {
  const color = accentColor || '#6366f1';
  return `
    radial-gradient(1200px circle at 50% -10%, ${color}14 0%, transparent 70%),
    radial-gradient(800px circle at 100% 30%, ${color}0a 0%, transparent 60%),
    radial-gradient(900px circle at 0% 75%, ${color}08 0%, transparent 60%),
    #05070c
  `;
}

/**
 * Extracts or generates high-res thumbnail for any external or local media link:
 * YouTube, Vimeo, Instagram, TikTok, or Direct CDN Stream.
 */
export function getVideoThumbnail(url?: string, defaultThumb?: string): string {
  if (!url) {
    return defaultThumb || 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=800&auto=format&fit=crop&q=80';
  }

  // 1. YouTube Video ID
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  // 2. Vimeo URL
  if (url.includes('vimeo.com')) {
    return defaultThumb || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80';
  }

  // 3. Instagram Video / Reel
  if (url.includes('instagram.com')) {
    return defaultThumb || 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=800&auto=format&fit=crop&q=80';
  }

  // 4. TikTok Video
  if (url.includes('tiktok.com')) {
    return defaultThumb || 'https://images.unsplash.com/photo-1596558450255-7c0b7be9d56a?w=800&auto=format&fit=crop&q=80';
  }

  // 5. Default Fallback
  return defaultThumb || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80';
}

export function detectVideoProvider(url?: string): 'youtube' | 'vimeo' | 'instagram' | 'tiktok' | 'local' {
  if (!url) return 'local';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  return 'local';
}

export const PRESET_CLIENT_ACCENT_COLORS = [
  { name: 'Vodafone Red', hex: '#E60000' },
  { name: 'Red Bull Crimson', hex: '#DC0A2D' },
  { name: 'Adidas Royal Blue', hex: '#0051BA' },
  { name: 'Nike Pitch Black', hex: '#111111' },
  { name: 'Spotify Green', hex: '#1DB954' },
  { name: 'Apple Silver Titanium', hex: '#A2AAAD' },
  { name: 'Porsche Carmine Red', hex: '#D5001C' },
  { name: 'PlayStation Royal', hex: '#003791' },
  { name: 'Netflix Cinematic Red', hex: '#E50914' },
  { name: 'Coca-Cola Crimson', hex: '#F40009' },
  { name: 'Samsung Cobalt', hex: '#1428A0' },
  { name: 'BMW M Blue', hex: '#0066B1' },
  { name: 'Mercedes Petronas Cyan', hex: '#00A19B' },
  { name: 'Rolex Jubilee Green', hex: '#006039' },
  { name: 'Emirates Scarlet', hex: '#D71A21' },
  { name: 'Riot Games Red', hex: '#D9333F' },
  { name: 'OpenAI Mint', hex: '#10A37F' },
  { name: 'Tesla Crimson', hex: '#E82127' },
  { name: 'Dior Parisian Beige', hex: '#C4A482' },
  { name: 'F1 Racing Red', hex: '#E10600' },
  { name: 'Warner Bros Cobalt', hex: '#0057B8' },
  { name: 'EA Sports Neon Green', hex: '#00E59B' },
  { name: 'Gucci Emerald', hex: '#10B981' },
  { name: 'Airbnb Coral', hex: '#FF5A5F' },
  { name: 'Xbox Matrix Green', hex: '#107C10' },
  { name: 'Beats Crimson', hex: '#E01F3D' },
  { name: 'Louis Vuitton Ochre', hex: '#8B6B4B' },
  { name: 'Starbucks Forest', hex: '#006241' },
  { name: 'Monster Lime', hex: '#95D600' },
  { name: 'TikTok Neon Coral', hex: '#FE2C55' },
  { name: 'Instagram Rose Berry', hex: '#C13584' },
  { name: 'Aston Martin Racing Green', hex: '#00594F' },
  { name: 'Ferrari Rosso Corsa', hex: '#FF2800' },
  { name: 'McLaren Papaya Orange', hex: '#FF8000' },
  { name: 'HBO Max Deep Violet', hex: '#7E22CE' },
  { name: 'Cartier Bordeaux', hex: '#8B0000' },
  { name: 'Herman Miller Flame', hex: '#FF4438' },
];

export const CLIENT_INDUSTRIES = [
  'All Industries',
  'Telecommunications & 5G',
  'Extreme Sports & Entertainment',
  'Athletic Footwear & Apparel',
  'Audio Streaming & Podcasts',
  'Theatrical Cinema & Streaming',
  'Automotive & Supercars',
  'Competitive Gaming & Esports',
  'Artificial Intelligence & Tech',
  'Haute Horlogerie & Timepieces',
  'Luxury Fashion & Leather Goods',
  'Aviation & Luxury Travel',
  'Beverage & Global FMCG',
  'Acoustic Engineering & Audio',
  'Architectural Cinema & Furniture',
];
