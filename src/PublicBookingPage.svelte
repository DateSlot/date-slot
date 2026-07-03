<script lang="ts">
import { gsap } from "gsap";
import { onMount } from "svelte";
import confetti from "canvas-confetti";
import type { AvailableSlot, SlotsByDate } from "./lib/types.ts";
import { ACTIVITY_OPTIONS, CUSTOM_ACTIVITY } from "./lib/types.ts";

let { username }: { username: string } = $props();

type Step = "ask" | "when" | "done";
let step: Step = $state("ask");

let displayName = $state("");
let likes = $state("");
let loading = $state(false);
let error = $state("");

let noBtn: HTMLElement = $state() as unknown as HTMLElement;
let tx = 0;
let ty = 0;
let panic = 0.3;
let returning = false;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let slowTween: gsap.core.Tween | null = null;
let isTouch = false;

function cancelSlow() {
  if (slowTween) {
    slowTween.kill();
    slowTween = null;
    tx = gsap.getProperty(noBtn, "x") as number;
    ty = gsap.getProperty(noBtn, "y") as number;
  }
}

function returnHome(speed: "fast" | "slow") {
  if (speed === "fast") {
    returning = true;
    gsap.killTweensOf(noBtn);
    gsap.to(noBtn, {
      x: 0, y: 0, scale: 1,
      duration: 0.6, ease: "power2.out",
      onComplete: () => { returning = false; }
    });
    tx = 0;
    ty = 0;
  } else {
    slowTween = gsap.to(noBtn, {
      x: 0, y: 0, scale: 1,
      duration: 2.5, ease: "power1.out",
      onComplete: () => { slowTween = null; }
    });
    tx = 0;
    ty = 0;
  }
}

function handlePointer(clientX: number, clientY: number) {
  if (!noBtn) return;
  if (isTouch) return;

  cancelSlow();
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }

  const r = noBtn.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;

  const dx = cx - clientX;
  const dy = cy - clientY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (!returning && dist > 0 && dist < 200) {
    const nx = dx / dist;
    const ny = dy / dist;
    const t = 1 - dist / 200;
    const strength = t * t * t * panic * 400;

    let newTx = tx + strength * nx;
    let newTy = ty + strength * ny;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const btnW = r.width;
    const btnH = r.height;
    const margin = 20;
    const origLeft = r.left - (tx || 0);
    const origTop = r.top - (ty || 0);

    if (origLeft + newTx < margin) newTx = tx + (margin - origLeft);
    if (origLeft + newTx + btnW > vw - margin) newTx = tx + (vw - margin - btnW - origLeft);
    if (origTop + newTy < margin) newTy = ty + (margin - origTop);
    if (origTop + newTy + btnH > vh - margin) newTy = ty + (vh - margin - btnH - origTop);

    gsap.killTweensOf(noBtn);
    gsap.to(noBtn, {
      x: newTx, y: newTy, scale: 0.85,
      duration: 0.07, ease: "power2.out", overwrite: "auto"
    });
    tx = newTx;
    ty = newTy;
    panic = Math.max(0.15, panic * 0.94);
  }

  if (!returning && (tx !== 0 || ty !== 0)) {
    idleTimer = setTimeout(() => {
      if (!returning && (tx !== 0 || ty !== 0)) {
        returnHome("slow");
      }
    }, 800);
  }
}

function handlePointerLeave() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  cancelSlow();
  if (!returning && (tx !== 0 || ty !== 0)) {
    returnHome("slow");
  }
}

function handleTouchStart(e: TouchEvent) {
  isTouch = true;
  handlePointer(e.touches[0].clientX, e.touches[0].clientY);
}

function handleTouchMove(e: TouchEvent) {
  isTouch = true;
  handlePointer(e.touches[0].clientX, e.touches[0].clientY);
}

let slotsByDate: SlotsByDate = $state({});
let availableDates: string[] = $state([]);
let selectedDate: string = $state("");
let selectedSlot: AvailableSlot | null = $state(null);
let bookingName: string = $state("");
let bookerActivity = $state("");
let bookerCustomActivity = $state("");
let slotLoading = $state(false);
let slotError = $state("");
let submitting = $state(false);
let submitError = $state("");

onMount(async () => {
  loading = true;
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
});

function sayYes() {
  step = "when";
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#ff8fab", "#c77dff", "#ffb3c6", "#e0aaff"],
  });
}

function selectSlot(slot: AvailableSlot) {
  selectedSlot = selectedSlot?.id === slot.id ? null : slot;
  bookerActivity = "";
  bookerCustomActivity = "";
}

async function confirmBooking() {
  if (!selectedSlot || !bookingName.trim()) return;
  submitting = true;
  submitError = "";
  try {
    const body: Record<string, string> = {
      slot_id: selectedSlot.id,
      name: bookingName.trim(),
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
      return;
    }
    if (!res.ok) throw new Error("Failed to book");
    step = "done";
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#ff8fab", "#c77dff", "#ffb3c6", "#e0aaff"],
    });
  } catch {
    step = "done";
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ff8fab", "#c77dff", "#ffb3c6", "#e0aaff"],
    });
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

function activityLabel(a: string | null) {
  if (!a) return "";
  const opt = ACTIVITY_OPTIONS.find((o) => o.id === a);
  return opt ? `${opt.emoji} ${opt.title}` : `💫 ${a}`;
}
</script>

<svelte:window
  onmousemove={(e) => handlePointer(e.clientX, e.clientY)}
  onmouseleave={handlePointerLeave}
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
/>

{#if loading}
  <div class="card">
    <div class="deco">✧  ♡  ★  ♡  ✧</div>
    <p class="sub">Loading...</p>
  </div>
{:else if error}
  <div class="card">
    <div class="deco">✧  ♡  ★  ♡  ✧</div>
    <h1>Oops! 💔</h1>
    <p class="sub">{error}</p>
  </div>
{:else if step === "ask"}
  <div class="card">
    <div class="deco">✿  ♡  ☆  ♡  ✿</div>
    <h1>Will you go<br>on a date with me?</h1>
    <p class="sub">— {displayName} 💕</p>
    {#if likes}
      <div class="likes-section"><p class="likes-text">💖 {likes}</p></div>
    {/if}
    <div class="buttons">
      <button class="btn yes" onclick={sayYes}>Yes 💖</button>
      <button bind:this={noBtn} class="btn no">No 💔</button>
    </div>
    <div class="card-footer">
      <a href="/u/{username}/edit" class="edit-link">Manage 🔐</a>
    </div>
  </div>
{:else if step === "when"}
  <div class="card">
    <div class="deco">✧  ♡  ★  ♡  ✧</div>
    <h1>Pick a time 📅</h1>
    <p class="sub">— {displayName} 💕</p>

    {#if availableDates.length === 0}
      <p class="sub">No available slots right now. Check back soon! 💕</p>
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
                  <br><span class="slot-activity">{activityLabel(slot.activity)}</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}

        {#if selectedSlot}
          <div class="form">
            <div class="field">
              <label class="field-label" for="name">Your name</label>
              <input id="name" type="text" bind:value={bookingName} class="text-input"
                placeholder="e.g. Kuromi~" onkeydown={(e) => e.key === "Enter" && confirmBooking()} />
            </div>

            {#if !selectedSlot.activity}
              <div class="field">
                <p class="field-label">Pick an activity</p>
                <div class="act-row">
                  <button class="act-opt" class:active={bookerActivity === ""} onclick={() => { bookerActivity = ""; bookerCustomActivity = ""; }}>Surprise 🎲</button>
                  {#each ACTIVITY_OPTIONS as opt}
                    <button class="act-opt" class:active={bookerActivity === opt.id} onclick={() => { bookerActivity = opt.id; bookerCustomActivity = ""; }}>
                      {opt.emoji} {opt.title}
                    </button>
                  {/each}
                  <button class="act-opt" class:active={bookerActivity === CUSTOM_ACTIVITY} onclick={() => bookerActivity = CUSTOM_ACTIVITY}>
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
            <button class="btn confirm" disabled={!bookingName.trim() || submitting} onclick={confirmBooking}>
              {submitting ? "Booking..." : "Let's go! 💖"}
            </button>
          </div>
        {/if}
      </div>
    {/if}
    <div class="card-footer">
      <a href="/u/{username}/edit" class="edit-link">Manage 🔐</a>
    </div>
  </div>
{:else if step === "done"}
  <div class="card done-card">
    <div class="deco">✧  ♡  ★  ♡  ✧</div>
    <h1>It's a date! 💕</h1>
    <p class="sub">
      {bookingName}
      {#if selectedSlot?.activity}
        &nbsp;💖&nbsp; {activityLabel(selectedSlot.activity)}
      {:else if bookerActivity}
        &nbsp;💖&nbsp; {
          bookerActivity === CUSTOM_ACTIVITY ? bookerCustomActivity : ACTIVITY_OPTIONS.find(o => o.id === bookerActivity)?.emoji + " " + ACTIVITY_OPTIONS.find(o => o.id === bookerActivity)?.title
        }
      {/if}
    </p>
    <p class="sub">
      📅 {selectedSlot ? fmtDate(selectedSlot.date) : ""}
      <br>🕐 {selectedSlot ? fmtTime(selectedSlot.time_start) + " – " + fmtTime(selectedSlot.time_end) : ""}
    </p>
    <p class="big-emoji">🎉</p>
    <p class="sub">Can't wait! See you soon~ 💖</p>
    <div class="card-footer">
      <a href="/" class="edit-link">Home 🏠</a>
    </div>
  </div>
{/if}

<style>
  .card {
    background: var(--white);
    border-radius: 32px;
    padding: 48px 40px 24px;
    max-width: 440px;
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
    margin: 0 0 28px;
  }

  .big-emoji {
    font-size: 64px;
    margin: 0 0 8px;
    line-height: 1;
  }

  .buttons {
    display: flex;
    justify-content: center;
    gap: 16px;
    align-items: center;
  }

  .btn {
    font-family: "Fredoka", sans-serif;
    font-size: 18px;
    font-weight: 500;
    padding: 12px 36px;
    border: none;
    border-radius: 60px;
    cursor: pointer;
    white-space: nowrap;
  }

  .yes {
    background: linear-gradient(135deg, var(--pink), var(--purple-light));
    color: white;
    box-shadow: 0 4px 16px rgba(200, 120, 180, 0.3);
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .yes:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(200, 120, 180, 0.45); }
  .yes:active { transform: scale(0.95); }

  .no {
    border: 2px solid var(--pink-light);
    background: white;
    color: var(--pink);
    touch-action: none;
    user-select: none;
  }

  .no:hover { background: var(--pink-pale); }

  .done-card { padding: 56px 40px 32px; }

  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
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
    margin: 0;
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

  .text-input:focus { border-color: var(--purple); }

  .form-error {
    font-size: 14px;
    color: var(--pink);
    text-align: center;
    margin: 0;
  }

  .confirm {
    font-family: "Fredoka", sans-serif;
    font-size: 18px;
    font-weight: 500;
    padding: 14px 48px;
    border: none;
    border-radius: 60px;
    background: linear-gradient(135deg, var(--pink), var(--purple-light));
    color: white;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(200, 120, 180, 0.3);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
  }

  .confirm:hover:not(:disabled) { transform: scale(1.06); box-shadow: 0 6px 24px rgba(200, 120, 180, 0.45); }
  .confirm:active:not(:disabled) { transform: scale(0.95); }
  .confirm:disabled { opacity: 0.4; cursor: default; }

  .slot-picker {
    display: flex;
    flex-direction: column;
    gap: 14px;
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

  .date-chip:hover { border-color: var(--pink); background: var(--pink-pale); }

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

  .slot-btn:hover { border-color: var(--purple); background: var(--pink-pale); }

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

  .likes-section {
    background: var(--pink-pale);
    border-radius: 16px;
    padding: 12px 18px;
    margin: -20px auto 28px;
    max-width: 340px;
  }

  .likes-text {
    font-size: 15px;
    color: var(--text);
    margin: 0;
    line-height: 1.5;
  }

  .card-footer {
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid var(--pink-pale);
  }

  .edit-link {
    font-family: "Fredoka", sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: var(--pink-light);
    text-decoration: none;
    transition: color 0.15s;
  }

  .edit-link:hover { color: var(--purple); }

  .act-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .act-opt {
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
  .act-opt:hover { background: var(--pink-pale); }
  .act-opt.active {
    background: linear-gradient(135deg, var(--pink), var(--purple-light));
    color: white;
    border-color: transparent;
  }
</style>
