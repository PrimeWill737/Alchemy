import type { DealStage } from "@/types/crm";
import { query } from "@/lib/db";

export type ReportsSummary = {
  revenue: number;
  conversionRate: number;
  activeDeals: number;
  growth: number;
  monthlyRevenue: { month: string; revenue: number }[];
  forecastThisMonth: number;
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(date: Date): string {
  return MONTH_LABELS[date.getMonth()] ?? "—";
}

export async function getReportsSummary(organizationId: string): Promise<ReportsSummary> {
  const { rows: dealRows } = await query<{
    value: string;
    stage: string;
    close_date: Date | string | null;
    updated_at: Date | string;
  }>(
    `SELECT value::text, stage::text, close_date, updated_at
     FROM deals
     WHERE organization_id = $1 AND deleted_at IS NULL`,
    [organizationId],
  );

  const { rows: leadRows } = await query<{ status: string }>(
    `SELECT status::text FROM leads
     WHERE organization_id = $1 AND deleted_at IS NULL`,
    [organizationId],
  );

  const activeStages: DealStage[] = ["discovery", "proposal", "negotiation"];
  const activeDeals = dealRows.filter((d) => activeStages.includes(d.stage as DealStage)).length;

  const wonDeals = dealRows.filter((d) => d.stage === "closed_won");
  const revenue = wonDeals.reduce((sum, d) => sum + Number(d.value), 0);

  const totalLeads = leadRows.length;
  const wonLeads = leadRows.filter((l) => l.status === "won").length;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 1000) / 10 : 0;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);

  const sumForMonth = (year: number, month: number) =>
    dealRows
      .filter((d) => d.stage === "closed_won")
      .filter((d) => {
        const ref = d.close_date
          ? d.close_date instanceof Date
            ? d.close_date
            : new Date(String(d.close_date))
          : d.updated_at instanceof Date
            ? d.updated_at
            : new Date(String(d.updated_at));
        return ref.getFullYear() === year && ref.getMonth() === month;
      })
      .reduce((sum, d) => sum + Number(d.value), 0);

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

  const forecastThisMonth = dealRows
    .filter((d) => activeStages.includes(d.stage as DealStage))
    .filter((d) => {
      if (!d.close_date) return true;
      const close = d.close_date instanceof Date ? d.close_date : new Date(String(d.close_date));
      return close.getFullYear() === thisYear && close.getMonth() === thisMonth;
    })
    .reduce((sum, d) => sum + Number(d.value), 0);

  return {
    revenue,
    conversionRate,
    activeDeals,
    growth,
    monthlyRevenue,
    forecastThisMonth,
  };
}
