import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [svelte(), tailwindcss()],
	server: {
		host: "127.0.0.1", // Forces Vite to use IPv4
		port: 5173, // Or your preferred port
	},
});
