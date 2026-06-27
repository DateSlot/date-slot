<script lang="ts">
import { gsap } from "gsap";
import { onMount } from "svelte";

let noBtn: HTMLElement;
let tx = 0;
let ty = 0;
let ready = false;
let returning = false;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let slowTween: gsap.core.Tween | null = null;

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
    const nx = dx / dist;
    const ny = dy / dist;
    const strength = 1 - dist / 200;
    const newTx = tx + strength * nx * 400;
    const newTy = ty + strength * ny * 400;

    gsap.set(noBtn, { x: newTx, y: newTy, scale: 0.85 });
    tx = newTx;
    ty = newTy;

    const r2 = noBtn.getBoundingClientRect();
    if (r2.left < -100 || r2.right > window.innerWidth + 100 || r2.top < -100 || r2.bottom > window.innerHeight + 100) {
      returnHome("fast");
      return;
    }
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
</script>

<svelte:window onmousemove={handleMouseMove} onmouseleave={handleMouseLeave} />

<div class="card">
  <div class="deco">✿  ♡  ☆  ♡  ✿</div>

  <h1>Will you go<br>on a date with me?</h1>

  <p class="sub">I like you a latte! 💕</p>

  <div class="buttons">
    <button class="yes" onclick={() => alert("Yay! 💖")}>Yes 💖</button>
    <button bind:this={noBtn} class="no">No 💔</button>
  </div>
</div>

<style>
  .card {
    background: var(--white);
    border-radius: 32px;
    padding: 48px 40px 40px;
    max-width: 440px;
    width: 100%;
    text-align: center;
    box-shadow: 0 8px 32px var(--shadow);
    position: relative;
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

  .yes {
    font-family: "Fredoka", sans-serif;
    font-size: 18px;
    font-weight: 500;
    padding: 12px 36px;
    border: none;
    border-radius: 60px;
    background: linear-gradient(135deg, var(--pink), var(--purple-light));
    color: white;
    cursor: pointer;
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
    font-family: "Fredoka", sans-serif;
    font-size: 18px;
    font-weight: 500;
    padding: 12px 36px;
    border: 2px solid var(--pink-light);
    border-radius: 60px;
    background: white;
    color: var(--pink);
    cursor: pointer;
    white-space: nowrap;
  }

  .no:hover {
    background: var(--pink-pale);
  }
</style>
