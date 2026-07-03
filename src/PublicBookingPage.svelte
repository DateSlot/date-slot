<script lang="ts">
import { onMount } from "svelte";
import confetti from "canvas-confetti";
import type { SlotsByDate, AvailableSlot } from "./lib/types.ts";
import { ACTIVITY_OPTIONS, CUSTOM_ACTIVITY } from "./lib/types.ts";

let { username }: { username: string } = $props();

let displayName = $state("");
let likes = $state("");
let slotsByDate: SlotsByDate = $state({});
let availableDates: string[] = $state([]);
let selectedDate = $state("");
let selectedSlot: AvailableSlot | null = $state(null);
let bookerName = $state("");
let bookerActivity = $state("");
let bookerCustomActivity = $state("");
let loading = $state(true);
let error = $state("");
let submitting = $state(false);
let submitError = $state("");
let booked = $state(false);

onMount(async () => {
  await loadProfile();
});

async function loadProfile() {
  loading = true;
  error = "";
  try {
    const res = await fetch(`/api/public-profile?username=${encodeURIComponent(username)}`);
    const data = await res.json();
    if (!res.ok) {
      error = data.error || "Profile not found";
      return;
    }
    displayName = data.profile.display_name;
    likes = data.profile.likes || "";
    slotsByDate = data.slots || {};
    availableDates = Object.keys(slotsByDate).sort();
    if (availableDates.length > 0) {
      selectedDate = availableDates[0];
    }
  } catch {
    error = "Could not load profile";
  } finally {
    loading = false;
  }
}

function selectSlot(slot: AvailableSlot) {
  selectedSlot = selectedSlot?.id === slot.id ? null : slot;
  bookerActivity = "";
  bookerCustomActivity = "";
}

async function book() {
  if (!selectedSlot || !bookerName.trim()) return;
  submitting = true;
  submitError = "";
  try {
    const body: Record<string, string> = {
      slot_id: selectedSlot.id,
      name: bookerName.trim(),
    };

    if (!selectedSlot.activity) {
      body.activity = bookerActivity === CUSTOM_ACTIVITY
        ? bookerCustomActivity.trim()
        : bookerActivity;
    }

    const res = await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 409) {
      submitError = "That slot was just taken! Pick another 💕";
      selectedSlot = null;
      loadProfile();
      return;
    }
    if (!res.ok) throw new Error("Failed to book");
    booked = true;
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#ff8fab", "#c77dff", "#ffb3c6", "#e0aaff"],
    });
  } catch {
    submitError = "Something went wrong 💔";
  } finally {
    submitting = false;
  }
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric"
  });
}

function fmtTime(t: string) {
  return t?.slice(0, 5) ?? "";
}

function slotLabel(slot: AvailableSlot) {
  if (!slot.activity) return "";
  const opt = ACTIVITY_OPTIONS.find((o) => o.id === slot.activity);
  return opt ? `${opt.emoji} ${opt.title}` : `💫 ${slot.activity}`;
}
</script>

<div class="card">
  <div class="deco">✧  ♡  ★  ♡  ✧</div>

  {#if loading}
    <p class="sub">Loading...</p>
  {:else if error}
    <h1>Oops! 💔</h1>
    <p class="sub">{error}</p>
  {:else if booked}
    <h1>Booked! 🎉</h1>
    <p class="sub">See you then~ 💖</p>
    <p class="big-emoji">💕</p>
  {:else}
    <div class="page-head">
      <h1>Book {displayName} 💕</h1>
      <a href="/u/{username}/edit" class="manage-btn">Manage 🔐</a>
    </div>

    {#if likes}
      <div class="likes-section">
        <p class="likes-text">💖 {likes}</p>
      </div>
    {/if}

    <p class="sub">Pick a time that works for you</p>

    {#if availableDates.length === 0}
      <p class="sub">No available slots right now. Check back soon!</p>
    {:else}
      <div class="slot-picker">
        <div class="dates-row">
          {#each availableDates as date}
            <button
              class="date-chip"
              class:active={date === selectedDate}
              onclick={() => { selectedDate = date; selectedSlot = null; }}
            >
              {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "short", month: "short", day: "numeric"
              })}
            </button>
          {/each}
        </div>

        {#if selectedDate}
          <p class="date-label">{fmtDate(selectedDate)}</p>
          <div class="slots-row">
            {#each slotsByDate[selectedDate] as slot}
              <button
                class="slot-btn"
                class:active={selectedSlot?.id === slot.id}
                onclick={() => selectSlot(slot)}
              >
                🕐 {fmtTime(slot.time_start)} – {fmtTime(slot.time_end)}
                {#if slot.activity}
                  <br><span class="slot-activity">{slotLabel(slot)}</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}

        {#if selectedSlot}
          <div class="form">
            <div class="field">
              <label class="field-label" for="name">Your name</label>
              <input
                id="name"
                type="text"
                bind:value={bookerName}
                class="text-input"
                placeholder="e.g. your name"
                onkeydown={(e) => e.key === "Enter" && book()}
              />
            </div>

            {#if !selectedSlot.activity}
              <div class="field">
                <p class="field-label">Pick an activity</p>
                <div class="activity-options">
                  <button class="activity-opt" class:active={bookerActivity === ""} onclick={() => { bookerActivity = ""; bookerCustomActivity = ""; }}>
                    Surprise me 🎲
                  </button>
                  {#each ACTIVITY_OPTIONS as opt}
                    <button class="activity-opt" class:active={bookerActivity === opt.id} onclick={() => { bookerActivity = opt.id; bookerCustomActivity = ""; }}>
                      {opt.emoji} {opt.title}
                    </button>
                  {/each}
                  <button class="activity-opt" class:active={bookerActivity === CUSTOM_ACTIVITY} onclick={() => bookerActivity = CUSTOM_ACTIVITY}>
                    ✏️ Custom
                  </button>
                </div>
                {#if bookerActivity === CUSTOM_ACTIVITY}
                  <input type="text" bind:value={bookerCustomActivity} class="text-input" placeholder="e.g. Bowling 🎳" style="margin-top:8px" />
                {/if}
              </div>
            {/if}

            {#if submitError}
              <p class="form-error">{submitError}</p>
            {/if}
            <button
              class="btn confirm"
              disabled={!bookerName.trim() || submitting}
              onclick={book}
            >{submitting ? "Booking..." : "Book 💖"}</button>
          </div>
        {/if}
      </div>
    {/if}
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
  .big-emoji {
    font-size: 64px;
    margin: 0;
    line-height: 1;
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
  .slot-picker {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .dates-row {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: thin;
  }
  .date-chip {
    font-family: "Fredoka", sans-serif;
    font-size: 14px;
    font-weight: 500;
    padding: 10px 18px;
    border: 2px solid var(--pink-light);
    border-radius: 20px;
    background: white;
    color: var(--text-light);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .date-chip:hover {
    border-color: var(--pink);
    background: var(--pink-pale);
  }
  .date-chip.active {
    background: linear-gradient(135deg, var(--pink), var(--purple-light));
    color: white;
    border-color: transparent;
  }
  .date-label {
    font-size: 20px;
    font-weight: 500;
    color: var(--purple);
    margin: 0;
    text-align: center;
  }
  .slots-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
  .slot-btn {
    font-family: "Fredoka", sans-serif;
    font-size: 15px;
    font-weight: 500;
    padding: 12px 20px;
    border: 2px solid var(--pink-light);
    border-radius: 16px;
    background: white;
    color: var(--text);
    cursor: pointer;
    transition: all 0.15s;
    line-height: 1.4;
  }
  .slot-btn:hover {
    border-color: var(--purple);
    background: var(--pink-pale);
  }
  .slot-btn.active {
    background: linear-gradient(135deg, var(--pink), var(--purple-light));
    color: white;
    border-color: transparent;
    box-shadow: 0 4px 16px rgba(200, 120, 180, 0.3);
  }
  .slot-activity {
    font-size: 12px;
    opacity: 0.8;
  }

  .page-head {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .manage-btn {
    font-family: "Fredoka", sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: var(--purple);
    background: var(--pink-pale);
    text-decoration: none;
    padding: 6px 14px;
    border-radius: 20px;
    border: 2px solid var(--purple-light);
    transition: all 0.15s;
    white-space: nowrap;
  }

  .manage-btn:hover {
    background: var(--purple-light);
    color: white;
  }

  .likes-section {
    background: var(--pink-pale);
    border-radius: 16px;
    padding: 12px 18px;
    margin: 8px auto 16px;
    max-width: 380px;
  }

  .likes-text {
    font-size: 15px;
    color: var(--text);
    margin: 0;
    line-height: 1.5;
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
</style>
