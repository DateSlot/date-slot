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
  booking: {
    id: string;
    name: string;
    email: string;
    activity: string | null;
    status: string;
    deny_reason: string | null;
    created_at: string;
  } | null;
  created_at: string;
}

let password = $state("");
let loggedIn = $state(false);
let loginError = $state("");

let slots = $state<SlotRow[]>([]);
let profileEmail = $state("");
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
let confirming = $state<string | null>(null);
let denying = $state<string | null>(null);
let denyReason = $state("");
let confirmError = $state("");

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
  profileEmail = "";
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
    profileEmail = data.email || "";
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

async function confirmBooking(rsvpId: string) {
  confirmError = "";
  confirming = rsvpId;
  try {
    const res = await fetch("/api/confirm-booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ rsvp_id: rsvpId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to confirm");
    }
    loadSlots();
  } catch (e) {
    confirmError = (e as Error).message;
  } finally {
    confirming = null;
  }
}

async function denyBooking(rsvpId: string) {
  confirmError = "";
  denying = rsvpId;
  try {
    const res = await fetch("/api/deny-booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`,
      },
      body: JSON.stringify({ rsvp_id: rsvpId, reason: denyReason.trim() || undefined }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to deny");
    }
    denyReason = "";
    loadSlots();
  } catch (e) {
    confirmError = (e as Error).message;
  } finally {
    denying = null;
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

function pendingSlots() {
  return slots.filter((s) => s.booking?.status === "pending");
}

function publicUrl() {
  return typeof window !== "undefined" ? `${window.location.origin}/u/${username}` : "";
}
</script>

<div class="card" class:wide={loggedIn} style={loggedIn ? "max-width:720px;text-align:left" : "max-width:440px"}>
  <div class="deco">✧  ♡  ★  ♡  ✧</div>

  {#if !loggedIn}
    <h1 class="title">Manage your slots 🔐</h1>
    <p class="sub">Enter your password to edit</p>
    <div class="flex flex-col gap-4">
      <input type="password" bind:value={password} class="input" placeholder="password"
        onkeydown={(e) => e.key === "Enter" && login()} />
      {#if loginError}
        <p class="form-error">{loginError}</p>
      {/if}
      <button class="btn btn-primary" onclick={login} disabled={!password}>Login 💖</button>
    </div>
  {:else}
    <div class="flex justify-between items-center flex-wrap gap-3 mb-2">
      <h1 class="title" style="margin:0">Hey there! ✨</h1>
      <div class="flex gap-2.5 items-center">
        <a href={publicUrl()} class="btn-link" target="_blank">View page ↗</a>
        <button class="btn-logout" onclick={logout}>Logout</button>
      </div>
    </div>
    <p class="sub" style="word-break:break-all">{publicUrl()}</p>

    {#if !profileEmail}
      <div class="bg-pink-pale rounded-2xl p-3 mb-4 text-center">
        <p class="text-sm text-text m-0">
          ⚠️ You haven't set your notification email yet.
          <a href="/create" class="text-purple no-underline hover:underline">Create a new profile</a> with an email to get notified of bookings.
        </p>
      </div>
    {/if}

    {#each pendingSlots() as slot}
      <div class="bg-pink-pale rounded-2xl p-4 mb-4 border-2 border-pink-light">
        <div class="flex justify-between items-start flex-wrap gap-2">
          <div>
            <p class="font-semibold text-text m-0 text-lg">{slot.booking!.name}</p>
            <p class="text-sm text-text-light m-0">{slot.booking!.email}</p>
          </div>
          <div class="badge" class:pending={true}>Pending</div>
        </div>
        <p class="text-sm text-text m-0 mt-1">
          📅 {fmtDate(slot.date)} · 🕐 {fmtTime(slot.time_start)} – {fmtTime(slot.time_end)}
          {#if slot.activity || slot.booking?.activity}
            · {activityEmoji(slot.activity || slot.booking!.activity)} {activityTitle(slot.activity || slot.booking!.activity)}
          {/if}
        </p>
        {#if confirmError}
          <p class="form-error" style="margin-top:6px">{confirmError}</p>
        {/if}
        <div class="flex gap-2 mt-3 items-center">
          <button class="btn btn-primary" style="padding:8px 20px;font-size:14px"
            disabled={confirming === slot.booking!.id || denying === slot.booking!.id}
            onclick={() => confirmBooking(slot.booking!.id)}>
            {confirming === slot.booking!.id ? "Confirming..." : "Accept ✅"}
          </button>
          <button class="btn border-2 border-pink-light bg-white text-pink"
            style="padding:8px 20px;font-size:14px"
            disabled={confirming === slot.booking!.id || denying === slot.booking!.id}
            onclick={() => { denyReason = ""; denying = slot.booking!.id; }}>
            Deny ❌
          </button>
          {#if denying === slot.booking!.id}
            <div class="flex gap-2 items-center flex-1">
              <input type="text" bind:value={denyReason} class="input" placeholder="Reason (optional)"
                style="font-size:14px;padding:8px 14px" />
              <button class="btn border-2 border-pink bg-pink-pale text-pink"
                style="padding:8px 16px;font-size:13px;white-space:nowrap"
                onclick={() => denyBooking(slot.booking!.id)}>Send</button>
              <button class="btn border-none bg-transparent text-text-light"
                style="padding:8px;font-size:13px"
                onclick={() => { denying = null; denyReason = ""; }}>Cancel</button>
            </div>
          {/if}
        </div>
      </div>
    {/each}

    <div class="bg-pink-pale rounded-2xl p-5 mb-5">
      <h2 class="heading2">Add a free slot ✨</h2>
      <div class="flex gap-2.5 items-end flex-wrap">
        <input type="date" bind:value={newDate} class="input" min={new Date().toISOString().split("T")[0]} style="width:auto;flex:1" />
        <input type="time" bind:value={newTimeStart} class="input time-input" />
        <input type="time" bind:value={newTimeEnd} class="input time-input" />
        <button class="btn btn-primary" style="padding:14px 24px;white-space:nowrap" onclick={addSlot} disabled={!newDate || adding}>
          {adding ? "Adding..." : "Add 💖"}
        </button>
      </div>
      <div class="mt-3.5">
        <p class="label" style="margin-bottom:6px">Activity (optional)</p>
        <div class="flex flex-wrap gap-1.5">
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
          <input type="text" bind:value={newCustomActivity} class="input" placeholder="e.g. Bowling 🎳" />
        {/if}
      </div>
    </div>

    <div class="mb-5">
      <h2 class="heading2">Things I like 💖</h2>
      <textarea
        class="input"
        bind:value={likes}
        placeholder="e.g. sushi, sunsets, cats, board games..."
        rows="3"
        style="resize:vertical;font-size:16px;min-height:80px"></textarea>
      <div class="flex items-center gap-3 mt-2.5">
        <button class="btn btn-primary" style="padding:10px 28px;font-size:15px" onclick={saveLikes} disabled={likesSaving}>
          {likesSaving ? "Saving..." : "Save 💖"}
        </button>
        {#if likesSaved}
          <span class="text-sm" style="color:#155724">Saved! ✨</span>
        {/if}
      </div>
    </div>

    {#if error}
      <p class="form-error">{error}</p>
    {/if}

    {#if loading}
      <p class="sub">Loading...</p>
    {:else}
      <div class="overflow-x-auto">
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
                <td class="text-sm">
                  {#if slot.activity}
                    {activityEmoji(slot.activity)} {activityTitle(slot.activity)}
                  {:else}
                    <span class="italic" style="color:var(--color-text-light)">Any</span>
                  {/if}
                </td>
                <td>
                  {#if slot.booking?.status === "pending"}
                    <span class="badge pending">Pending</span>
                  {:else if slot.booking?.status === "confirmed"}
                    <span class="badge booked">Booked</span>
                  {:else if slot.booking?.status === "denied"}
                    <span class="badge denied">Denied</span>
                  {:else}
                    <span class="badge available">Free</span>
                  {/if}
                </td>
                <td class="text-sm">{slot.booking?.name ?? "—"}</td>
                <td>
                  {#if !slot.booking || slot.booking.status === "denied"}
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
  .title {
    font-family: "Fredoka", sans-serif;
    font-weight: 600;
    font-size: 28px;
    color: var(--color-text);
    line-height: 1.3;
  }
  .heading2 {
    font-family: "Fredoka", sans-serif;
    font-weight: 500;
    font-size: 18px;
    color: var(--color-text);
    margin: 0 0 12px;
  }
  .time-input {
    width: 120px;
    flex-shrink: 0;
  }
  .btn-link {
    font-family: "Fredoka", sans-serif;
    font-size: 14px;
    color: var(--color-purple);
    text-decoration: none;
    padding: 6px 16px;
    border: 2px solid var(--color-purple-light);
    border-radius: 20px;
    transition: background 0.15s;
  }
  .btn-link:hover { background: var(--color-pink-pale); }
  .btn-logout {
    font-family: "Fredoka", sans-serif;
    font-size: 14px;
    color: var(--color-pink);
    background: none;
    border: 2px solid var(--color-pink-light);
    border-radius: 20px;
    padding: 6px 16px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-logout:hover { background: var(--color-pink-pale); }
  .activity-opt {
    font-family: "Fredoka", sans-serif;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 14px;
    border: 2px solid var(--color-purple-light);
    border-radius: 20px;
    background: white;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
  }
  .activity-opt:hover { background: var(--color-pink-pale); }
  .activity-opt.active {
    background: linear-gradient(135deg, var(--color-pink), var(--color-purple-light));
    color: white;
    border-color: transparent;
  }
  .btn-delete {
    font-family: "Fredoka", sans-serif;
    font-size: 14px;
    width: 32px;
    height: 32px;
    border: 2px solid var(--color-pink-light);
    border-radius: 50%;
    background: white;
    color: var(--color-pink);
    cursor: pointer;
    transition: all 0.15s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .btn-delete:hover { background: var(--color-pink-pale); border-color: var(--color-pink); }
  .btn-delete:disabled { opacity: 0.4; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 15px;
  }
  th {
    text-align: left;
    padding: 12px 10px;
    color: var(--color-text-light);
    font-weight: 500;
    border-bottom: 2px solid var(--color-pink-light);
  }
  td {
    padding: 10px;
    border-bottom: 1px solid var(--color-pink-pale);
    color: var(--color-text);
  }
  .badge {
    font-size: 13px;
    font-weight: 500;
    padding: 4px 12px;
    border-radius: 12px;
  }
  .badge.available { background: #d4edda; color: #155724; }
  .badge.pending { background: #fff3cd; color: #856404; }
  .badge.booked { background: var(--color-pink-pale); color: var(--color-pink); }
  .badge.denied { background: #f8d7da; color: #721c24; }
</style>
