import { getAppName, getAppPublicUrl, getBrandLogoUrl } from "@/lib/email/env";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailShell(opts: {
  previewText: string;
  title: string;
  innerHtml: string;
}) {
  const app = getAppName();
  const logo = getBrandLogoUrl();
  const origin = getAppPublicUrl();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${opts.title}</title>
  <!--[if mso]><style type="text/css">table { border-collapse: collapse; }</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Georgia,'Times New Roman',serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${opts.previewText}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#0f172a 0%,#1e293b 40%,#0f172a 100%);padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 25px 80px rgba(0,0,0,0.45);">
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a2f 0%,#2d5a3d 50%,#3d7a4d 100%);padding:36px 40px;text-align:center;">
              <img src="${logo}" alt="${app}" width="120" height="52" style="display:inline-block;border:0;outline:none;" />
              <p style="margin:20px 0 0;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:rgba(255,255,255,0.75);font-family:system-ui,sans-serif;">${app}</p>
            </td>
          </tr>
          <tr>
            <td style="background:#fafdf8;padding:40px 40px 32px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b;">
              ${opts.innerHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#eef5e6;padding:24px 40px;text-align:center;font-size:12px;color:#4b5563;font-family:system-ui,sans-serif;">
              <p style="margin:0 0 8px;">You are receiving this because of an action on <a href="${origin}" style="color:#355d3f;font-weight:600;">${origin.replace(/^https?:\/\//, "")}</a>.</p>
              <p style="margin:0;">© ${new Date().getFullYear()} ${app}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function otpEmailHtml(code: string) {
  const inner = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">Your verification code</h1>
    <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#475569;">Use this one-time code to reset your password. It expires in <strong>10 minutes</strong>.</p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px;">
      <tr>
        <td style="background:linear-gradient(135deg,#ecfdf3,#dcfce7);border:2px dashed #3d7a4d;border-radius:16px;padding:20px 48px;text-align:center;">
          <span style="font-size:36px;font-weight:800;letter-spacing:0.28em;color:#166534;font-family:'Courier New',monospace;">${code}</span>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#64748b;">If you did not request a password reset, you can ignore this email. Your account remains secure.</p>
  `;
  return emailShell({
    previewText: `Your ${getAppName()} code: ${code}`,
    title: "Verification code",
    innerHtml: inner,
  });
}

export function welcomeSignupEmailHtml(opts: {
  name: string;
  company: string;
  role: string;
  quotedAmount: string;
  tier: string;
}) {
  const inner = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">Welcome aboard, ${opts.name}</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#475569;">Thank you for choosing <strong>${getAppName()}</strong>. Your workspace request is recorded and our team will follow up to activate billing and access.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;border-radius:14px;overflow:hidden;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 22px;font-size:14px;color:#334155;">
          <p style="margin:0 0 10px;"><strong>Company</strong><br/>${opts.company}</p>
          <p style="margin:0 0 10px;"><strong>Your role</strong><br/>${opts.role}</p>
          <p style="margin:0 0 10px;"><strong>Plan</strong><br/>${opts.tier}</p>
          <p style="margin:0;"><strong>Quoted amount</strong><br/><span style="font-size:18px;font-weight:700;color:#166534;">${opts.quotedAmount}</span></p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#64748b;">Sign in with the password you created, then go to <strong>Settings → Billing</strong> (sidebar: <>Billing</ Access to workspace tools is enabled after the super admin confirms your payment.</p>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#64748b;">Bank: <strong>GTBank</strong> · Account name: <strong>Onoja William Bosworth</strong> · Account number: <strong>0558518751</strong></p>
  `;
  return emailShell({
    previewText: `Welcome to ${getAppName()}, ${opts.name}`,
    title: "Welcome",
    innerHtml: inner,
  });
}

export function passwordResetSuccessEmailHtml() {
  const inner = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#0f172a;">Password updated</h1>
    <p style="margin:0;font-size:16px;line-height:1.6;color:#475569;">Your ${getAppName()} password was changed successfully. If this was not you, contact support immediately.</p>
  `;
  return emailShell({
    previewText: "Your password was changed",
    title: "Password updated",
    innerHtml: inner,
  });
}

export function subscriptionPaymentNotifySuperAdminHtml(opts: {
  kind: "initial" | "resubscribe";
  organizationName: string;
  billingContactName: string;
  billingContactEmail: string;
  planName: string;
  amountLabel: string;
  transferReference: string;
  controlCenterUrl: string;
}) {
  const headline =
    opts.kind === "resubscribe"
      ? "Resubscription payment submitted"
      : "New subscription payment submitted";
  const lead =
    opts.kind === "resubscribe"
      ? "A workspace admin has submitted a bank transfer for renewal. Please confirm in Control Center."
      : "A new workspace admin has submitted a bank transfer. Please confirm in Control Center before they can use the product.";
  const inner = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">${headline}</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#475569;">${lead}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;border-radius:14px;overflow:hidden;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 22px;font-size:14px;color:#334155;">
          <p style="margin:0 0 10px;"><strong>Workspace</strong><br/>${escapeHtml(opts.organizationName)}</p>
          <p style="margin:0 0 10px;"><strong>Billing contact</strong><br/>${escapeHtml(opts.billingContactName)} · ${escapeHtml(opts.billingContactEmail)}</p>
          <p style="margin:0 0 10px;"><strong>Plan</strong><br/>${escapeHtml(opts.planName)}</p>
          <p style="margin:0 0 10px;"><strong>Amount</strong><br/>${escapeHtml(opts.amountLabel)}</p>
          <p style="margin:0;"><strong>Transfer reference / note</strong><br/><span style="font-weight:700;color:#166534;">${escapeHtml(opts.transferReference)}</span></p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#475569;">Open <a href="${escapeHtml(opts.controlCenterUrl)}" style="color:#166534;font-weight:700;">Control Center → Subscriptions</a> to approve.</p>
  `;
  return emailShell({
    previewText: `${headline} — ${opts.organizationName}`,
    title: headline,
    innerHtml: inner,
  });
}

export function subscriptionRenewalReminderEmailHtml(opts: {
  name: string;
  planName: string;
  periodEnd: string;
  billingUrl: string;
}) {
  const inner = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">Your plan renews soon</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">Hello ${escapeHtml(opts.name)},</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#475569;">Your <strong>${escapeHtml(opts.planName)}</strong> subscription for <strong>${getAppName()}</strong> is valid through <strong>${escapeHtml(opts.periodEnd)}</strong>. Please complete a renewal transfer at least one day before access is paused.</p>
    <p style="margin:0;font-size:15px;line-height:1.55;color:#475569;">Use the billing page to submit your transfer details: <a href="${escapeHtml(opts.billingUrl)}" style="color:#166534;font-weight:700;">Open billing</a></p>
  `;
  return emailShell({
    previewText: `Renew ${getAppName()} before ${opts.periodEnd}`,
    title: "Renewal reminder",
    innerHtml: inner,
  });
}

export function subscriptionAccessPurgeEmailHtml(opts: {
  organizationId: string;
  planName: string;
  memberEmails: string[];
}) {
  const list = opts.memberEmails.map((e) => escapeHtml(e)).join(", ");
  const inner = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#0f172a;">Workspace deactivated (billing)</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">The grace period after <strong>${escapeHtml(opts.planName)}</strong> ended without a confirmed renewal. All users in this workspace have been deactivated.</p>
    <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Organization id</strong><br/><code style="background:#f1f5f9;padding:4px 8px;border-radius:6px;">${escapeHtml(opts.organizationId)}</code></p>
    <p style="margin:0;font-size:14px;color:#334155;"><strong>Accounts affected</strong><br/>${list || "—"}</p>
  `;
  return emailShell({
    previewText: "Workspace closed after subscription grace period",
    title: "Workspace deactivated",
    innerHtml: inner,
  });
}

export function subscriptionWorkspaceClosedEmailHtml(opts: { name: string }) {
  const inner = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#0f172a;">Your workspace has been closed</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">Hello ${escapeHtml(opts.name)},</p>
    <p style="margin:0;font-size:16px;line-height:1.6;color:#475569;">Your organization&rsquo;s <strong>${getAppName()}</strong> access ended after the renewal grace period without a confirmed payment. If you believe this is a mistake, contact support.</p>
  `;
  return emailShell({
    previewText: `Your ${getAppName()} workspace has been closed`,
    title: "Workspace closed",
    innerHtml: inner,
  });
}

export function subscriptionCancelledUserEmailHtml(opts: { name: string }) {
  const inner = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#0f172a;">Subscription cancelled</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">Hello ${escapeHtml(opts.name)},</p>
    <p style="margin:0;font-size:16px;line-height:1.6;color:#475569;">Your workspace subscription for <strong>${getAppName()}</strong> was cancelled. Access to the app is paused until a new payment is approved.</p>
  `;
  return emailShell({
    previewText: "Your subscription was cancelled",
    title: "Subscription cancelled",
    innerHtml: inner,
  });
}

export function inviteLoginOtpEmailHtml(opts: { name: string; email: string; code: string; loginUrl: string }) {
  const inner = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">Your ${getAppName()} login code</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">Hello ${escapeHtml(opts.name)},</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#475569;">An administrator added you to the workspace. Sign in with your work email <strong>${escapeHtml(opts.email)}</strong> and this one-time password. You will be asked to set a new password after your first sign-in.</p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px;">
      <tr>
        <td style="background:linear-gradient(135deg,#ecfdf3,#dcfce7);border:2px dashed #3d7a4d;border-radius:16px;padding:20px 48px;text-align:center;">
          <span style="font-size:32px;font-weight:800;letter-spacing:0.2em;color:#166534;font-family:'Courier New',monospace;">${escapeHtml(opts.code)}</span>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#475569;"><a href="${escapeHtml(opts.loginUrl)}" style="color:#166534;font-weight:700;">Open sign-in page</a></p>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#64748b;">This code expires in <strong>7 days</strong>. Keep it private.</p>
  `;
  return emailShell({
    previewText: `Your ${getAppName()} one-time login code`,
    title: "Workspace invite",
    innerHtml: inner,
  });
}

export function taskAssignedEmailHtml(opts: {
  assigneeName: string;
  assignerName: string;
  taskTitle: string;
  dueDate: string;
  priority: string;
  tasksUrl: string;
}) {
  const due = opts.dueDate ? escapeHtml(opts.dueDate) : "Not set";
  const inner = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">New task assigned to you</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">Hello ${escapeHtml(opts.assigneeName)},</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#475569;"><strong>${escapeHtml(opts.assignerName)}</strong> assigned you a task on <strong>${getAppName()}</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;border-radius:14px;overflow:hidden;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 22px;font-size:14px;color:#334155;">
          <p style="margin:0 0 10px;"><strong>Task</strong><br/>${escapeHtml(opts.taskTitle)}</p>
          <p style="margin:0 0 10px;"><strong>Due</strong><br/>${due}</p>
          <p style="margin:0;"><strong>Priority</strong><br/>${escapeHtml(opts.priority)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:15px;line-height:1.55;color:#475569;"><a href="${escapeHtml(opts.tasksUrl)}" style="color:#166534;font-weight:700;">View your tasks</a></p>
  `;
  return emailShell({
    previewText: `${opts.assignerName} assigned you: ${opts.taskTitle}`,
    title: "Task assigned",
    innerHtml: inner,
  });
}

export function taskReminderEmailHtml(opts: {
  assigneeName: string;
  senderName: string;
  taskTitle: string;
  dueDate: string;
  status: string;
  tasksUrl: string;
}) {
  const due = opts.dueDate ? escapeHtml(opts.dueDate) : "Not set";
  const inner = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">Task reminder</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">Hello ${escapeHtml(opts.assigneeName)},</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#475569;"><strong>${escapeHtml(opts.senderName)}</strong> sent you a reminder about your assigned task.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;border-radius:14px;overflow:hidden;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 22px;font-size:14px;color:#334155;">
          <p style="margin:0 0 10px;"><strong>Task</strong><br/>${escapeHtml(opts.taskTitle)}</p>
          <p style="margin:0 0 10px;"><strong>Due</strong><br/>${due}</p>
          <p style="margin:0 0 10px;"><strong>Status</strong><br/>${escapeHtml(opts.status.replace(/_/g, " "))}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:15px;line-height:1.55;color:#475569;"><a href="${escapeHtml(opts.tasksUrl)}" style="color:#166534;font-weight:700;">Open task</a></p>
  `;
  return emailShell({
    previewText: `Reminder: ${opts.taskTitle}`,
    title: "Task reminder",
    innerHtml: inner,
  });
}

export function workspaceAccessRemovedEmailHtml(opts: {
  name: string;
  removedBy: string;
  reason: string;
}) {
  const inner = `
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">Workspace access removed</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">Hello ${escapeHtml(opts.name)},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#475569;">Your access to <strong>${getAppName()}</strong> has been removed by <strong>${escapeHtml(opts.removedBy)}</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;border-radius:14px;overflow:hidden;margin-bottom:20px;">
      <tr>
        <td style="padding:18px 20px;font-size:14px;line-height:1.55;color:#334155;">
          <p style="margin:0;font-weight:700;color:#0f172a;">Reason provided</p>
          <p style="margin:8px 0 0;white-space:pre-wrap;">${escapeHtml(opts.reason)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;line-height:1.55;color:#64748b;">If you believe this was a mistake, reply to your administrator or support.</p>
  `;
  return emailShell({
    previewText: `Your ${getAppName()} access was removed`,
    title: "Access removed",
    innerHtml: inner,
  });
}
