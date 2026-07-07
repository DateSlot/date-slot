<script lang="ts">
import { onMount } from "svelte";
import confetti from "canvas-confetti";

let username = $state("");
let displayName = $state("");
let email = $state("");
let password = $state("");
let creating = $state(false);
let error = $state("");
let done = $state(false);
let createdProfile = $state<{ username: string; display_name: string; email: string | null } | null>(null);

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
  if (!/^[a-z0-9-]+$/.test(username.trim().toLowerCase())) {
    error = "Username: lowercase letters, numbers, and hyphens only";
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
        <p class="text-xs text-text-light ml-1 opacity-70">Get notified when someone books you</p>
      </div>
      <div class="flex flex-col gap-1.5 text-left">
        <label class="label" for="pass">Edit password</label>
        <input id="pass" type="password" bind:value={password}
          class="input" placeholder="at least 4 characters"
          onkeydown={(e) => e.key === "Enter" && create()} />
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
