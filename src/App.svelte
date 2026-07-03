<script lang="ts">
import { onMount } from "svelte";
import Admin from "./Admin.svelte";
import CreateProfile from "./CreateProfile.svelte";
import PublicBookingPage from "./PublicBookingPage.svelte";
import ProfileEditor from "./ProfileEditor.svelte";

type Page = "home" | "admin" | "create-profile" | "profile-book" | "profile-edit";
let page: Page = $state("home");
let pageParams = $state<Record<string, string>>({});
let manageUsername = $state("");

function goToManage() {
  if (manageUsername.trim()) {
    window.location.href = `/u/${manageUsername.trim().toLowerCase()}/edit`;
  }
}

onMount(() => {
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
});
</script>

{#if page === "home"}
  <div class="card">
    <div class="deco">✧  ♡  ★  ♡  ✧</div>
    <h1>Date Slot ✨</h1>
    <p class="sub">Create your personal booking page and share the link with someone special 💕</p>
    <div class="flex-col">
      <a href="/create" class="btn primary">Create your page ✨</a>
      <div class="manage-row">
        <span class="manage-label">Already have one?</span>
        <input type="text" class="manage-input" placeholder="your-username" bind:value={manageUsername}
          onkeydown={(e) => e.key === "Enter" && goToManage()} />
        <button class="btn small" onclick={goToManage} disabled={!manageUsername.trim()}>Manage</button>
      </div>
    </div>
    <p class="footer-text">
      Made with 💖 &mdash; <a href="https://github.com/DateSlot/date-slot" class="footer-link">GitHub</a>
    </p>
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
{:else if page === "admin"}
  <Admin />
{/if}

<style>
  .card {
    background: var(--white);
    border-radius: 32px;
    padding: 48px 40px 36px;
    max-width: 420px;
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
    font-size: 32px;
    color: var(--text);
    margin: 0 0 8px;
    line-height: 1.3;
  }

  .sub {
    font-size: 16px;
    color: var(--text-light);
    margin: 0 0 32px;
    line-height: 1.5;
  }

  .flex-col {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
  }

  .btn {
    font-family: "Fredoka", sans-serif;
    font-size: 18px;
    font-weight: 500;
    padding: 14px 48px;
    border: none;
    border-radius: 60px;
    cursor: pointer;
    white-space: nowrap;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
  }

  .primary {
    background: linear-gradient(135deg, var(--pink), var(--purple-light));
    color: white;
    box-shadow: 0 4px 16px rgba(200, 120, 180, 0.3);
  }

  .primary:hover {
    transform: scale(1.06);
    box-shadow: 0 6px 24px rgba(200, 120, 180, 0.45);
  }

  .primary:active {
    transform: scale(0.95);
  }

  .small {
    font-size: 14px;
    padding: 8px 20px;
    background: linear-gradient(135deg, var(--pink), var(--purple-light));
    color: white;
    box-shadow: 0 2px 8px rgba(200, 120, 180, 0.25);
  }

  .small:hover:not(:disabled) {
    transform: scale(1.06);
  }

  .small:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .manage-row {
    background: var(--pink-pale);
    padding: 12px 18px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .manage-label {
    font-size: 14px;
    color: var(--text-light);
  }

  .manage-input {
    font-family: "Fredoka", sans-serif;
    font-size: 14px;
    padding: 8px 14px;
    border: 2px solid var(--pink-light);
    border-radius: 14px;
    background: white;
    color: var(--text);
    width: 160px;
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }

  .manage-input:focus {
    border-color: var(--purple);
  }

  .back-link {
    font-family: "Fredoka", sans-serif;
    font-size: 14px;
    color: var(--text-light);
    text-decoration: none;
    padding: 6px 14px;
    border: 2px solid var(--pink-light);
    border-radius: 20px;
    background: var(--white);
    position: fixed;
    top: 16px;
    left: 16px;
    z-index: 10;
    transition: background 0.15s, color 0.15s;
  }

  .back-link:hover {
    background: var(--pink-pale);
    color: var(--text);
  }

  .footer-text {
    font-size: 13px;
    color: var(--text-light);
    margin: 32px 0 0;
  }

  .footer-link {
    color: var(--purple);
    text-decoration: none;
  }

  .footer-link:hover {
    text-decoration: underline;
  }
</style>
