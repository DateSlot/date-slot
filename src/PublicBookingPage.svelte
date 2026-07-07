<script lang="ts">
import { onMount } from "svelte";
import confetti from "canvas-confetti";
import type { AvailableSlot, SlotsByDate } from "./lib/types.ts";
import { ACTIVITY_OPTIONS, CUSTOM_ACTIVITY } from "./lib/types.ts";

let { username }: { username: string } = $props();

let displayName = $state("");
let likes = $state("");
let loading = $state(false);
let error = $state("");
let done = $state(false);

let slotsByDate: SlotsByDate = $state({});
let availableDates: string[] = $state([]);
let selectedDate: string = $state("");
let selectedSlot: AvailableSlot | null = $state(null);
let bookingName: string = $state("");
let bookerEmail: string = $state("");
let bookerActivity = $state("");
let bookerCustomActivity = $state("");
let submitting = $state(false);
let submitError = $state("");

onMount(async () => {
  loading = true;
  try {
    const res = await fetch(`/api/public-profile?username=${encodeURIComponent(username)}`);
    const data = await res.json();
    if (!res.ok) { error = data.error || "Profile not found"; return; }
    displayName = data.profile.display_name;
    likes = data.profile.likes || "";
    slotsByDate = data.slots || {};
    availableDates = Object.keys(slotsByDate).sort();
    if (availableDates.length > 0) selectedDate = availableDates[0];
  } catch { error = "Could not load profile"; }
  finally { loading = false; }
});

function selectSlot(slot: AvailableSlot) {
  selectedSlot = selectedSlot?.id === slot.id ? null : slot;
  bookerActivity = "";
  bookerCustomActivity = "";
}

function validateEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

async function confirmBooking() {
  if (!selectedSlot || !bookingName.trim() || !bookerEmail.trim()) return;
  if (!validateEmail(bookerEmail)) { submitError = "Please enter a valid email address"; return; }
  submitting = true;
  submitError = "";
  try {
    const token = window.turnstile?.getResponse();
    const body: Record<string, string> = { slot_id: selectedSlot.id, name: bookingName.trim(), email: bookerEmail.trim() };
    if (token) body.turnstile_token = token;
    if (!selectedSlot.activity) {
      body.activity = bookerActivity === CUSTOM_ACTIVITY ? bookerCustomActivity.trim() : bookerActivity;
    }
    const res = await fetch("/api/booking", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.status === 409) { submitError = "That slot was just taken! Pick another 💕"; selectedSlot = null; return; }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      submitError = data.error || "Something went wrong. Try again?";
      return;
    }
    done = true;
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#ff8fab", "#c77dff", "#ffb3c6", "#e0aaff"] });
    try { window.turnstile?.reset(); } catch { /* ignore */ }
  } catch {
    submitError = "Couldn't reach the server. Check your connection and try again.";
  } finally { submitting = false; }
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function fmtTime(t: string) { return t?.slice(0, 5) ?? ""; }
function activityLabel(a: string | null) {
  if (!a) return "";
  const opt = ACTIVITY_OPTIONS.find((o) => o.id === a);
  return opt ? `${opt.emoji} ${opt.title}` : `💫 ${a}`;
}
</script>

<svelte:head>
  {#if import.meta.env.VITE_TURNSTILE_SITE_KEY}
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  {/if}
</svelte:head>

{#if loading}
  <div class="card"><div class="deco">✧  ♡  ★  ♡  ✧</div><p class="sub">Loading...</p></div>
{:else if error}
  <div class="card"><div class="deco">✧  ♡  ★  ♡  ✧</div><h1 class="title">Oops! 💔</h1><p class="sub">{error}</p></div>
{:else if done}
  <div class="card" style="padding:56px 40px 32px">
    <div class="deco">✧  ♡  ★  ♡  ✧</div>
    <h1 class="title">Request sent! 💕</h1>
    <p class="sub">
      {bookingName}
      {#if selectedSlot?.activity}&nbsp;💖&nbsp; {activityLabel(selectedSlot.activity)}
      {:else if bookerActivity}&nbsp;💖&nbsp; {bookerActivity === CUSTOM_ACTIVITY ? bookerCustomActivity : ACTIVITY_OPTIONS.find(o => o.id === bookerActivity)?.emoji + " " + ACTIVITY_OPTIONS.find(o => o.id === bookerActivity)?.title}
      {/if}
    </p>
    <p class="sub">
      📅 {selectedSlot ? fmtDate(selectedSlot.date) : ""}<br>
      🕐 {selectedSlot ? fmtTime(selectedSlot.time_start) + " – " + fmtTime(selectedSlot.time_end) : ""}
    </p>
    <p class="text-6xl m-0 mb-2 leading-none">🎉</p>
    <p class="sub">Waiting for {displayName} to confirm your date! You'll get an email when they respond 💖</p>
    <div class="mt-5 pt-3.5 border-t border-pink-pale">
      <a href="/" class="edit-link">Home 🏠</a>
    </div>
  </div>
{:else}
  <div class="card" style="padding-bottom:24px">
    <div class="deco">✿  ♡  ☆  ♡  ✿</div>
    <h1 class="title">Will you go on a date with me?</h1>
    <p class="sub">— {displayName} 💕</p>

    {#if likes}
      <div class="bg-pink-pale rounded-2xl px-4 py-3 -mt-5 mb-7 max-w-[340px] mx-auto">
        <p class="text-sm text-text m-0 leading-relaxed">💖 {likes}</p>
      </div>
    {/if}

    {#if availableDates.length === 0}
      <p class="sub">No available slots right now. Check back soon! 💕</p>
    {:else}
      <div class="flex flex-col gap-3.5">
        <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {#each availableDates as date}
            <button
              class="chip"
              class:active={date === selectedDate}
              onclick={() => { selectedDate = date; selectedSlot = null; }}>
              {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </button>
          {/each}
        </div>

        {#if selectedDate}
          <p class="text-lg font-medium text-purple text-center m-0">{fmtDate(selectedDate)}</p>
          <div class="flex flex-wrap gap-2 justify-center">
            {#each slotsByDate[selectedDate] as slot}
              <button class="slot-btn" class:active={selectedSlot?.id === slot.id} onclick={() => selectSlot(slot)}>
                🕐 {fmtTime(slot.time_start)} – {fmtTime(slot.time_end)}
                {#if slot.activity}<br><span class="slot-activity">{activityLabel(slot.activity)}</span>{/if}
              </button>
            {/each}
          </div>
        {/if}

        {#if selectedSlot}
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5 text-left">
              <label class="label" for="name">Your name</label>
              <input id="name" type="text" bind:value={bookingName}
                class="input" placeholder="e.g. Kuromi~" />
            </div>
            <div class="flex flex-col gap-1.5 text-left">
              <label class="label" for="email">Your email</label>
              <input id="email" type="email" bind:value={bookerEmail}
                class="input" placeholder="you@email.com"
                onkeydown={(e) => e.key === "Enter" && confirmBooking()} />
            </div>

            {#if !selectedSlot.activity}
              <div class="flex flex-col gap-1.5 text-left">
                <p class="label">Pick an activity</p>
                <div class="flex flex-wrap gap-1.5">
                  <button class="act-opt" class:active={bookerActivity === ""}
                    onclick={() => { bookerActivity = ""; bookerCustomActivity = ""; }}>Surprise 🎲</button>
                  {#each ACTIVITY_OPTIONS as opt}
                    <button class="act-opt" class:active={bookerActivity === opt.id}
                      onclick={() => { bookerActivity = opt.id; bookerCustomActivity = ""; }}>
                      {opt.emoji} {opt.title}
                    </button>
                  {/each}
                  <button class="act-opt" class:active={bookerActivity === CUSTOM_ACTIVITY}
                    onclick={() => bookerActivity = CUSTOM_ACTIVITY}>✏️ Custom</button>
                </div>
                {#if bookerActivity === CUSTOM_ACTIVITY}
                  <input type="text" bind:value={bookerCustomActivity} class="input" placeholder="e.g. Bowling 🎳" aria-label="Custom activity" />
                {/if}
              </div>
            {/if}

            {#if import.meta.env.VITE_TURNSTILE_SITE_KEY}
              <div id="turnstile-widget" class="cf-turnstile" data-sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY} style="margin:12px 0"></div>
            {/if}
            {#if submitError}<p class="form-error" role="alert">{submitError}</p>{/if}
            <button class="btn btn-primary" disabled={!bookingName.trim() || !bookerEmail.trim() || submitting} onclick={confirmBooking}>
              {submitting ? "Sending..." : "Request date 💖"}
            </button>
          </div>
        {/if}
      </div>
    {/if}
    <div class="mt-5 pt-3.5 border-t border-pink-pale">
      <a href="/u/{username}/edit" class="edit-link">Manage 🔐</a>
    </div>
  </div>
{/if}

<style>
  .title {
    font-family: "Fredoka", sans-serif;
    font-weight: 600;
    font-size: 28px;
    color: var(--color-text);
    margin: 0 0 8px;
    line-height: 1.3;
  }
  .chip {
    font-family: "Fredoka", sans-serif;
    font-size: 14px;
    font-weight: 500;
    padding: 10px 18px;
    border: 2px solid var(--color-pink-light);
    border-radius: 20px;
    background: white;
    color: var(--color-text-light);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .chip:hover { border-color: var(--color-pink); background: var(--color-pink-pale); }
  .chip.active {
    background: linear-gradient(135deg, var(--color-pink), var(--color-purple-light));
    color: white;
    border-color: transparent;
  }
  .slot-btn {
    font-family: "Fredoka", sans-serif;
    font-size: 15px;
    font-weight: 500;
    padding: 12px 20px;
    border: 2px solid var(--color-pink-light);
    border-radius: 16px;
    background: white;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
    line-height: 1.4;
  }
  .slot-btn:hover { border-color: var(--color-purple); background: var(--color-pink-pale); }
  .slot-btn.active {
    background: linear-gradient(135deg, var(--color-pink), var(--color-purple-light));
    color: white;
    border-color: transparent;
    box-shadow: 0 4px 16px rgba(200, 120, 180, 0.3);
  }
  .slot-activity { font-size: 12px; opacity: 0.8; }
  .edit-link {
    font-family: "Fredoka", sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-pink-light);
    text-decoration: none;
    transition: color 0.15s;
  }
  .edit-link:hover { color: var(--color-purple); }
  .act-opt {
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
  .act-opt:hover { background: var(--color-pink-pale); }
  .act-opt.active {
    background: linear-gradient(135deg, var(--color-pink), var(--color-purple-light));
    color: white;
    border-color: transparent;
  }
  .chip:focus-visible,
  .slot-btn:focus-visible,
  .act-opt:focus-visible,
  .edit-link:focus-visible {
    outline: 2px solid var(--color-purple, #c77dff);
    outline-offset: 2px;
  }
</style>
