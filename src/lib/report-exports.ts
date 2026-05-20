import { jsPDF } from "jspdf";
import type { Customer, Deal, Lead, User } from "@/types/crm";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadSalesReportCsv(input: {
  deals: Deal[];
  customers: Customer[];
  users: User[];
}) {
  const customerById = Object.fromEntries(input.customers.map((c) => [c.id, c.name]));
  const userById = Object.fromEntries(input.users.map((u) => [u.id, u.name]));
  const header = ["Deal Title", "Customer", "Value", "Stage", "Close Date", "Assigned To"];
  const dataRows = input.deals.map((d) => [
    d.title,
    customerById[d.customerId] ?? d.customerId,
    String(d.value),
    d.stage,
    d.closeDate,
    userById[d.assignedTo] ?? d.assignedTo,
  ]);
  const lines = [header, ...dataRows].map((row) => row.map((c) => escapeCsvCell(String(c))).join(","));
  const csv = lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(`sales-report-${stamp}.csv`, blob);
}

export function downloadLeadReportPdf(input: { leads: Lead[]; users: User[] }) {
  const userById = Object.fromEntries(input.users.map((u) => [u.id, u.name]));
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.text("Lead report", margin, y);
  y += 28;

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);
  y += 24;
  doc.setTextColor(0, 0, 0);

  const colX = [margin, margin + 130, margin + 230, margin + 310, margin + 380, margin + 450];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Lead", colX[0], y);
  doc.text("Source", colX[1], y);
  doc.text("Status", colX[2], y);
  doc.text("Value", colX[3], y);
  doc.text("Assigned", colX[4], y);
  doc.text("Created", colX[5], y);
  y += 14;
  doc.setFont("helvetica", "normal");

  const pageBottom = 720;
  for (const lead of input.leads) {
    if (y > pageBottom) {
      doc.addPage();
      y = margin;
    }
    doc.text(lead.name.slice(0, 22), colX[0], y);
    doc.text(lead.source.slice(0, 14), colX[1], y);
    doc.text(lead.status, colX[2], y);
    doc.text(String(lead.value), colX[3], y);
    doc.text((userById[lead.assignedTo] ?? lead.assignedTo).slice(0, 12), colX[4], y);
    doc.text(lead.createdAt, colX[5], y);
    y += 16;
  }

  if (input.leads.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("No leads in workspace.", margin, y);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`lead-report-${stamp}.pdf`);
}
