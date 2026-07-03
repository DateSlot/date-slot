<script lang="ts">
import { onMount } from "svelte";
import { ACTIVITY_OPTIONS, CUSTOM_ACTIVITY } from "./lib/types.ts";

let { username }: { username: string } = $props();

const PWD_KEY = "edit_password";

interface SlotRow {
  id: string;
  date: string;
  time_start: string;
  time_end: string;
  activity: string | null;
  is_booked: boolean;
  booker_name: string | null;
  created_at: string;
}

let password = $state("");
let loggedIn = $state(false);
let loginError = $state("");

let slots = $state<SlotRow[]>([]);
let likes = $state("");
let likesSaved = $state(false);
let likesSaving = $state(false);
let loading = $state(false);
let error = $state("");

let newDate = $state("");
let newTimeStart = $state("18:00");
let newTimeEnd = $state("21:00");
let newActivity = $state("");
let newCustomActivity = $state("");
let adding = $state(false);

let deleting = $state<string | null>(null);

onMount(async () => {
  const saved = sessionStorage.getItem(PWD_KEY);
  if (saved) {
    password = saved;
    await tryLogin();
  }
});

async function tryLogin() {
  loginError = "";
  try {
    const res = await fetch("/api/verify-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      loginError = "Wrong password";
      sessionStorage.removeItem(PWD_KEY);
      return;
    }
    loggedIn = true;
    sessionStorage.setItem(PWD_KEY, password);
    loadSlots();
  } catch {
    loginError = "Something went wrong";
  }
}

function login() {
  tryLogin();
}

function logout() {
  loggedIn = false;
  password = "";
  sessionStorage.removeItem(PWD_KEY);
  slots = [];
  likes = "";
}

async function loadSlots() {
  loading = true;
  error = "";
  try {
    const res = await fetch(`/api/manage-slots?username=${encodeURIComponent(username)}`, {
      headers: { Authorization: `Bearer ${password}` },
    });
    if (res.status === 401) { logout(); return; }
    if (!res.ok) throw new Error("Failed to load slots");
    const data = await res.json();
    slots = data.slots || [];
    likes = data.likes || "";
  } catch (e) {
    error = (e as Error).message;
  } finally {
    loading = false;
  }
}

async function addSlot() {
  if (!newDate || !newTimeStart || !newTimeEnd) return;
  adding = true;
  try {
    const activity = newActivity === CUSTOM_ACTIVITY
      ? newCustomActivity.trim() || null
      : newActivity || null;

    const res = await fetch(`/api/manage-slots?username=${encodeURIComponent(username)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ date: newDate, time_start: newTimeStart, time_end: newTimeEnd, activity }),
    });
    if (!res.ok) throw new Error("Failed to add slot");
    newDate = "";
    newTimeStart = "18:00";
    newTimeEnd = "21:00";
    newActivity = "";
    newCustomActivity = "";
    loadSlots();
  } catch (e) {
    error = (e as Error).message;
  } finally {
    adding = false;
  }
}

async function deleteSlot(slotId: string) {
  deleting = slotId;
  try {
    const res = await fetch(`/api/manage-slots?username=${encodeURIComponent(username)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ slot_id: slotId }),
    });
    if (!res.ok) throw new Error("Failed to delete");
    loadSlots();
  } catch (e) {
    error = (e as Error).message;
  } finally {
    deleting = null;
  }
}

async function saveLikes() {
  likesSaving = true;
  likesSaved = false;
  try {
    const res = await fetch("/api/update-likes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ username, likes }),
    });
    if (!res.ok) throw new Error("Failed to save");
    likesSaved = true;
    setTimeout(() => { likesSaved = false; }, 2000);
  } catch {
    error = "Failed to save likes";
  } finally {
    likesSaving = false;
  }
}

function activityEmoji(a: string | null) {
  if (!a) return "";
  const opt = ACTIVITY_OPTIONS.find((o) => o.id === a);
  return opt ? opt.emoji : "💫";
}

function activityTitle(a: string | null) {
  if (!a) return "";
  const opt = ACTIVITY_OPTIONS.find((o) => o.id === a);
  return opt ? opt.title : a;
}

function fmtTime(t: string) { return t?.slice(0, 5) ?? ""; }
function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  });
}

function publicUrl() {
  return typeof window !== "undefined" ? `${window.location.origin}/u/${username}` : "";
}
</script>

<div class="admin-card" class:wide={loggedIn}>
  <div class="deco">✧  ♡  ★  ♡  ✧</div>

  {#if !loggedIn}
    <h1>Manage your slots 🔐</h1>
    <p class="sub">Enter your password to edit</p>
    <div class="form">
      <input type="password" bind:value={password} class="text-input" placeholder="password"
        onkeydown={(e) => e.key === "Enter" && login()} />
      {#if loginError}
        <p class="form-error">{loginError}</p>
      {/if}
      <button class="btn confirm" onclick={login} disabled={!password}>Login 💖</button>
    </div>
  {:else}
    <div class="admin-header">
      <h1>Hey there! ✨</h1>
      <div class="header-actions">
        <a href={publicUrl()} class="btn-link" target="_blank">View page ↗</a>
        <button class="btn-logout" onclick={logout}>Logout</button>
      </div>
    </div>
    <p class="sub">{publicUrl()}</p>

    <div class="add-form">
      <h2>Add a free slot ✨</h2>
      <div class="add-form-row">
        <input type="date" bind:value={newDate} class="text-input" min={new Date().toISOString().split("T")[0]} />
        <input type="time" bind:value={newTimeStart} class="text-input time-input" />
        <input type="time" bind:value={newTimeEnd} class="text-input time-input" />
        <button class="btn confirm add-btn" onclick={addSlot} disabled={!newDate || adding}>
          {adding ? "Adding..." : "Add 💖"}
        </button>
      </div>
      <div class="activity-picker">
        <p class="activity-label">Activity (optional)</p>
        <div class="activity-options">
          <button class="activity-opt" class:active={newActivity === ""} onclick={() => { newActivity = ""; newCustomActivity = ""; }}>Any</button>
          {#each ACTIVITY_OPTIONS as opt}
            <button class="activity-opt" class:active={newActivity === opt.id} onclick={() => { newActivity = opt.id; newCustomActivity = ""; }}>
              {opt.emoji} {opt.title}
            </button>
          {/each}
          <button class="activity-opt" class:active={newActivity === CUSTOM_ACTIVITY} onclick={() => newActivity = CUSTOM_ACTIVITY}>
            ✏️ Custom
          </button>
        </div>
        {#if newActivity === CUSTOM_ACTIVITY}
          <input type="text" bind:value={newCustomActivity} class="text-input" placeholder="e.g. Bowling 🎳" />
        {/if}
      </div>
    </div>

    <div class="likes-form">
      <h2>Things I like 💖</h2>
      <textarea
        class="text-input likes-input"
        bind:value={likes}
        placeholder="e.g. sushi, sunsets, cats, board games..."
        rows="3"
      ></textarea>
      <div class="likes-actions">
        <button class="btn confirm likes-btn" onclick={saveLikes} disabled={likesSaving}>
          {likesSaving ? "Saving..." : "Save 💖"}
        </button>
        {#if likesSaved}
          <span class="saved-note">Saved! ✨</span>
        {/if}
      </div>
    </div>

    {#if error}
      <p class="form-error">{error}</p>
    {/if}

    {#if loading}
      <p class="sub">Loading...</p>
    {:else if slots.length === 0}
      <p class="sub">No slots yet. Add one above! ✨</p>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Activity</th>
              <th>Status</th>
              <th>Booker</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each slots as slot}
              <tr>
                <td>{fmtDate(slot.date)}</td>
                <td>{fmtTime(slot.time_start)} – {fmtTime(slot.time_end)}</td>
                <td class="activity-cell">
                  {#if slot.activity}
                    {activityEmoji(slot.activity)} {activityTitle(slot.activity)}
                  {:else}
                    <span class="any-activity">Any</span>
                  {/if}
                </td>
                <td>
                  <span class="badge" class:available={!slot.is_booked} class:booked={slot.is_booked}>
                    {slot.is_booked ? "Booked" : "Free"}
                  </span>
                </td>
                <td>{slot.booker_name ?? "—"}</td>
                <td>
                  {#if !slot.is_booked}
                    <button class="btn-delete" disabled={deleting === slot.id} onclick={() => deleteSlot(slot.id)}>
                      ✕
                    </button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<style>
  .admin-card {
    background: var(--white);
    border-radius: 32px;
    padding: 40px;
    max-width: 440px;
    width: 100%;
    text-align: center;
    box-shadow: 0 8px 32px var(--shadow);
  }
  .admin-card.wide {
    max-width: 720px;
    text-align: left;
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
    margin: 0;
    line-height: 1.3;
  }
  h2 {
    font-family: "Fredoka", sans-serif;
    font-weight: 500;
    font-size: 18px;
    color: var(--text);
    margin: 0 0 12px;
  }
  .sub {
    font-size: 16px;
    color: var(--text-light);
    margin: 8px 0 24px;
    word-break: break-all;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
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
  .time-input {
    width: 120px;
    flex-shrink: 0;
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
  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 8px;
  }
  .header-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .btn-link {
    font-family: "Fredoka", sans-serif;
    font-size: 14px;
    color: var(--purple);
    text-decoration: none;
    padding: 6px 16px;
    border: 2px solid var(--purple-light);
    border-radius: 20px;
    transition: background 0.15s;
  }
  .btn-link:hover {
    background: var(--pink-pale);
  }
  .btn-logout {
    font-family: "Fredoka", sans-serif;
    font-size: 14px;
    color: var(--pink);
    background: none;
    border: 2px solid var(--pink-light);
    border-radius: 20px;
    padding: 6px 16px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-logout:hover {
    background: var(--pink-pale);
  }
  .btn-delete {
    font-family: "Fredoka", sans-serif;
    font-size: 14px;
    width: 32px;
    height: 32px;
    border: 2px solid var(--pink-light);
    border-radius: 50%;
    background: white;
    color: var(--pink);
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .btn-delete:hover {
    background: var(--pink-pale);
    border-color: var(--pink);
  }
  .btn-delete:disabled {
    opacity: 0.4;
  }
  .add-form {
    background: var(--pink-pale);
    border-radius: 20px;
    padding: 20px;
    margin-bottom: 20px;
  }
  .add-form-row {
    display: flex;
    gap: 10px;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .add-btn {
    padding: 14px 24px !important;
    white-space: nowrap;
  }
  .activity-picker {
    margin-top: 14px;
  }
  .activity-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-light);
    margin: 0 0 8px;
  }
  .activity-options {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .activity-opt {
    font-family: "Fredoka", sans-serif;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 14px;
    border: 2px solid var(--purple-light);
    border-radius: 20px;
    background: white;
    color: var(--text);
    cursor: pointer;
    transition: all 0.15s;
  }
  .activity-opt:hover {
    background: var(--pink-pale);
  }
  .activity-opt.active {
    background: linear-gradient(135deg, var(--pink), var(--purple-light));
    color: white;
    border-color: transparent;
  }
  .likes-form {
    margin-bottom: 20px;
  }
  .likes-input {
    resize: vertical;
    font-size: 16px !important;
    min-height: 80px;
  }
  .likes-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 10px;
  }
  .likes-btn {
    padding: 10px 28px !important;
    font-size: 15px !important;
  }
  .saved-note {
    font-size: 14px;
    color: #155724;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 15px;
  }
  th {
    text-align: left;
    padding: 12px 10px;
    color: var(--text-light);
    font-weight: 500;
    border-bottom: 2px solid var(--pink-light);
  }
  td {
    padding: 10px;
    border-bottom: 1px solid var(--pink-pale);
    color: var(--text);
  }
  .activity-cell {
    font-size: 14px;
  }
  .any-activity {
    color: var(--text-light);
    font-style: italic;
  }
  .badge {
    font-size: 13px;
    font-weight: 500;
    padding: 4px 12px;
    border-radius: 12px;
  }
  .badge.available {
    background: #d4edda;
    color: #155724;
  }
  .badge.booked {
    background: var(--pink-pale);
    color: var(--pink);
  }
</style>
