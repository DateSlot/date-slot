<script lang="ts">
import { onMount, tick } from "svelte";
import { gsap } from "gsap";
import CreateProfile from "./CreateProfile.svelte";
import PublicBookingPage from "./PublicBookingPage.svelte";
import ProfileEditor from "./ProfileEditor.svelte";

type Page =
  | "home"
  | "create-profile"
  | "profile-book"
  | "profile-edit";
let page: Page = $state("home");
let pageParams = $state<Record<string, string>>({});

let manageUsername = $state("");
let manageEl = $state<HTMLElement>();
let createEl = $state<HTMLElement>();

let createUsername = $state("");
let createDisplayName = $state("");
let createEmail = $state("");
let createPassword = $state("");
let createShowPw = $state(false);
let creating = $state(false);
let createError = $state("");
let createdProfile = $state<{ username: string } | null>(null);

let usernameErr = $derived(createUsername.trim() && !/^[a-z0-9-]+$/.test(createUsername.trim())
  ? "Only lowercase letters, numbers, and hyphens" : "");
let emailErr = $derived(createEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail.trim())
  ? "Please enter a valid email address" : "");

const PASSPHRASE_WORDS = [
  "cherry","blossom","sunset","rainbow","butterfly","honey","moonlight",
  "starlight","cupcake","bubble","garden","ocean","crystal","velvet",
  "caramel","lollipop","daisy","maple","amber","clover","pixie","breeze",
  "coral","pearl","tulip","sugar","sparkle","twilight","waffle","pudding",
  "cotton","candy","jelly","snuggle","purr","whisker","pancake","muffin",
  "cookie","sprinkle","button","ribbon","glitter","dewdrop","petal","cozy",
  "fuzzy","gentle","merry","pepper","toffee",
];

function generatePassphrase() {
  const words: string[] = [];
  for (let i = 0; i < 5; i++) {
    words.push(PASSPHRASE_WORDS[Math.floor(Math.random() * PASSPHRASE_WORDS.length)]);
  }
  return words.join("-");
}

function goToManage() {
  if (manageUsername.trim()) {
    window.location.href = `/u/${manageUsername.trim().toLowerCase()}/edit`;
  }
}

async function startCreate() {
  history.pushState({ create: true }, "");
  await tick();
  const tl = gsap.timeline();
  tl.to(manageEl, { opacity: 0, y: -10, duration: 0.2, ease: "power2.out" })
    .set(manageEl, { display: "none" })
    .set(createEl, { display: "flex", opacity: 0, y: 20 })
    .to(createEl, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
}

async function cancelCreate() {
  createdProfile = null;
  createUsername = "";
  createDisplayName = "";
  createEmail = "";
  createPassword = "";
  createError = "";
  history.replaceState(null, "", window.location.pathname);
  const tl = gsap.timeline();
  tl.to(createEl, { opacity: 0, y: 20, duration: 0.2, ease: "power2.in" })
    .set(createEl, { display: "none" })
    .set(manageEl, { display: "flex", opacity: 0, y: -10 })
    .to(manageEl, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
}

async function createProfile() {
  createError = "";
  if (!createUsername.trim() || !createDisplayName.trim() || !createEmail.trim() || !createPassword.trim()) {
    createError = "All fields are required";
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail.trim())) {
    createError = "Please enter a valid email address";
    return;
  }
  if (!/^[a-z0-9-]+$/.test(createUsername.trim())) {
    createError = "Only lowercase letters, numbers, and hyphens";
    return;
  }
  if (createPassword.trim().length < 4) {
    createError = "Password must be at least 4 characters";
    return;
  }

  creating = true;
  try {
    const res = await fetch("/api/create-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: createUsername.trim().toLowerCase(),
        display_name: createDisplayName.trim(),
        email: createEmail.trim(),
        password: createPassword.trim(),
        ...(window.turnstile?.getResponse() ? { turnstile_token: window.turnstile.getResponse() } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      createError = data.error || "Something went wrong";
      return;
    }
    sessionStorage.setItem("edit_password", createPassword.trim());
    createdProfile = { username: createUsername.trim().toLowerCase() };
    await tick();
    gsap.fromTo(".success-state", { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" });
  } catch {
    createError = "Something went wrong";
  } finally {
    creating = false;
  }
}

function goToEdit() {
  if (createdProfile) {
    window.location.href = `/u/${createdProfile.username}/edit`;
  }
}

function resendEmail() {
  createProfile();
}

let darkMode = $state(false);

onMount(() => {
  const stored = localStorage.getItem("dark");
  const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
  darkMode = stored !== null ? stored === "true" : prefers;
  applyDark(darkMode);

  const path = window.location.pathname;

  const editMatch = path.match(/^\/u\/([^/]+)\/edit$/);
  if (editMatch) {
    page = "profile-edit";
    pageParams = { username: editMatch[1] };
    document.title = "Manage your slots";
    return;
  }

  const profileMatch = path.match(/^\/u\/([^/]+)$/);
  if (profileMatch) {
    page = "profile-book";
    pageParams = { username: profileMatch[1] };
    return;
  }

  if (path === "/create") {
    page = "create-profile";
    document.title = "Create your booking page";
    return;
  }

  window.addEventListener("popstate", () => {
    if (page === "home" && createEl && createEl.style.display !== "none") {
      cancelCreate();
    }
  });
});

function applyDark(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("dark", String(dark));
}

function toggleDark() {
  darkMode = !darkMode;
  applyDark(darkMode);
}
</script>

<svelte:head>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

{#if page === "home"}
  <div class="card" style="padding-bottom:36px;overflow:hidden">
    <div bind:this={manageEl} class="flex flex-col items-stretch gap-3">
      <div class="deco">✧  ♡  ★  ♡  ✧</div>
      <h1 class="font-fredoka text-3xl font-semibold text-text mb-2">Date Slot ✨</h1>
      <p class="sub">Create your personal booking page and share the link with someone special 💕</p>
      <span class="text-sm text-text-light text-center">I already have a page:</span>
      <input type="text"
      class="input"
      placeholder="your-username"
      bind:value={manageUsername}
        onkeydown={(e) => e.key === "Enter" && goToManage()}
        aria-label="Your username" />
        <button class="btn btn-primary w-full" onclick={goToManage} disabled={!manageUsername.trim()}>Manage 🔐</button>
        <span class="text-sm text-text-light text-center mt-4">I don't have one yet:</span>
        <button class="btn btn-primary w-full text-lg" onclick={startCreate}>🌟 Create my own page ✨</button>
        <p class="text-xs text-text-light mt-6">
          Made with 💖 &mdash; <a href="https://github.com/DateSlot/date-slot" class="text-purple no-underline hover:underline">GitHub</a>
        </p>
      </div>

      <div bind:this={createEl} class="flex flex-col items-stretch gap-3" style="display:none">
      {#if createdProfile}
        <div class="success-state">
          <div class="deco">✧  ♡  ★  ♡  ✧</div>
          <h1 class="font-fredoka font-semibold text-2xl text-text mb-2 leading-tight">Check your email! 📧</h1>
          <p class="sub">We sent a confirmation link to your inbox.</p>
          <div class="bg-pink-pale rounded-2xl p-4 mb-4">
            <p class="text-sm text-text leading-relaxed">
              Click the link in the email to activate your page.
              <br /><br />
              <strong>📁 Didn't see it? Check your Spam folder!</strong>
            </p>
          </div>
          <button class="btn btn-primary" onclick={goToEdit}>I confirmed, take me there →</button>
        </div>
      {:else}
        <div class="deco">✧  ♡  ★  ♡  ✧</div>
        <h1 class="font-fredoka font-semibold text-2xl text-text mb-1 leading-tight">Create your page ✨</h1>
        <p class="sub" style="margin-bottom:12px">Get your own link to share with others</p>
        <div class="flex justify-start">
          <button class="text-sm text-text-light bg-transparent border-none font-fredoka cursor-pointer px-1 py-0.5 hover:text-text transition-colors duration-150" onclick={cancelCreate}>← Back</button>
        </div>
        <div class="flex flex-col gap-3.5">
          <div class="flex flex-col gap-1.5 text-left">
            <label class="label" for="create-username">Username</label>
            <div class="flex items-stretch border-2 border-pink-light rounded-full bg-white focus-within:border-purple transition-[border-color] duration-150">
              <span class="flex items-center px-3 text-sm text-text-light bg-pink-pale whitespace-nowrap rounded-l-full shrink-0">{window.location.host}/u/</span>
              <input id="create-username" type="text" bind:value={createUsername}
                class="font-fredoka text-lg px-3.5 py-3 border-0 bg-transparent text-text flex-1 outline-none rounded-r-full min-w-0"
                placeholder="your-name" />
            </div>
            {#if usernameErr}
              <p class="form-error" style="text-align:left" role="alert">{usernameErr}</p>
            {/if}
          </div>
          <div class="flex flex-col gap-1.5 text-left">
            <label class="label" for="create-name">Display name</label>
            <input id="create-name" type="text" bind:value={createDisplayName}
              class="input" placeholder="e.g. your name" />
          </div>
          <div class="flex flex-col gap-1.5 text-left">
            <label class="label" for="create-email">Notification email</label>
            <input id="create-email" type="email" bind:value={createEmail}
              class="input" placeholder="you@email.com" />
            {#if emailErr}
              <p class="form-error" style="text-align:left" role="alert">{emailErr}</p>
            {/if}
            <p class="text-xs text-text-light ml-1 opacity-70">Get notified when someone books you</p>
          </div>
          <div class="flex flex-col gap-1.5 text-left">
            <label class="label" for="create-pass">Edit password</label>
            <div class="flex gap-2 items-stretch">
              <div class="flex-1 relative">
                <input id="create-pass" type={createShowPw ? "text" : "password"} bind:value={createPassword}
                  class="input w-full" placeholder="your password"
                  onkeydown={(e) => e.key === "Enter" && createProfile()} />
                <button class="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-text-light cursor-pointer text-lg p-0 leading-none"
                  onclick={() => { createShowPw = !createShowPw; }}
                  title={createShowPw ? "Hide" : "Show"}
                  aria-label={createShowPw ? "Hide password" : "Show password"}>{createShowPw ? "🙈" : "👁️"}</button>
              </div>
              <button class="btn border-2 border-purple-light bg-white text-purple shrink-0"
                style="padding:14px 16px;font-size:13px"
                onclick={() => { createPassword = generatePassphrase(); }}
                title="Generate a random passphrase"
                aria-label="Generate random passphrase">🎲</button>
            </div>
          </div>
          {#if import.meta.env.VITE_TURNSTILE_SITE_KEY}
            <div id="turnstile-widget" class="cf-turnstile" data-sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY} style="margin:12px 0"></div>
          {/if}
          {#if createError}
            <p class="form-error" role="alert">{createError}</p>
          {/if}
          <button class="btn btn-primary" disabled={creating} onclick={createProfile}>
            {creating ? "Creating..." : "Create my page 💖"}
          </button>
        </div>
      {/if}
    </div>
  </div>
{:else if page === "create-profile"}
  <a href="/" class="back-link">← Home</a>
  <CreateProfile />
{:else if page === "profile-book"}
  <a href="/" class="back-link">← Home</a>
  <PublicBookingPage username={pageParams.username} />
{:else if page === "profile-edit"}
  <a href="/" class="back-link">← Home</a>
  <ProfileEditor username={pageParams.username} />
{/if}

<button class="dark-toggle" onclick={toggleDark} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
  {darkMode ? "☀️" : "🌙"}
</button>

<style>
  .dark-toggle {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 100;
    width: 42px;
    height: 42px;
    border: 2px solid var(--color-pink-light, #ffb3c6);
    border-radius: 50%;
    background: var(--color-white, #fff5f7);
    cursor: pointer;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .dark-toggle:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }
  .dark-toggle:focus-visible {
    outline: 2px solid var(--color-purple, #c77dff);
    outline-offset: 3px;
  }
</style>
