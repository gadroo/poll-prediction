// Centralized color system for poll options
// This ensures consistent colors across all components

export interface ColorConfig {
  name: string;
  hex: string;
  tailwind: string;
  tailwindBg: string;
  tailwindBorder: string;
}

export const POLL_OPTION_COLORS: ColorConfig[] = [
  {
    name: 'red',
    hex: '#ef4444',
    tailwind: 'red-500',
    tailwindBg: 'bg-red-500/70',
    tailwindBorder: 'border-red-500/30'
  },
  {
    name: 'green', 
    hex: '#22c55e',
    tailwind: 'green-500',
    tailwindBg: 'bg-green-500/70',
    tailwindBorder: 'border-green-500/30'
  },
  {
    name: 'blue',
    hex: '#3b82f6', 
    tailwind: 'blue-500',
    tailwindBg: 'bg-blue-500/70',
    tailwindBorder: 'border-blue-500/30'
  },
  {
    name: 'yellow',
    hex: '#f59e0b',
    tailwind: 'amber-500', 
    tailwindBg: 'bg-yellow-500/70',
    tailwindBorder: 'border-yellow-500/30'
  },
  {
    name: 'purple',
    hex: '#a855f7',
    tailwind: 'violet-500',
    tailwindBg: 'bg-purple-500/70', 
    tailwindBorder: 'border-purple-500/30'
  },
  {
    name: 'orange',
    hex: '#f97316',
    tailwind: 'orange-500',
    tailwindBg: 'bg-orange-500/70',
    tailwindBorder: 'border-orange-500/30'
  },
  {
    name: 'pink',
    hex: '#ec4899',
    tailwind: 'pink-500',
    tailwindBg: 'bg-pink-500/70',
    tailwindBorder: 'border-pink-500/30'
  },
  {
    name: 'cyan',
    hex: '#06b6d4',
    tailwind: 'cyan-500',
    tailwindBg: 'bg-cyan-500/70',
    tailwindBorder: 'border-cyan-500/30'
  },
  {
    name: 'lime',
    hex: '#84cc16',
    tailwind: 'lime-500',
    tailwindBg: 'bg-lime-500/70',
    tailwindBorder: 'border-lime-500/30'
  },
  {
    name: 'teal',
    hex: '#14b8a6',
    tailwind: 'teal-500',
    tailwindBg: 'bg-teal-500/70',
    tailwindBorder: 'border-teal-500/30'
  }
];

// Get color for an option based on its text content and index
export function getOptionColor(text: string, index: number): ColorConfig {
  const lowerText = text.toLowerCase();
  
  // Check for yes/no or similar keywords
  if (lowerText.includes('yes') || lowerText.includes('agree') || lowerText.includes('true')) {
    return POLL_OPTION_COLORS[1]; // green
  }
  if (lowerText.includes('no') || lowerText.includes('disagree') || lowerText.includes('false')) {
    return POLL_OPTION_COLORS[0]; // red
  }
  
  // Otherwise use index-based assignment (no cycling needed - we have exactly 10 colors)
  // Safety check: if index is out of bounds, use the last color
  return POLL_OPTION_COLORS[Math.min(index, POLL_OPTION_COLORS.length - 1)];
}

// Get just the hex color for charts
export function getOptionHexColor(text: string, index: number): string {
  return getOptionColor(text, index).hex;
}

// Get just the tailwind class for backgrounds
export function getOptionTailwindBg(text: string, index: number): string {
  return getOptionColor(text, index).tailwindBg;
}

// Get just the tailwind class for borders
export function getOptionTailwindBorder(text: string, index: number): string {
  return getOptionColor(text, index).tailwindBorder;
}
