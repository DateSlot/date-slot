<script lang="ts">
import { onMount } from "svelte";
import confetti from "canvas-confetti";

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

let username = $state("");
let displayName = $state("");
let email = $state("");
let password = $state("");
let showPw = $state(false);
let creating = $state(false);
let error = $state("");
let done = $state(false);
let createdProfile = $state<{ username: string; display_name: string; email: string | null } | null>(null);

let usernameErr = $derived(username.trim() && !/^[a-z0-9-]+$/.test(username.trim())
  ? "Only lowercase letters, numbers, and hyphens" : "");
let emailErr = $derived(email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ? "Please enter a valid email address" : "");

async function create() {
  error = "";
  if (!username.trim() || !displayName.trim() || !email.trim() || !password.trim()) {
    error = "All fields are required";
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    error = "Please enter a valid email address";
    return;
  }
  if (!/^[a-z0-9-]+$/.test(username.trim())) {
    error = "Only lowercase letters, numbers, and hyphens";
    return;
  }
  if (password.trim().length < 4) {
    error = "Password must be at least 4 characters";
    return;
  }

  creating = true;
  try {
    const res = await fetch("/api/create-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim().toLowerCase(),
        display_name: displayName.trim(),
        email: email.trim(),
        password: password.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      error = data.error || "Something went wrong";
      return;
    }
    createdProfile = data;
    done = true;
    sessionStorage.setItem("edit_password", password.trim());
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ["#ff8fab", "#c77dff", "#ffb3c6", "#e0aaff"] });
  } catch {
    error = "Something went wrong";
  } finally {
    creating = false;
  }
}

function goToEdit() {
  if (createdProfile) {
    window.location.href = `/u/${createdProfile.username}/edit`;
  }
}
</script>

<div class="card" style="max-width:480px">
  <div class="deco">✧  ♡  ★  ♡  ✧</div>

  {#if done && createdProfile}
    <h1 class="font-fredoka font-semibold text-2xl text-text mb-2 leading-tight">You're live! 🎉</h1>
    <p class="sub">Your booking page is ready</p>
    <div class="bg-pink-pale rounded-2xl p-4 mb-5">
      <p class="text-xs text-text-light mb-1">Your public link</p>
      <code class="font-fredoka text-lg text-purple break-all">{window.location.origin}/u/{createdProfile.username}</code>
    </div>
    <div class="flex flex-col gap-5">
      <p class="sub" style="margin-bottom:0">Share this link so others can book your free slots!</p>
      <button class="btn btn-primary" onclick={goToEdit}>Manage slots →</button>
    </div>
  {:else}
    <h1 class="font-fredoka font-semibold text-2xl text-text mb-2 leading-tight">Create your booking page ✨</h1>
    <p class="sub">Get your own link to share with others</p>
    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-1.5 text-left">
        <label class="label" for="username">Username</label>
        <div class="flex items-stretch border-2 border-pink-light rounded-full bg-white focus-within:border-purple transition-[border-color] duration-150">
          <span class="flex items-center px-3 text-sm text-text-light bg-pink-pale whitespace-nowrap rounded-l-full">{window.location.origin}/u/</span>
          <input id="username" type="text" bind:value={username}
            class="font-fredoka text-lg px-3.5 py-3.5 border-0 bg-transparent text-text flex-1 outline-none rounded-r-full"
            placeholder="your-name" />
        </div>
        {#if usernameErr}
          <p class="form-error" style="text-align:left">{usernameErr}</p>
        {/if}
      </div>
      <div class="flex flex-col gap-1.5 text-left">
        <label class="label" for="name">Display name</label>
        <input id="name" type="text" bind:value={displayName}
          class="input" placeholder="e.g. your name" />
      </div>
      <div class="flex flex-col gap-1.5 text-left">
        <label class="label" for="email">Notification email</label>
        <input id="email" type="email" bind:value={email}
          class="input" placeholder="you@email.com" />
        {#if emailErr}
          <p class="form-error" style="text-align:left">{emailErr}</p>
        {/if}
        <p class="text-xs text-text-light ml-1 opacity-70">Get notified when someone books you</p>
      </div>
      <div class="flex flex-col gap-1.5 text-left">
        <label class="label" for="pass">Edit password</label>
        <div class="flex gap-2 items-stretch">
          <div class="flex-1 relative">
            <input id="pass" type={showPw ? "text" : "password"} bind:value={password}
              class="input w-full" placeholder="your password"
              onkeydown={(e) => e.key === "Enter" && create()} />
            <button class="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-text-light cursor-pointer text-lg p-0 leading-none"
              onclick={() => { showPw = !showPw; }}
              title={showPw ? "Hide" : "Show"}>{showPw ? "🙈" : "👁️"}</button>
          </div>
          <button class="btn border-2 border-purple-light bg-white text-purple shrink-0"
            style="padding:14px 16px;font-size:13px"
            onclick={() => { password = generatePassphrase(); }}
            title="Generate a random passphrase">🎲</button>
        </div>
        <p class="text-xs text-text-light ml-1 opacity-70">You'll need this to manage your slots later</p>
      </div>
      {#if error}
        <p class="form-error">{error}</p>
      {/if}
      <button class="btn btn-primary" disabled={creating} onclick={create}>
        {creating ? "Creating..." : "Create my page 💖"}
      </button>
    </div>
  {/if}
</div>
