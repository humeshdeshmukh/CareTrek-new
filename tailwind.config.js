/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary colors
        primary: '#2F855A',
        'primary-light': '#48BB78',
        accent: '#E2B97C',
        
        // Background & surface
        background: '#FFFBEF',
        surface: '#FFFFFF',
        border: '#E5E5E5',
        
        // Text colors
        'text-primary': '#1A202C',
        'text-secondary': '#4A5568',
        'text-light': '#718096',
        
        // Status colors
        success: '#38A169',
        warning: '#ED8936',
        error: '#E53E3E',
        
        // Dark mode colors
        dark: {
          background: '#171923',
          surface: '#2D3748',
          'text-primary': '#F7FAFC',
          'text-secondary': '#CBD5E0',
        },
      },
      fontFamily: {
        sans: ['Inter_400Regular', 'sans-serif'],
        'sans-medium': ['Inter_500Medium', 'sans-serif'],
        'sans-semibold': ['Inter_600SemiBold', 'sans-serif'],
        'sans-bold': ['Inter_700Bold', 'sans-serif'],
        mono: ['SpaceMono_400Regular', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      boxShadow: {
        DEFAULT: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        },
        hover: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 3,
        },
      },
    },
  },
  plugins: [],
}
