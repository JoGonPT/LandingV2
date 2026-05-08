"use client";

import { useState, useEffect } from "react";

interface CookieConsentProps {
  dict: {
    text: string;
    policy: string;
    accept: string;
    reject: string;
  };
  locale: string;
}

export default function CookieConsent({ dict, locale }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setIsVisible(false);
  };

  const rejectCookies = () => {
    localStorage.setItem("cookie-consent", "rejected");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-2xl z-50 p-6 md:px-12">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-gray-600 text-sm max-w-2xl text-center md:text-left">
          <p>
            {dict.text}{" "}
            <a
              href={`/${locale}/legal/cookies`}
              className="text-black underline hover:text-gray-700 font-bold"
            >
              {dict.policy}
            </a>
            .
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={rejectCookies}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            {dict.reject}
          </button>
          <button
            onClick={acceptCookies}
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all text-sm font-semibold shadow-sm"
          >
            {dict.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
