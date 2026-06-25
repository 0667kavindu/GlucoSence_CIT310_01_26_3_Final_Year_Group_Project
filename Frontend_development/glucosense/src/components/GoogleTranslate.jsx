import { useEffect } from 'react';

export default function GoogleTranslate() {
  useEffect(() => {
    if (document.getElementById('google_translate_element')?.childElementCount > 0) {
      return;
    }

    function initTranslate() {
      const container = document.getElementById('google_translate_element');
      if (container && container.childElementCount === 0) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            autoDisplay: false,
          },
          'google_translate_element'
        );
      }
    }

    window.googleTranslateElementInit = initTranslate;

   
    const existingScript = document.querySelector(
      'script[src*="translate_a/element.js"]'
    );

    if (!existingScript) {
      const script = document.createElement('script');
      script.src =
        'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate) {
      
    }
    
  }, []);

  return <div id="google_translate_element"></div>;
}