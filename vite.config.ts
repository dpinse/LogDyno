import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

// The promise that logs never leave the browser, enforced by the browser: connect-src 'none'.
// It is a <meta> tag and not a response header because CloudFront's free flat-rate plan only allows
// AWS's standard headers. Build only: the dev server needs a websocket for hot reload.
// Inline styles are allowed because the chart library positions its elements with them.
const CSP =
	"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

export default defineConfig({
	plugins: [
		svelte(),
		{
			name: 'content-security-policy',
			apply: 'build',
			transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }]
		}
	],
	test: { include: ['src/**/*.test.ts'] }
});
