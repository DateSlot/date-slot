<script lang="ts">
import { onMount } from "svelte";
import type { AdminSlot, RsvpRecord } from "./lib/types.ts";

const ADMIN_KEY = "date_me_admin";

let adminSecret = $state<string | null>(null);
let tab = $state<"slots" | "bookings">("slots");
let slots = $state<AdminSlot[]>([]);
let bookings = $state<RsvpRecord[]>([]);
let loading = $state(false);
let error = $state("");

let password = $state("");
let loginError = $state("");

let newDate = $state("");
let newTimeStart = $state("18:00");
let newTimeEnd = $state("21:00");
let adding = $state(false);

onMount(() => {
  adminSecret = sessionStorage.getItem(ADMIN_KEY);
  if (adminSecret) loadData();
});

async function login() {
  loginError = "";
  try {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error("Wrong password");
    const data = await res.json();
    if (!data.success) throw new Error("Wrong password");
    adminSecret = password;
    sessionStorage.setItem(ADMIN_KEY, password);
    password = "";
    loadData();
  } catch {
    loginError = "Wrong password, try again 💔";
  }
}

function logout() {
  adminSecret = null;
  sessionStorage.removeItem(ADMIN_KEY);
  slots = [];
  bookings = [];
  tab = "slots";
}

async function loadData() {
  loading = true;
  error = "";
  await Promise.all([loadSlots(), loadBookings()]);
  loading = false;
}

async function loadSlots() {
  try {
    const res = await fetch("/api/admin/slots", {
      headers: { Authorization: `Bearer ${adminSecret}` },
    });
    if (res.status === 401) { logout(); return; }
    if (!res.ok) throw new Error("Failed to load slots");
    slots = await res.json();
  } catch (e) {
    error = (e as Error).message;
  }
}

async function loadBookings() {
  try {
    const res = await fetch("/api/admin/bookings", {
      headers: { Authorization: `Bearer ${adminSecret}` },
    });
    if (res.status === 401) { logout(); return; }
    if (!res.ok) throw new Error("Failed to load bookings");
    bookings = await res.json();
  } catch (e) {
    error = (e as Error).message;
  }
}

async function addSlot() {
  if (!newDate || !newTimeStart || !newTimeEnd) return;
  adding = true;
  try {
    const res = await fetch("/api/admin/slots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminSecret}`,
      },
      body: JSON.stringify({
        date: newDate,
        time_start: newTimeStart,
        time_end: newTimeEnd,
      }),
    });
    if (!res.ok) throw new Error("Failed to add slot");
    newDate = "";
    newTimeStart = "18:00";
    newTimeEnd = "21:00";
    loadSlots();
  } catch (e) {
    error = (e as Error).message;
  } finally {
    adding = false;
  }
}

function fmtTime(t: string) {
  return t?.slice(0, 5) ?? "";
}

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  });
}
</script>

{#if !adminSecret}
  <div class="admin-card">
    <div class="deco">✧  ♡  ★  ♡  ✧</div>
    <h1>Admin Login 🔐</h1>
    <p class="sub">Enter the secret password</p>
    <div class="form">
      <input
        type="password"
        bind:value={password}
        class="text-input"
        placeholder="password"
        onkeydown={(e) => e.key === "Enter" && login()}
      />
      {#if loginError}
        <p class="form-error">{loginError}</p>
      {/if}
      <button class="btn confirm" onclick={login} disabled={!password}>Login 💖</button>
    </div>
  </div>
{:else}
  <div class="admin-card wide">
    <div class="admin-header">
      <div class="deco">✧  ♡  ★  ♡  ✧</div>
      <button class="btn-logout" onclick={logout}>Logout</button>
    </div>
    <h1>Dashboard 📋</h1>
    <div class="tabs">
      <button class="tab" class:active={tab === "slots"} onclick={() => tab = "slots"}>
        Slots {slots.length > 0 ? `(${slots.length})` : ""}
      </button>
      <button class="tab" class:active={tab === "bookings"} onclick={() => tab = "bookings"}>
        Bookings {bookings.length > 0 ? `(${bookings.length})` : ""}
      </button>
    </div>

    {#if error}
      <p class="form-error">{error}</p>
    {/if}

    {#if tab === "slots"}
      <div class="add-form">
        <h2>Add Available Slot ✨</h2>
        <div class="add-form-row">
          <input type="date" bind:value={newDate} class="text-input" min={new Date().toISOString().split("T")[0]} />
          <input type="time" bind:value={newTimeStart} class="text-input time-input" />
          <input type="time" bind:value={newTimeEnd} class="text-input time-input" />
          <button class="btn confirm add-btn" onclick={addSlot} disabled={!newDate || adding}>
            {adding ? "Adding..." : "Add 💖"}
          </button>
        </div>
      </div>

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
                <th>From</th>
                <th>To</th>
                <th>Status</th>
                <th>Booker</th>
              </tr>
            </thead>
            <tbody>
              {#each slots as slot}
                <tr>
                  <td>{fmtDate(slot.date)}</td>
                  <td>{fmtTime(slot.time_start)}</td>
                  <td>{fmtTime(slot.time_end)}</td>
                  <td>
                    <span class="badge" class:available={!slot.is_booked} class:booked={slot.is_booked}>
                      {slot.is_booked ? "Booked" : "Free"}
                    </span>
                  </td>
                  <td>{slot.booker_name ?? "—"}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {:else}
      {#if loading}
        <p class="sub">Loading...</p>
      {:else if bookings.length === 0}
        <p class="sub">No bookings yet. 💔</p>
      {:else}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Name</th>
                <th>Activity</th>
                <th>Booked At</th>
              </tr>
            </thead>
            <tbody>
              {#each bookings as b}
                <tr>
                  <td>{fmtDate(b.date)}</td>
                  <td>{fmtTime(b.time_start)} – {fmtTime(b.time_end)}</td>
                  <td>{b.name}</td>
                  <td>{b.activity}</td>
                  <td>{new Date(b.created_at).toLocaleString()}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {/if}
  </div>
{/if}

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

  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
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
    margin: 16px 0;
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

  .tabs {
    display: flex;
    gap: 8px;
    margin: 16px 0;
  }

  .tab {
    font-family: "Fredoka", sans-serif;
    font-size: 16px;
    font-weight: 500;
    padding: 10px 24px;
    border: 2px solid var(--pink-light);
    border-radius: 20px;
    background: white;
    color: var(--text-light);
    cursor: pointer;
    transition: all 0.15s;
  }

  .tab.active {
    background: linear-gradient(135deg, var(--pink), var(--purple-light));
    color: white;
    border-color: transparent;
  }

  .tab:hover:not(.active) {
    background: var(--pink-pale);
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
