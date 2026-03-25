/**
 * Lazily loads Google Fonts for subtitle styling.
 *
 * Instead of loading 14 font families in the root layout (render-blocking ~200KB CSS),
 * this function injects the stylesheet on demand when the user opens the subtitle
 * style panel — the only place these fonts are used.
 *
 * The link is injected once and reused across subsequent opens.
 */

const FONTS_LINK_ID = 'subtitle-google-fonts';

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?' +
  'family=Roboto:wght@400;500;700&' +
  'family=Open+Sans:wght@400;600;700&' +
  'family=Montserrat:wght@400;600;700&' +
  'family=Poppins:wght@400;600;700&' +
  'family=Lato:wght@400;700&' +
  'family=Nunito:wght@400;700&' +
  'family=Raleway:wght@400;700&' +
  'family=Oswald:wght@400;700&' +
  'family=Merriweather:wght@400;700&' +
  'family=Playfair+Display:wght@400;700&' +
  'family=Fira+Sans:wght@400;700&' +
  'family=Source+Sans+Pro:wght@400;700&' +
  'family=Bebas+Neue&' +
  'display=swap';

export function loadSubtitleFonts(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(FONTS_LINK_ID)) return;

  // Preconnect for faster font loading
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://fonts.googleapis.com';
  document.head.appendChild(preconnect);

  const preconnectStatic = document.createElement('link');
  preconnectStatic.rel = 'preconnect';
  preconnectStatic.href = 'https://fonts.gstatic.com';
  preconnectStatic.crossOrigin = 'anonymous';
  document.head.appendChild(preconnectStatic);

  // Load the fonts stylesheet
  const link = document.createElement('link');
  link.id = FONTS_LINK_ID;
  link.rel = 'stylesheet';
  link.href = GOOGLE_FONTS_URL;
  document.head.appendChild(link);
}
