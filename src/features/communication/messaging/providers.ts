import type { ConfigurableChannel, ProviderName } from "./api";

export interface ProviderField {
  key: string;
  label: string;
  secret?: boolean;
  required?: boolean;
  placeholder?: string;
  help?: string;
}

export interface ProviderDefinition {
  name: ProviderName;
  label: string;
  channel: ConfigurableChannel;
  help: string;
  fields: ProviderField[];
  /** What to paste into the provider's dashboard as the webhook / callback URL. */
  webhookHelp?: string;
}

/** The providers each channel can use, and the fields their settings form needs. Mirrors MessagingAdminService.Requirements. */
export const PROVIDERS: ProviderDefinition[] = [
  {
    name: "Smtp",
    label: "SMTP server",
    channel: "email",
    help: "Any SMTP relay: your own mail server, Brevo or Amazon SES SMTP, or Google Workspace with an app password.",
    fields: [
      { key: "host", label: "SMTP host", required: true, placeholder: "smtp-relay.brevo.com" },
      { key: "port", label: "Port", required: true, placeholder: "587" },
      { key: "useSsl", label: "Use TLS (true/false)", placeholder: "true" },
      { key: "username", label: "Username" },
      { key: "password", label: "Password", secret: true },
      { key: "fromEmail", label: "From address", required: true, placeholder: "office@yourschool.in" },
      { key: "fromName", label: "From name (school name)", required: true, placeholder: "St. Mary's School" },
      { key: "replyTo", label: "Reply-to address" },
    ],
  },
  {
    name: "Brevo",
    label: "Brevo (API)",
    channel: "email",
    help: "Brevo transactional email API. Gives delivery, bounce and open events through the webhook below.",
    fields: [
      { key: "apiKey", label: "API key", secret: true, required: true },
      { key: "fromEmail", label: "Verified sender address", required: true },
      { key: "fromName", label: "From name (school name)", required: true },
    ],
    webhookHelp: "Brevo → Transactional → Settings → Webhooks: add this URL with events Delivered, Hard bounce, Soft bounce, Blocked, Spam, Unsubscribed, Opened.",
  },
  {
    name: "Msg91",
    label: "MSG91",
    channel: "sms",
    help: "Indian SMS through MSG91 Flow. Each message template needs its DLT-approved Flow id; the message text goes into the flow variable.",
    fields: [
      { key: "authKey", label: "Auth key", secret: true, required: true },
      { key: "senderId", label: "Sender id (6 letters, DLT registered)", required: true, placeholder: "SCHOOL" },
      { key: "defaultFlowId", label: "Default Flow id (used when a template has none)" },
      { key: "bodyVariable", label: "Flow variable for the text", placeholder: "body" },
    ],
    webhookHelp: "MSG91 → Settings → Webhook (SMS delivery report): paste this URL, method POST.",
  },
  {
    name: "Twilio",
    label: "Twilio",
    channel: "sms",
    help: "Twilio Programmable Messaging. Delivery receipts come back signed to the callback URL automatically.",
    fields: [
      { key: "accountSid", label: "Account SID", required: true },
      { key: "authToken", label: "Auth token", secret: true, required: true },
      { key: "fromNumber", label: "From number (E.164)", placeholder: "+1415…" },
      { key: "messagingServiceSid", label: "Messaging service SID (instead of a from number)" },
    ],
  },
  {
    name: "WhatsAppCloud",
    label: "WhatsApp Business (Meta Cloud API)",
    channel: "whatsapp",
    help: "Official WhatsApp Business Platform. Business-initiated messages must use an approved template; the message text is its body parameter {{1}}.",
    fields: [
      { key: "phoneNumberId", label: "Phone number id", required: true },
      { key: "accessToken", label: "Permanent access token", secret: true, required: true },
      { key: "appSecret", label: "App secret (verifies webhooks)", secret: true, required: true },
      { key: "verifyToken", label: "Webhook verify token (any random text)", secret: true, required: true },
      { key: "defaultTemplateName", label: "Default template name", placeholder: "school_announcement" },
      { key: "defaultTemplateLanguage", label: "Default template language", placeholder: "en" },
      { key: "apiVersion", label: "Graph API version", placeholder: "v20.0" },
    ],
    webhookHelp: "Meta App → WhatsApp → Configuration → Webhook: callback URL below, verify token as entered here; subscribe to 'messages'.",
  },
];

export const providersFor = (channel: ConfigurableChannel) => PROVIDERS.filter((p) => p.channel === channel);

export const CHANNEL_TITLES: Record<ConfigurableChannel, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
