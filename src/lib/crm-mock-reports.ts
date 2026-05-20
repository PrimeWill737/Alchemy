import { mockDeals, mockLeads } from "@/lib/mock-db";
import type { ReportsSummary } from "@/lib/db-reports";
import type { Deal, DealStage, Lead } from "@/types/crm";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(date: Date): string {
  return MONTH_LABELS[date.getMonth()] ?? "—";
}

export function getMockReportsSummary(
  deals: Deal[] = mockDeals,
  leads: Lead[] = mockLeads,
): ReportsSummary {
  const activeStages: DealStage[] = ["discovery", "proposal", "negotiation"];
  const activeDeals = deals.filter((d) => activeStages.includes(d.stage)).length;
  const wonDeals = deals.filter((d) => d.stage === "closed_won");
  const revenue = wonDeals.reduce((sum, d) => sum + d.value, 0);

  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.status === "won").length;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 1000) / 10 : 0;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);

  const sumForMonth = (year: number, month: number) =>
    wonDeals
      .filter((d) => {
        if (!d.closeDate) return false;
        const ref = new Date(d.closeDate);
        return ref.getFullYear() === year && ref.getMonth() === month;
      })
      .reduce((sum, d) => sum + d.value, 0);

  const currentMonthRevenue = sumForMonth(thisYear, thisMonth);
  const previousMonthRevenue = sumForMonth(lastMonthDate.getFullYear(), lastMonthDate.getMonth());
  const growth =
    previousMonthRevenue > 0
      ? Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 1000) / 10
      : currentMonthRevenue > 0
        ? 100
        : 0;

  const monthlyRevenue: { month: string; revenue: number }[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(thisYear, thisMonth - i, 1);
    monthlyRevenue.push({
      month: monthLabel(d),
      revenue: sumForMonth(d.getFullYear(), d.getMonth()),
    });
  }

  const forecastThisMonth = deals
    .filter((d) => activeStages.includes(d.stage))
    .filter((d) => {
      if (!d.closeDate) return true;
      const close = new Date(d.closeDate);
      return close.getFullYear() === thisYear && close.getMonth() === thisMonth;
    })
    .reduce((sum, d) => sum + d.value, 0);

  return {
    revenue,
    conversionRate,
    activeDeals,
    growth,
    monthlyRevenue,
    forecastThisMonth,
  };
}
