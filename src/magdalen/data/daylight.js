// Each season has a representative solar declination. The daily clock is local solar time.
// This daylight study deliberately uses a slowly moving clock, not the device's date or time.
const latitude = (51.7519 * Math.PI) / 180;
const declination = [10.5, 22.3, -7.7, -21.4].map((d) => (d * Math.PI) / 180);
export const initialSolarHour = 14.05;
export const secondsPerSolarHour = 112;
export function daylight(weights, hour, out) {
  const dec = declination.reduce((v, d, i) => v + d * weights[i], 0);
  const H = ((hour - 12) * Math.PI) / 12,
    sd = Math.sin(dec),
    cd = Math.cos(dec),
    sl = Math.sin(latitude),
    cl = Math.cos(latitude);
  const h = sl * sd + cl * cd * Math.cos(H);
  out.set(-cd * Math.sin(H), Math.max(0.04, h), sl * cd * Math.cos(H) - cl * sd).normalize();
  const elevation = (Math.asin(h) * 180) / Math.PI;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const day = clamp((elevation + 5) / 18),
    lights = clamp((18 - elevation) / 15);
  return {
    power: 0.06 + 0.94 * day,
    ambient: 0.53 + 0.47 * day,
    lamps: lights * lights * (3 - 2 * lights),
    sunset: 12 + (Math.acos(-Math.tan(latitude) * Math.tan(dec)) * 12) / Math.PI,
  };
}
