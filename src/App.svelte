<script lang="ts">
import { gsap } from "gsap";
import { onMount } from "svelte";
import confetti from "canvas-confetti";

let page: "ask" | "options" | "when" | "done" = $state("ask");

let noBtn: HTMLElement;
let tx = 0;
let ty = 0;
let panic = 0.3;
let wasOutside = true;
let ready = false;
let returning = false;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let slowTween: gsap.core.Tween | null = null;

let selected: string | null = null;
let chosenDate: string = $state("");
let chosenName: string = $state("");
let timeStart: string = $state("18:00");
let timeEnd: string = $state("21:00");
let submitting = $state(false);
let submitError = $state("");
let submitted = $state(false);

onMount(() => {
  ready = true;
});

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

function handleMouseMove(event: MouseEvent) {
  if (!ready) return;

  cancelSlow();
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }

  const r = noBtn.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;

  const dx = cx - event.clientX;
  const dy = cy - event.clientY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (!returning && dist > 0 && dist < 200) {
    if (wasOutside) panic = 1;

    const nx = dx / dist;
    const ny = dy / dist;
    const t = 1 - dist / 200;
    const strength = t * t * t * panic * 600;

    const newTx = tx + strength * nx;
    const newTy = ty + strength * ny;

    gsap.killTweensOf(noBtn);
    gsap.to(noBtn, {
      x: newTx, y: newTy, scale: 0.85,
      duration: 0.07, ease: "power2.out", overwrite: "auto"
    });
    tx = newTx;
    ty = newTy;
    panic = Math.max(0.15, panic * 0.94);
    wasOutside = false;

    const r2 = noBtn.getBoundingClientRect();
    if (r2.left < -100 || r2.right > window.innerWidth + 100 || r2.top < -100 || r2.bottom > window.innerHeight + 100) {
      returnHome("fast");
      return;
    }
  } else {
    wasOutside = true;
  }

  if (r.left < -100 || r.right > window.innerWidth + 100 || r.top < -100 || r.bottom > window.innerHeight + 100) {
    returnHome("fast");
    return;
  }

  if (!returning) {
    idleTimer = setTimeout(() => {
      if (!returning && (tx !== 0 || ty !== 0)) {
        returnHome("slow");
      }
    }, 800);
  }
}

function handleMouseLeave() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  cancelSlow();
  if (!returning && (tx !== 0 || ty !== 0)) {
    returnHome("slow");
  }
}

const options = [
  { id: "park", emoji: "🌳", title: "Walk in the Park", desc: "A lovely stroll under the trees" },
  { id: "bar", emoji: "🍸", title: "Bar", desc: "Drinks with a view" },
  { id: "restaurant", emoji: "🍽️", title: "Restaurant", desc: "A cozy dinner for two" },
  { id: "museum", emoji: "🏛️", title: "Museum", desc: "Get cultured together" },
] as const;

function pick(opt: typeof options[number]) {
  selected = opt.id;
  page = "when";
}

async function confirmDate() {
  if (!chosenName.trim() || !chosenDate) return;
  submitting = true;
  submitError = "";
  try {
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: chosenName.trim(),
        activity: selected,
        date: chosenDate,
        time_start: timeStart,
        time_end: timeEnd,
      }),
    });
    if (!res.ok) throw new Error("Failed to save");
    submitted = true;
    page = "done";
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#ff8fab", "#c77dff", "#ffb3c6", "#e0aaff"],
    });
  } catch (e) {
    submitError = "Something went wrong, but let's still go! 💖";
    page = "done";
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

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric"
  });
}

function sayYes() {
  page = "options";
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#ff8fab", "#c77dff", "#ffb3c6", "#e0aaff"],
  });
}
</script>

<svelte:window onmousemove={handleMouseMove} onmouseleave={handleMouseLeave} />

{#if page === "ask"}
  <div class="card">
    <div class="deco">✿  ♡  ☆  ♡  ✿</div>
    <h1>Will you go<br>on a date with me?</h1>
    <p class="sub">I like you a latte! 💕</p>
    <div class="buttons">
      <button class="btn yes" onclick={sayYes}>Yes 💖</button>
      <button bind:this={noBtn} class="btn no">No 💔</button>
    </div>
  </div>
{:else if page === "options"}
  <div class="card">
    <div class="deco">☆  ♡  ★  ♡  ☆</div>
    <h1>Yay! 💖<br>What should we do?</h1>
    <p class="sub">Pick your vibe ✨</p>
    <div class="options">
      {#each options as opt}
        <button class="option" onclick={() => pick(opt)}>
          <span class="opt-emoji">{opt.emoji}</span>
          <span class="opt-title">{opt.title}</span>
          <span class="opt-desc">{opt.desc}</span>
        </button>
      {/each}
    </div>
  </div>
{:else if page === "when"}
  <div class="card">
    <div class="deco">✧  ♡  ★  ♡  ✧</div>
    <h1>When are you free? 📅</h1>
    <p class="sub">
      {#each options as opt}
        {#if opt.id === selected}
          {opt.emoji} {opt.title}
        {/if}
      {/each}
    </p>
    <div class="form">
      <div class="field">
        <label class="field-label" for="name">Your name</label>
        <input id="name" type="text" bind:value={chosenName} class="text-input" placeholder="e.g. Kuromi~" />
      </div>
      <div class="field">
        <label class="field-label" for="date">Date</label>
        <input id="date" type="date" bind:value={chosenDate} class="text-input" min={new Date().toISOString().split("T")[0]} />
        {#if chosenDate}
          <p class="date-label">{formatDate(chosenDate)}</p>
        {/if}
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field-label" for="time-start">From</label>
          <input id="time-start" type="time" bind:value={timeStart} class="text-input" />
        </div>
        <div class="field">
          <label class="field-label" for="time-end">To</label>
          <input id="time-end" type="time" bind:value={timeEnd} class="text-input" />
        </div>
      </div>
      {#if submitError}
        <p class="form-error">{submitError}</p>
      {/if}
      <button
        class="btn confirm"
        disabled={!chosenName.trim() || !chosenDate || submitting}
        onclick={confirmDate}
      >{submitting ? "Saving..." : "Let's go! 💖"}</button>
    </div>
  </div>
{:else if page === "done"}
  <div class="card done-card">
    <div class="deco">✧  ♡  ★  ♡  ✧</div>
    <h1>It's a date! 💕</h1>
    <p class="sub">
      {chosenName}
      {#each options as opt}
        {#if opt.id === selected}
          &nbsp;💖&nbsp; {opt.emoji} {opt.title}
        {/if}
      {/each}
    </p>
    <p class="sub">
      📅 {formatDate(chosenDate)}
      <br>🕐 {timeStart} – {timeEnd}
    </p>
    <p class="big-emoji">🎉</p>
    <p class="sub">Can't wait! See you soon~ 💖</p>
  </div>
{/if}

<style>
  .card {
    background: var(--white);
    border-radius: 32px;
    padding: 48px 40px 40px;
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
    margin: 0 0 32px;
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

  .yes:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 24px rgba(200, 120, 180, 0.45);
  }

  .yes:active {
    transform: scale(0.95);
  }

  .no {
    border: 2px solid var(--pink-light);
    background: white;
    color: var(--pink);
  }

  .no:hover {
    background: var(--pink-pale);
  }

  .options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .option {
    font-family: "Fredoka", sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 20px 12px;
    border: 2px solid var(--pink-pale);
    border-radius: 20px;
    background: white;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
  }

  .option:hover {
    transform: scale(1.05);
    border-color: var(--pink);
    box-shadow: 0 4px 16px var(--shadow);
  }

  .option:active {
    transform: scale(0.95);
  }

  .opt-emoji {
    font-size: 36px;
    line-height: 1;
    margin-bottom: 4px;
  }

  .opt-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
  }

  .opt-desc {
    font-size: 12px;
    color: var(--text-light);
    line-height: 1.2;
  }

  .done-card {
    padding: 56px 40px;
  }

  .big-emoji {
    font-size: 64px;
    margin: 0 0 8px;
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
    flex: 1;
  }

  .field-row {
    display: flex;
    gap: 12px;
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

  .text-input::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.6;
  }

  .date-label {
    font-size: 20px;
    font-weight: 500;
    color: var(--purple);
    margin: 4px 0 0;
    text-align: center;
  }

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
</style>
