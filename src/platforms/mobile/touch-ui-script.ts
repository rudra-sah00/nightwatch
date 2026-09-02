/**
 * Pre-paint input-mode resolution.
 *
 * `useIsTouchUi` can only resolve after mount, which means a phone paints the
 * desktop control arrangement for one frame before swapping. YouTube avoids this
 * by routing mobile user agents to a separate frontend server-side; we can't do
 * that from a single Next app without risking a hydration mismatch when the
 * server's UA guess disagrees with the client's capability check.
 *
 * Instead — same trick `next-themes` uses for dark mode — a blocking script in
 * the document head writes {@link TOUCH_UI_ATTRIBUTE} on `<html>` before first
 * paint, and CSS keys off that attribute (`touch-ui:` / `pointer-ui:` variants).
 * `<html>` is outside React's diff (and carries `suppressHydrationWarning`), so
 * nothing hydrates against it.
 *
 * The script is a best-effort *hint*: `window.Capacitor` may not be injected yet
 * when it runs. `useIsTouchUi` re-evaluates after mount and corrects the
 * attribute, so the worst case is exactly the old behaviour — one frame of the
 * wrong arrangement — and the common case is none.
 *
 * @module touch-ui-script
 */

/** Attribute written on `<html>`. CSS variants read this. */
export const TOUCH_UI_ATTRIBUTE = 'data-touch-ui';

/** Resolved input modes. Absent attribute is treated as `pointer` by the CSS. */
export type TouchUiMode = 'touch' | 'pointer';

/**
 * Inline script source for the document head.
 *
 * Mirrors `isTouchPrimaryDevice` from `./use-touch-ui`. It cannot import it —
 * this runs before any bundle is evaluated — so the logic is duplicated on
 * purpose. `tests/platforms/mobile/touch-ui-script.test.ts` asserts the two
 * agree across a device matrix so they cannot drift apart silently.
 */
export const TOUCH_UI_INLINE_SCRIPT = `(function(){try{
var w=window,n=navigator,ua=n.userAgent||'',v='pointer',o=null,tv=false;
try{o=localStorage.getItem('nightwatch:touch-ui');tv=localStorage.getItem('__ANDROID_TV__')==='true'}catch(e){}
if(o==='touch'||o==='pointer'){v=o}
else if('electronAPI' in w||w.__ANDROID_TV__===true||tv){v='pointer'}
else if(w.Capacitor&&w.Capacitor.isNativePlatform&&w.Capacitor.isNativePlatform()===true){v='touch'}
else if(/iPhone|iPod|Android.+Mobile|webOS|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(ua)){v='touch'}
else if(/Windows NT|X11|Linux x86_64|CrOS/i.test(ua)){v='pointer'}
else if(/Macintosh|Mac OS X/i.test(ua)){v=n.maxTouchPoints>0?'touch':'pointer'}
else{v=(('ontouchstart' in w||n.maxTouchPoints>0)&&matchMedia('(pointer: coarse)').matches&&matchMedia('(hover: none)').matches)?'touch':'pointer'}
document.documentElement.setAttribute('${TOUCH_UI_ATTRIBUTE}',v)
}catch(e){}})()`;
