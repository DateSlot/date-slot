import Mailjet from "node-mailjet";

let mailjetClient = null;

function getClient() {
  if (mailjetClient) return mailjetClient;
  const apiKey = process.env.MJ_APIKEY_PUBLIC;
  const apiSecret = process.env.MJ_APIKEY_PRIVATE;
  if (!apiKey || !apiSecret) return null;
  mailjetClient = Mailjet.apiConnect(apiKey, apiSecret);
  return mailjetClient;
}

export async function sendEmail({ to, subject, text }) {
  const client = getClient();
  if (!client) {
    console.log(`[email] Would send to ${to}: ${subject}`);
    return;
  }

  const fromEmail = process.env.MAILJET_FROM_EMAIL || "noreply@date-slot.vercel.app";
  const fromName = process.env.MAILJET_FROM_NAME || "Date Slot";

  try {
    await client.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: { Email: fromEmail, Name: fromName },
          To: [{ Email: to }],
          Subject: subject,
          TextPart: text,
        },
      ],
    });
    console.log(`[email] Sent to ${to}: ${subject}`);
  } catch (err) {
    console.error(`[email] Failed to send to ${to}:`, err.message);
  }
}

export function bookingNotificationEmail({ bookerName, creatorName, date, timeStart, timeEnd, activity, bookerEmail, editUrl }) {
  return {
    subject: `New booking request from ${bookerName}! 💕`,
    text: [
      `${bookerName} wants to go on a date with you! 💕`,
      ``,
      `📅 ${date}`,
      `🕐 ${timeStart} – ${timeEnd}`,
      `💫 ${activity || "No activity set"}`,
      `📧 ${bookerEmail}`,
      ``,
      `Login to accept or deny: ${editUrl}`,
    ].join("\n"),
  };
}

export function confirmationEmail({ bookerName, creatorName, date, timeStart, timeEnd, activity }) {
  return {
    subject: `Your date with ${creatorName} is confirmed! 💕`,
    text: [
      `Hey ${bookerName}! 💖`,
      ``,
      `Your date with ${creatorName} is confirmed!`,
      ``,
      `📅 ${date}`,
      `🕐 ${timeStart} – ${timeEnd}`,
      `💫 ${activity || "No activity set"}`,
      ``,
      `Can't wait! See you soon~ 💕`,
      `— ${creatorName}`,
    ].join("\n"),
  };
}

export function registrationConfirmationEmail({ username, displayName, email, manageUrl }) {
  return {
    subject: "Welcome to Date Slot! 🎉",
    text: [
      `Hey ${displayName}! 💖`,
      ``,
      `Your page is ready! 🎉`,
      ``,
      `🌐 Your public page: https://date-slot.vercel.app/u/${username}`,
      `🔐 Manage your slots: ${manageUrl}`,
      ``,
      `Here's how it works:`,
      `1. Share your page link with someone special`,
      `2. They'll pick a slot and send a request`,
      `3. You get an email notification — accept or deny from your manage page`,
      ``,
      `✨ Make sure to add some available slots so people can book you!`,
      ``,
      `Have fun! 💕`,
      `— Date Slot`,
    ].join("\n"),
  };
}

export function denialEmail({ bookerName, creatorName, reason }) {
  return {
    subject: `Update on your date request from ${creatorName}`,
    text: [
      `Hey ${bookerName},`,
      ``,
      `${creatorName} had to decline your date request.`,
      reason ? `Reason: ${reason}` : null,
      ``,
      `Don't give up! Maybe next time 💕`,
    ].filter(Boolean).join("\n"),
  };
}
