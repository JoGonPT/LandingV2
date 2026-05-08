"use client";

import { useEffect, useState, useRef } from "react";

interface BookingFormProps {
    dict: {
        title: string;
        [key: string]: unknown;
    };
    locale: string;
}

export default function BookingForm({ dict, locale }: BookingFormProps) {
    const embedUrl = `https://reserve-transfer.com/embed/form/503462c7-15db-4fdc-a35c-729c5772412d?lang=${locale}`;
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || !containerRef.current) return;

        const container = containerRef.current;

        // Cleanup function to remove existing widget components when language changes
        const cleanup = () => {
            // Remove previous script
            const existingScript = document.querySelector('script[src*="reserve-transfer.com/assets/widgets.js"]');
            if (existingScript) existingScript.remove();
            
            // Remove existing iframes from the container and globally
            container.innerHTML = "";
            document.querySelectorAll('iframe[id="transfervista_form"]').forEach((el) => el.remove());
            document.querySelectorAll('iframe[src*="reserve-transfer.com"]').forEach((el) => el.remove());
        };

        cleanup();

        // Watch for the iframe being injected anywhere in the DOM and move it into our container
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of Array.from(mutation.addedNodes)) {
                    if (!(node instanceof HTMLElement)) continue;

                    const targetIframe = 
                        (node instanceof HTMLIFrameElement && (node.id === "transfervista_form" || node.src?.includes("reserve-transfer.com"))) 
                        ? node 
                        : node.querySelector?.('iframe[id="transfervista_form"], iframe[src*="reserve-transfer.com"]');

                    if (targetIframe && targetIframe instanceof HTMLIFrameElement) {
                        if (!container.contains(targetIframe)) {
                            container.appendChild(targetIframe);
                            styleIframe(targetIframe);
                        }
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Force reload: Always inject the script to ensure the widget re-initializes with the new locale
        const script = document.createElement("script");
        script.src = "https://reserve-transfer.com/assets/widgets.js";
        script.setAttribute("data-load-embed", embedUrl);
        script.async = true;
        document.body.appendChild(script);

        return () => {
            observer.disconnect();
            // Don't call cleanup on unmount to allow the script to finish if it's just a re-render
        };
    }, [mounted, locale, embedUrl]); // Added locale to dependencies to force re-run

    return (
        <div className="w-full h-full relative">
            <div
                ref={containerRef}
                id="booking-widget-container"
                className="relative w-full h-full bg-white transition-opacity duration-300"
                style={{ minHeight: "600px" }}
            >
                {/* 
                   Loading overlay: 
                   Always show while mounted is true but iframe 
                   is still arriving (the observer will eventually put it here)
                */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 space-y-4 bg-white z-10 pointer-events-none opacity-100 animate-pulse">
                    <div className="w-10 h-10 border-2 border-gray-100 border-t-black rounded-full animate-spin"></div>
                    <span className="text-xs tracking-widest uppercase font-medium text-black">Way2Go</span>
                </div>
            </div>
        </div>
    );
}

function styleIframe(iframe: HTMLIFrameElement) {
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.minHeight = "600px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "12px";
    iframe.style.display = "block";
    iframe.style.position = "relative";
    // Once styled and appended, we can hide the loading overlay via CSS if needed, 
    // but here we just ensure the iframe is on top
    iframe.style.zIndex = "20";
}
