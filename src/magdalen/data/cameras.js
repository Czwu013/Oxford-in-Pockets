// Position is derived from a target, an azimuth clockwise from south toward east,
// an elevation and a real eye distance. Span is a width/height fitting reference in metres.
export const views = {
  bridge: { target: [0, 4, 0], az: 7, alt: 33, span: 218, distance: 445, style: 'overview', fit: true },
  cloister: { target: [1.8, 6.85, -28.8], az: 40, alt: 4.4, span: 12, distance: 15.7, style: 'court' },
  addison: { target: [65.4, 3.1, -51.4], az: -4, alt: 5.3, span: 23.5, distance: 32, style: 'bank' },
  may: { target: [-27, 16.8, 20], az: 18, alt: 13, span: 56, distance: 93, style: 'event' },
};
export const portraitBridge = { az: 58, alt: 49 };
