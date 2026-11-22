// Illustrative snow cover, in scene seconds. Retention is relative to level grass.
// Snowfall and melt use the same world grid on desktop and mobile.
export const snowSettings = {
  updateInterval: 0.36,
  settleSeconds: 55,
  meltSeconds: 54,
  fallRamp: 1.6,
  airTail: 2.6,
  wind: [0.56, -0.23],
  particles: { desktop: 19400, mobile: 10500 },
  retention: {
    outside: 0,
    water: 0,
    ground: 0.89,
    lawn: 1,
    path: 0.4,
    road: 0.018,
    roof: 0.9,
    stone: 0.81,
    bridge: 0.3,
  },
};
