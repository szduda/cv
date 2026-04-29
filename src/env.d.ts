/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Set by `base` in astro.config — never define `BASE_URL` in .env (Astro 6 would override this). */
  readonly BASE_URL: string;
}
