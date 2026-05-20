"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import styles from "@/app/module-pages.module.scss";
import ccStyles from "@/app/settings/control-center.module.scss";
import type { PublicSignupPlan } from "@/lib/db-signup-plans";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PricingWireGrid } from "@/components/ui/skeleton";

type FormState = {
  id: string | null;
  name: string;
  slug: string;
  amountNgn: string;
  priceSuffix: string;
  featureLines: string;
  sortOrder: string;
  isActive: boolean;
  isCustomQuote: boolean;
  billingInterval: "one_time" | "monthly";
};

const emptyForm: FormState = {
  id: null,
  name: "",
  slug: "",
  amountNgn: "",
  priceSuffix: "/user",
  featureLines: "",
  sortOrder: "0",
  isActive: true,
  isCustomQuote: false,
  billingInterval: "one_time",
};

function toSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function SignupPlansPanel() {
  const [plans, setPlans] = useState<PublicSignupPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [planToDelete, setPlanToDelete] = useState<PublicSignupPlan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/signup-plans", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load plans");
        setPlans([]);
        return;
      }
      setPlans(Array.isArray(data.plans) ? data.plans : []);
    } catch {
      setError("Could not load plans");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const editPlan = (p: PublicSignupPlan) => {
    setForm({
      id: p.id,
      name: p.name,
      slug: p.slug,
      amountNgn: p.amountNgn === null ? "" : String(p.amountNgn),
      priceSuffix: p.priceSuffix || "/user",
      featureLines: (p.features ?? []).join("\n"),
      sortOrder: String(p.sortOrder),
      isActive: p.isActive,
      isCustomQuote: p.isCustomQuote,
      billingInterval: p.billingInterval ?? "one_time",
    });
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    const featureLines = form.featureLines
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const sortOrder = Number.parseInt(form.sortOrder, 10);
    const parsedAmount = Number.parseFloat(form.amountNgn);
    const amountNgn = form.isCustomQuote ? null : parsedAmount;
    if (!form.isCustomQuote && (Number.isNaN(parsedAmount) || parsedAmount < 0)) {
      setError("Enter a valid amount in NGN (or mark as custom-quote plan).");
      setSaving(false);
      return;
    }
    if (Number.isNaN(sortOrder)) {
      setError("Sort order must be a number.");
      setSaving(false);
      return;
    }
    const slug = toSlug(form.slug.trim() || form.name);
    const body = {
      name: form.name.trim(),
      slug,
      amountNgn: form.isCustomQuote ? null : amountNgn,
      priceSuffix: form.priceSuffix.trim() || "/user",
      featureLines,
      sortOrder,
      isActive: form.isActive,
      isCustomQuote: form.isCustomQuote,
      billingInterval: form.billingInterval,
    };
    try {
      const url = form.id ? `/api/signup-plans/${form.id}` : "/api/signup-plans";
      const res = await fetch(url, {
        method: form.id ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data.error === "string" ? data.error : "Save failed";
        setError(msg);
        return;
      }
      setForm(emptyForm);
      await load();
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmRemovePlan = async () => {
    const p = planToDelete;
    if (!p) return;
    setError("");
    setDeletingId(p.id);
    try {
      const res = await fetch(`/api/signup-plans/${p.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not delete plan.");
        return;
      }
      if (form.id === p.id) {
        setForm(emptyForm);
      }
      setPlanToDelete(null);
      await load();
    } catch {
      setError("Could not delete plan.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <h2>Signup &amp; landing plans</h2>
      <p className={`${styles.metaLine} ${ccStyles.planPanelLead}`}>
        Only <strong>active</strong> plans appear on the public site and signup form. Currency is NGN (₦). After you add
        plans here, visitors see them on the home page pricing section.
      </p>
      <ConfirmDialog
        open={planToDelete !== null}
        title="Delete plan?"
        description={
          planToDelete ? (
            <>
              Delete &ldquo;<strong>{planToDelete.name}</strong>&rdquo;? It will be removed from the landing page and
              signup. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete plan"
        confirmPendingLabel="Deleting…"
        pending={Boolean(planToDelete && deletingId === planToDelete.id)}
        onCancel={() => setPlanToDelete(null)}
        onConfirm={confirmRemovePlan}
      />

      {loading ? (
        <div style={{ marginTop: "0.5rem" }}>
          <PricingWireGrid count={2} />
        </div>
      ) : null}
      {error ? <p className={ccStyles.planError}>{error}</p> : null}

      <div className={ccStyles.planFormGrid}>
        <Input
          label="Plan name (tier)"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <Input
          label="URL slug"
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          placeholder="e.g. growth"
        />
        <label className={ccStyles.planCheck}>
          <input
            type="checkbox"
            checked={form.isCustomQuote}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                isCustomQuote: e.target.checked,
                amountNgn: e.target.checked ? "" : f.amountNgn,
              }))
            }
          />
          <span>Custom quote (no fixed price — shows &ldquo;Custom&rdquo; on the site)</span>
        </label>
        <Input
          label={form.isCustomQuote ? "Amount (NGN) — not used for custom quote" : "Amount (NGN)"}
          type="number"
          min={0}
          step={1}
          value={form.amountNgn}
          disabled={form.isCustomQuote}
          placeholder={form.isCustomQuote ? "—" : "e.g. 25000"}
          onChange={(e) => setForm((f) => ({ ...f, amountNgn: e.target.value }))}
        />
        <Input
          label="Price suffix"
          value={form.priceSuffix}
          onChange={(e) => setForm((f) => ({ ...f, priceSuffix: e.target.value }))}
          placeholder="/user or /month"
        />
        <Input
          label="Sort order"
          type="number"
          value={form.sortOrder}
          onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
        />
        <label className={ccStyles.planCheck}>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
          <span>Active (visible on landing &amp; signup)</span>
        </label>
        <label className={ccStyles.planFeatures}>
          <span>Billing cycle (for subscription enforcement)</span>
          <select
            className={ccStyles.planTextarea}
            style={{ maxWidth: 320, padding: "10px 12px", borderRadius: 8 }}
            value={form.billingInterval}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                billingInterval: e.target.value === "monthly" ? "monthly" : "one_time",
              }))
            }
          >
            <option value="one_time">One-time (access continues after approval)</option>
            <option value="monthly">Monthly (renewal + reminders)</option>
          </select>
        </label>
        <label className={ccStyles.planFeatures}>
          <span>Feature bullets (one per line)</span>
          <textarea
            value={form.featureLines}
            onChange={(e) => setForm((f) => ({ ...f, featureLines: e.target.value }))}
            rows={4}
            className={ccStyles.planTextarea}
          />
        </label>
        <div className={ccStyles.planActions}>
          <Button type="button" onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving…" : form.id ? "Update plan" : "Add plan"}
          </Button>
          {form.id ? (
            <Button type="button" variant="secondary" onClick={() => setForm(emptyForm)} disabled={saving}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </div>

      <div className={ccStyles.planCatalog}>
        <h3 className={ccStyles.subsectionTitle}>All plans</h3>
        {plans.length === 0 && !loading ? (
          <p className={styles.metaLine}>No plans yet. Create one above to publish pricing.</p>
        ) : (
          <div className={ccStyles.planList}>
            {plans.map((p) => (
              <div key={p.id} className={ccStyles.planRow}>
                <div className={ccStyles.planRowMain}>
                  <span className={ccStyles.planRowName}>{p.name}</span>
                  <span className={ccStyles.planRowMeta}>
                    {p.isCustomQuote ? "Custom" : `₦${(p.amountNgn ?? 0).toLocaleString("en-NG")}${p.priceSuffix}`}
                    {" · "}
                    {p.sortOrder}
                    {" · "}
                    {p.isActive ? "active" : "inactive"}
                    {" · "}
                    {p.billingInterval === "monthly" ? "monthly" : "one-time"}
                  </span>
                </div>
                <div className={ccStyles.planRowActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={Boolean(deletingId) || saving}
                    onClick={() => editPlan(p)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={deletingId === p.id || Boolean(deletingId) || saving}
                    onClick={() => setPlanToDelete(p)}
                  >
                    {deletingId === p.id ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
