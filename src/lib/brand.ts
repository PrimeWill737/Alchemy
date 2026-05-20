/** Product name shown in UI, emails, and sender display name. */
export const APP_BRAND_NAME = "Alchemy";

const LEGACY_BRAND_PATTERN = /CRM\s*Suite/gi;

/** Replace legacy branding in any email copy or subject. */
export function applyBrandName(text: string): string {
  return text.replace(LEGACY_BRAND_PATTERN, APP_BRAND_NAME);
}
