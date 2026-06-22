import React, { useEffect, useRef } from 'react';

const KOFI_TEXT  = 'Support me on Ko-fi';
const KOFI_COLOR = '#72a4f2';
const KOFI_ID    = 'W2W820D9LK';

export default function KoFiButton() {
  const containerRef = useRef(null);

  useEffect(() => {
    // If the script is already loaded, just render the widget
    if (window.kofiwidget2) {
      renderWidget();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js';
    script.async = true;
    script.onload = renderWidget;
    document.head.appendChild(script);

    return () => {
      // Don't remove the script on unmount — it may be reused
    };
  }, []);

  function renderWidget() {
    if (!containerRef.current || !window.kofiwidget2) return;
    window.kofiwidget2.init(KOFI_TEXT, KOFI_COLOR, KOFI_ID);
    // getHTML() returns the button markup without using document.write
    containerRef.current.innerHTML = window.kofiwidget2.getHTML();
  }

  return (
    <div className="kofi-wrapper">
      <div ref={containerRef} className="kofi-container" />
    </div>
  );
}
