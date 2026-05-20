/**
 * Build a URL to open the right client for replying (mailto, SMS, WhatsApp Web, tel).
 */
export function getMessageRespondUrl(channel: string, from: string): string | null {
  const ch = channel.trim().toLowerCase();
  const trimmedFrom = from.trim();

  if (ch === "email" || ch.includes("mail")) {
    const emailMatch = trimmedFrom.match(/[\w.+-]+@[\w.-]+\.\w+/);
    const addr = emailMatch ? emailMatch[0] : trimmedFrom.includes("@") ? trimmedFrom : null;
    if (!addr) return null;
    const subject = encodeURIComponent("Re: your message");
    return `mailto:${addr}?subject=${subject}`;
  }

  if (ch === "sms" || ch === "text" || ch.includes("sms")) {
    const digits = trimmedFrom.replace(/\D/g, "");
    if (digits.length < 10) return null;
    return `sms:${digits}`;
  }

  if (ch.includes("whatsapp")) {
    const digits = trimmedFrom.replace(/\D/g, "");
    if (digits.length < 10) return null;
    return `https://wa.me/${digits}`;
  }

  if (ch === "phone" || ch === "call" || ch.includes("voice") || ch.includes("tel")) {
    const digits = trimmedFrom.replace(/\D/g, "");
    if (digits.length < 10) return null;
    return `tel:+${digits}`;
  }

  if (trimmedFrom.includes("@")) {
    const subject = encodeURIComponent("Re: your message");
    return `mailto:${trimmedFrom}?subject=${subject}`;
  }

  return null;
}

export function openExternalUrl(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.click();
}
