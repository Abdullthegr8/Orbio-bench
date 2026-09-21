import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fog: "#EEF2F6",
        track: "#DCE3EB",
        ink: "#101A2A",
        slate: "#5B6B80",
        teal: { DEFAULT: "#0F8B8D", soft: "#D5EEEE" },
        tealdark: "#0B6E70",
        brick: { DEFAULT: "#C93C34", soft: "#F6DDDA" },
        brickdark: "#A32A23",
        amber: { DEFAULT: "#C48A14", soft: "#F5E7C8" },
        amberdark: "#7A4F0C",
        ember: "#D9651F",
        emberdark: "#A24A12",
      },
      fontFamily: {
        display: ['"Chakra Petch"', "ui-sans-serif", "system-ui", "sans-serif"],
        body: ['"Public Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
