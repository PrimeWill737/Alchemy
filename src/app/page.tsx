"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LandingBootSplash } from "@/components/loading/landing-boot-splash";
import { PricingWireGrid } from "@/components/ui/skeleton";
import type { PublicSignupPlan } from "@/lib/db-signup-plans";
import styles from "./landing.module.scss";

const modules = [
  "Leads",
  "Customers",
  "Pipeline",
  "Tasks",
  "Reports",
  "Team",
  "Messaging",
  "Automation",
];

const faqs = [
  {
    question: "Who is Alchemy for?",
    answer: "Sales, success, and ops teams that want one place for the full customer lifecycle.",
  },
  {
    question: "Can workflows match our process?",
    answer: "Yes — stages, tasks, and reporting adapt to how you already work.",
  },
];

const testimonials = [
  {
    name: "Maya Okafor",
    role: "Sales Director, Novacore",
    quote: "One stack, faster replies, cleaner pipeline visibility.",
  },
  {
    name: "Ethan Cole",
    role: "Operations, Greenline",
    quote: "Finally a CRM the whole team actually uses.",
  },
];

const sectionMotion = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: "easeOut" as const },
  viewport: { once: false, amount: 0.2 },
};

export default function Home() {
  const [plans, setPlans] = useState<PublicSignupPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/signup-plans")
      .then((res) => res.json())
      .then((data: { plans?: PublicSignupPlan[] }) => {
        if (!cancelled && Array.isArray(data.plans)) setPlans(data.plans);
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <LandingBootSplash />
      <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.nav}>
          <div className={styles.brand}>Alchemy</div>
          <div className={styles.links}>
            <ThemeToggle />
            <Link href="/auth" className={styles.link}>
              Sign In
            </Link>
            <Link href="/auth/signup" className={styles.link}>
              Sign Up
            </Link>
          </div>
        </nav>

        <motion.section className={styles.hero} {...sectionMotion}>
          <div className={styles.heroContent}>
            <span className={styles.heroTag}>Modern CRM</span>
            <h1>Run pipeline, customers, and messaging in one workspace.</h1>
            <p>Less tool sprawl. Faster execution. Clear visibility for every role.</p>
            <div className={styles.ctaRow}>
              <Link href="/auth" className={styles.btnPrimary}>
                Start Free
              </Link>
              <Link href="/auth" className={styles.btnGhost}>
                Explore Product
              </Link>
            </div>
          </div>
          <div className={styles.highlightPanel}>
            <Image
              src="/landing-hero-visual.svg"
              alt="CRM dashboard preview"
              width={520}
              height={230}
              className={styles.heroVisual}
              unoptimized
              priority
            />
            <h3>Live pulse</h3>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <div className={styles.value}>₦2.4B</div>
                <div className={styles.label}>Pipeline</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.value}>31.6%</div>
                <div className={styles.label}>Conversion</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.value}>180</div>
                <div className={styles.label}>Customers</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.value}>14</div>
                <div className={styles.label}>Workflows</div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section className={styles.filterBar} {...sectionMotion}>
          <div>Leads</div>
          <div>Lifecycle</div>
          <div>Forecast</div>
          <div>Automation</div>
        </motion.section>

        <motion.section className={`${styles.section} ${styles.sectionSoft}`} {...sectionMotion}>
          <div className={styles.trustRow}>
            <span>Teams shipping with Alchemy</span>
            <p>Northstar · Vintara · Greenline · Velocity · Arcadia</p>
          </div>
          <div className={styles.imageStrip}>
            <div className={styles.stripThumb}>
              <Image
                src="/landing-visual-teams.svg"
                alt="Team collaboration"
                width={800}
                height={420}
                unoptimized
              />
            </div>
            <div className={styles.stripThumb}>
              <Image
                src="/landing-visual-inbox.svg"
                alt="Unified inbox"
                width={800}
                height={420}
                unoptimized
              />
            </div>
            <div className={styles.stripThumb}>
              <Image
                src="/landing-visual-workflows.svg"
                alt="Workflow automation"
                width={800}
                height={420}
                unoptimized
              />
            </div>
          </div>
        </motion.section>

        <motion.section className={`${styles.section} ${styles.sectionNeutral}`} {...sectionMotion}>
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>Why teams switch</p>
            <h2>Built for revenue ops that move fast.</h2>
            <p className={styles.oneLiner}>Roles, pipelines, and reporting stay aligned without extra tools.</p>
          </div>
          <div className={styles.featureWithVisual}>
            <article className={styles.storyCard}>
              <h3>Workflow-first</h3>
              <p className={styles.oneLiner}>From first touch to renewal — owners and stages stay obvious.</p>
              <ul>
                <li>Clear ownership per stage</li>
                <li>Role-based access</li>
                <li>Live reporting</li>
              </ul>
            </article>
            <div className={styles.stripThumb}>
              <Image
                src="/landing-preview-pipeline.svg"
                alt="Pipeline view"
                width={520}
                height={280}
                unoptimized
              />
            </div>
          </div>
          <div className={styles.cards}>
            <article className={styles.cardPrimary}>
              <h3>Pipeline</h3>
              <p className={styles.oneLiner}>Forecast-ready stages and deal health.</p>
            </article>
            <article className={styles.cardSecondary}>
              <h3>Automation</h3>
              <p className={styles.oneLiner}>Triggers that cut manual follow-up.</p>
            </article>
            <article className={styles.cardPrimary}>
              <h3>Collaboration</h3>
              <p className={styles.oneLiner}>Tasks, notes, and inbox in one thread.</p>
            </article>
          </div>
        </motion.section>

        <motion.section className={`${styles.section} ${styles.sectionSoft}`} {...sectionMotion}>
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>Product</p>
            <h2>Everything in one platform.</h2>
          </div>
          <div className={styles.wideVisual}>
            <Image
              src="/landing-visual-analytics-wide.svg"
              alt="Analytics overview"
              width={1200}
              height={360}
              unoptimized
            />
          </div>
          <div className={styles.previewGrid}>
            <article className={styles.previewCard}>
              <Image
                src="/landing-preview-pipeline.svg"
                alt="Pipeline"
                width={520}
                height={280}
                className={styles.previewImage}
                unoptimized
              />
            </article>
            <article className={styles.previewCard}>
              <Image
                src="/landing-preview-analytics.svg"
                alt="Analytics"
                width={520}
                height={280}
                className={styles.previewImage}
                unoptimized
              />
            </article>
          </div>
          <div className={styles.moduleGrid}>
            {modules.map((module) => (
              <article key={module} className={`${styles.moduleCard} ${styles.moduleTitleOnly}`}>
                <h3>{module}</h3>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section className={`${styles.section} ${styles.sectionNeutral}`} {...sectionMotion}>
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>How it works</p>
            <h2>Three steps to go live.</h2>
          </div>
          <div className={styles.stepsGrid}>
            <article className={styles.stepCard}>
              <span>01</span>
              <h3>Configure</h3>
              <p className={styles.oneLiner}>Workspace, branding, and roles in minutes.</p>
            </article>
            <article className={styles.stepCard}>
              <span>02</span>
              <h3>Import</h3>
              <p className={styles.oneLiner}>Leads and deals land in a clean pipeline.</p>
            </article>
            <article className={styles.stepCard}>
              <span>03</span>
              <h3>Scale</h3>
              <p className={styles.oneLiner}>Automate follow-ups and share live reports.</p>
            </article>
          </div>
        </motion.section>

        <motion.section className={`${styles.section} ${styles.sectionSoft}`} {...sectionMotion}>
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>Security</p>
            <h2>Built for trust.</h2>
          </div>
          <p className={styles.securityBlurb}>
            Encryption in transit, audit-friendly activity, and access rules that match how your org is structured.
          </p>
          <div className={styles.wideVisual}>
            <Image
              src="/landing-visual-inbox.svg"
              alt="Secure operations"
              width={800}
              height={420}
              unoptimized
            />
          </div>
        </motion.section>

        <motion.section className={`${styles.section} ${styles.sectionNeutral}`} {...sectionMotion}>
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>Stories</p>
            <h2>Teams that outgrew spreadsheets.</h2>
          </div>
          <div className={styles.testimonialGrid}>
            {testimonials.map((item) => (
              <article key={item.name} className={styles.testimonialCard}>
                <p>&ldquo;{item.quote}&rdquo;</p>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.role}</span>
                </div>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section className={`${styles.section} ${styles.sectionSoft}`} {...sectionMotion}>
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>Pricing</p>
            <h2>Simple per-seat plans.</h2>
            <p className={styles.oneLiner}>
              All planned to suit your needs.
            </p>
          </div>
          {plansLoading ? (
            <PricingWireGrid count={3} />
          ) : plans.length === 0 ? (
            <p className={styles.oneLiner}>
              Published plans will appear here once created.
            </p>
          ) : (
            <div className={styles.pricingGrid}>
              {plans.map((p, idx) => {
                const featured = plans.length === 1 ? idx === 0 : idx === 1;
                const cardClass = featured ? styles.pricingCardFeatured : styles.pricingCard;
                return (
                  <article key={p.id} className={cardClass}>
                    <h3>{p.name}</h3>
                    <p className={styles.price}>
                      {p.isCustomQuote ? (
                        "Custom"
                      ) : (
                        <>
                          {new Intl.NumberFormat("en-NG", {
                            style: "currency",
                            currency: "NGN",
                            maximumFractionDigits: 0,
                          }).format(p.amountNgn ?? 0)}
                          <span>{p.priceSuffix}</span>
                        </>
                      )}
                    </p>
                    <ul>
                      {p.features.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <Link href={`/auth/signup?plan=${p.id}`} className={styles.pricingCta}>
                      Sign up with this plan →
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </motion.section>

        <motion.section className={`${styles.section} ${styles.sectionNeutral}`} {...sectionMotion}>
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>FAQ</p>
            <h2>Quick answers.</h2>
          </div>
          <div className={styles.faqList}>
            {faqs.map((item) => (
              <article className={styles.faqItem} key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </motion.section>

        <section className={styles.finalCta}>
          <h2>Ship a modern CRM this quarter.</h2>
          <p>Start fast, invite the team, keep everyone on one system.</p>
          <div className={styles.ctaRow}>
            <Link href="/auth" className={styles.btnPrimary}>
              Start Free Trial
            </Link>
            <Link href="/auth" className={styles.btnGhost}>
              Sign In
            </Link>
          </div>
        </section>

        <footer className={styles.footer}>
          <p>Alchemy</p>
          <div>
            <Link href="/auth">Sign In</Link>
          </div>
        </footer>
      </div>
    </main>
    </>
  );
}
