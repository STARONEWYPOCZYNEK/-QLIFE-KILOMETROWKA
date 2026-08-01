export interface SendResult {
  success: boolean;
  error?: string;
}

export async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { success: false, error: "Brak RESEND_API_KEY lub RESEND_FROM_EMAIL w konfiguracji." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data?.message ?? `Resend zwrócił błąd ${response.status}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Nieznany błąd Resend." };
  }
}
