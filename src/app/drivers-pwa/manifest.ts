import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Way2Go Drivers",
    short_name: "W2G Drivers",
    description: "Way2Go chauffeur schedule and jobs",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait",
    lang: "en",
  };
}
