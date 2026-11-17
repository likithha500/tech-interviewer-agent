import type { Config } from 'tailwindcss';

export default <Config>{
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#001f3f', // navy blue
        accent: '#ff4136', // restrained red
        surface: '#f5f5f5', // subtle grey
      },
    },
  },
  plugins: [],
};
