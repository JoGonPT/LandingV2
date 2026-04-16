export function googleMapsNavigateUrl(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function wazeNavigateUrl(destination: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`;
}

export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function telHref(phone: string): string {
  const d = phoneDigits(phone);
  return d ? `tel:${d}` : "#";
}

export function whatsappHref(phone: string): string {
  const d = phoneDigits(phone);
  if (!d) return "#";
  return `https://wa.me/${d}`;
}
