import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

type Step = {
  id: number;
  title: string;
  body: string;
  image: string;
  accent: string;
};

const steps: Step[] = [
  {
    id: 1,
    title: "Organize your mission lists",
    body: "Group tasks by Study, Work, Health and more with colorful list chips.",
    image: "/screenshots/01-lists.png",
    accent: "from-sky-400/40 to-indigo-500/30",
  },
  {
    id: 2,
    title: "Turn tasks into space trips",
    body: "Pick deep‑work tasks, choose a destination and launch a focus flight.",
    image: "/screenshots/02-task-selection.png",
    accent: "from-purple-500/40 to-pink-500/30",
  },
  {
    id: 3,
    title: "Block distracting apps",
    body: "Use Screen Time blocking so social apps stay out of the cockpit.",
    image: "/screenshots/03-blocking-apps.png",
    accent: "from-rose-500/40 to-amber-500/30",
  },
  {
    id: 4,
    title: "Set a daily focus reminder",
    body: "Choose the exact time you want a nudge to start your mission.",
    image: "/screenshots/04-reminder.png",
    accent: "from-emerald-400/40 to-teal-500/30",
  },
  {
    id: 5,
    title: "See streaks, distance & Focus Health",
    body: "Track deep work time, missions completed and how consistent you are.",
    image: "/screenshots/05-analytics.png",
    accent: "from-yellow-400/40 to-lime-400/30",
  },
];

/**
 * MarketingQuickTour
 *
 * Drop this into your Next.js homepage (e.g. app/page.tsx) to turn the site
 * into a quick, animated tour of the FocusRoom app.
 *
 * Example:
 *   export default function Page() {
 *     return <MarketingQuickTour />;
 *   }
 */
export function MarketingQuickTour() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#4f46e5_0,_transparent_55%),radial-gradient(circle_at_bottom,_#ec4899_0,_transparent_55%)] opacity-40" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-20 lg:flex-row lg:items-center">
          <div className="flex-1">
            <p className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-gray-300">
              FocusRoom · Space missions for your tasks
            </p>
            <h1 className="mb-4 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Turn focus into{" "}
              <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
                space missions
              </span>
              .
            </h1>
            <p className="mb-8 max-w-xl text-base text-gray-300 sm:text-lg">
              Choose your mission lists, launch a focus flight, block distracting
              apps and track how far your deep work takes you.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="https://apps.apple.com/app/focusroom-block-distractions/id6754952142"
                className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-[0_0_40px_rgba(129,140,248,0.35)] transition hover:bg-zinc-100"
              >
                Download on the App Store
              </a>
              <p className="text-xs text-gray-400">
                Built for students, creators & deep‑work junkies.
              </p>
            </div>
          </div>

          {/* Floating phone */}
          <motion.div
            className="relative flex-1"
            initial={{ opacity: 0, y: 40, rotate: 8 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <motion.div
              className="relative mx-auto h-[520px] w-[260px] overflow-hidden rounded-[40px] border border-white/10 bg-zinc-900 shadow-[0_0_70px_rgba(15,23,42,0.9)]"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src="/screenshots/hero-cockpit.png"
                alt="FocusRoom cockpit screenshot"
                fill
                className="object-cover"
                priority
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/60 to-transparent" />
            </motion.div>
            <motion.div
              className="pointer-events-none absolute -left-10 top-10 h-24 w-24 rounded-full bg-sky-500/20 blur-3xl"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="pointer-events-none absolute -right-6 bottom-6 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </section>

      {/* Quick tour / feature steps */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Take a quick tour of the cockpit
            </h2>
            <p className="mt-2 max-w-xl text-sm text-gray-400 sm:text-base">
              Follow the screenshots from lists → missions → blocking apps →
              reminders → advanced analytics.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_rgba(129,140,248,0.2)_0,_transparent_55%)]" />
          <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4">
            {steps.map((step, index) => (
              <motion.article
                key={step.id}
                className="min-w-[260px] max-w-xs flex-1 snap-center rounded-3xl border border-white/10 bg-zinc-900/60 p-4 backdrop-blur"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <div
                  className={`mb-3 h-1 w-12 rounded-full bg-gradient-to-r ${step.accent}`}
                />
                <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-gray-400">
                  Step {index + 1}
                </p>
                <h3 className="mb-2 text-base font-semibold">{step.title}</h3>
                <p className="mb-4 text-xs text-gray-300">{step.body}</p>
                <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    className="object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
              </motion.article>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-gray-500">
            Swipe sideways to explore all screenshots.
          </p>
        </div>
      </section>
    </main>
  );
}

export default MarketingQuickTour;

