<script lang="ts">
import { onMount } from "svelte";
import confetti from "canvas-confetti";

let username = $state("");
let displayName = $state("");
let password = $state("");
let creating = $state(false);
let error = $state("");
let done = $state(false);
let createdProfile = $state<{ username: string; display_name: string } | null>(null);

async function create() {
  error = "";
  if (!username.trim() || !displayName.trim() || !password.trim()) {
    error = "All fields are required";
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

<div class="card">
  <div class="deco">✧  ♡  ★  ♡  ✧</div>

  {#if done && createdProfile}
    <h1>You're live! 🎉</h1>
    <p class="sub">Your booking page is ready</p>
    <div class="result-box">
      <p class="result-label">Your public link</p>
      <code class="result-link">{window.location.origin}/u/{createdProfile.username}</code>
    </div>
    <div class="form">
      <p class="sub" style="margin-bottom:0">Share this link so others can book your free slots!</p>
      <button class="btn confirm" onclick={goToEdit}>Manage slots →</button>
    </div>
  {:else}
    <h1>Create your booking page ✨</h1>
    <p class="sub">Get your own link to share with others</p>
    <div class="form">
      <div class="field">
        <label class="field-label" for="username">Username</label>
        <div class="input-prefix">
          <span class="prefix">{window.location.origin}/u/</span>
          <input id="username" type="text" bind:value={username} class="text-input prefix-input" placeholder="your-name" />
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="name">Display name</label>
        <input id="name" type="text" bind:value={displayName} class="text-input" placeholder="e.g. your name" />
      </div>
      <div class="field">
        <label class="field-label" for="pass">Edit password</label>
        <input id="pass" type="password" bind:value={password} class="text-input" placeholder="at least 4 characters"
          onkeydown={(e) => e.key === "Enter" && create()} />
        <p class="field-hint">You'll need this to manage your slots later</p>
      </div>
      {#if error}
        <p class="form-error">{error}</p>
      {/if}
      <button class="btn confirm" disabled={creating} onclick={create}>
        {creating ? "Creating..." : "Create my page 💖"}
      </button>
    </div>
  {/if}
</div>

<style>
  .card {
    background: var(--white);
    border-radius: 32px;
    padding: 48px 40px 40px;
    max-width: 480px;
    width: 100%;
    text-align: center;
    box-shadow: 0 8px 32px var(--shadow);
  }
  .deco {
    font-size: 20px;
    letter-spacing: 8px;
    color: var(--pink-light);
    margin-bottom: 8px;
  }
  h1 {
    font-family: "Fredoka", sans-serif;
    font-weight: 600;
    font-size: 28px;
    color: var(--text);
    margin: 0 0 8px;
    line-height: 1.3;
  }
  .sub {
    font-size: 16px;
    color: var(--text-light);
    margin: 0 0 32px;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;
  }
  .field-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-light);
    padding-left: 4px;
  }
  .field-hint {
    font-size: 12px;
    color: var(--text-light);
    margin: 0;
    padding-left: 4px;
    opacity: 0.7;
  }
  .text-input {
    font-family: "Fredoka", sans-serif;
    font-size: 18px;
    padding: 14px 20px;
    border: 2px solid var(--pink-light);
    border-radius: 16px;
    background: white;
    color: var(--text);
    width: 100%;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s;
  }
  .text-input:focus {
    border-color: var(--purple);
  }
  .input-prefix {
    display: flex;
    align-items: stretch;
    border: 2px solid var(--pink-light);
    border-radius: 16px;
    overflow: hidden;
    background: white;
    transition: border-color 0.15s;
  }
  .input-prefix:focus-within {
    border-color: var(--purple);
  }
  .prefix {
    display: flex;
    align-items: center;
    padding: 0 6px 0 14px;
    font-size: 14px;
    color: var(--text-light);
    background: var(--pink-pale);
    white-space: nowrap;
  }
  .prefix-input {
    border: none !important;
    border-radius: 0 !important;
    padding: 14px 14px 14px 6px !important;
  }
  .form-error {
    font-size: 14px;
    color: var(--pink);
    text-align: center;
    margin: 0;
  }
  .btn {
    font-family: "Fredoka", sans-serif;
    font-size: 18px;
    font-weight: 500;
    padding: 14px 48px;
    border: none;
    border-radius: 60px;
    cursor: pointer;
  }
  .confirm {
    background: linear-gradient(135deg, var(--pink), var(--purple-light));
    color: white;
    box-shadow: 0 4px 16px rgba(200, 120, 180, 0.3);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
  }
  .confirm:hover:not(:disabled) {
    transform: scale(1.06);
    box-shadow: 0 6px 24px rgba(200, 120, 180, 0.45);
  }
  .confirm:active:not(:disabled) {
    transform: scale(0.95);
  }
  .confirm:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .result-box {
    background: var(--pink-pale);
    border-radius: 16px;
    padding: 16px 20px;
    margin-bottom: 20px;
  }
  .result-label {
    font-size: 13px;
    color: var(--text-light);
    margin: 0 0 6px;
  }
  .result-link {
    font-family: "Fredoka", sans-serif;
    font-size: 18px;
    color: var(--purple);
    word-break: break-all;
  }
</style>
