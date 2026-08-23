import * as cron from "node-cron";
import { logger } from "./logger";
import { Dispatcher } from "./dispatcher";
import type { DaemonConfig } from "./types";
import { HealthMonitor } from "./health";

type ScheduledTask = ReturnType<typeof cron.schedule>;

// ─── Scheduler ───────────────────────────────────────────────────────────────

export class Scheduler {
  private jobs: Map<string, ScheduledTask> = new Map();
  private pollJob: ScheduledTask | null = null;
  private config: DaemonConfig;
  private dispatcher: Dispatcher;
  private health: HealthMonitor;

  constructor(config: DaemonConfig, dispatcher: Dispatcher, health: HealthMonitor) {
    this.config = config;
    this.dispatcher = dispatcher;
    this.health = health;
  }

  /**
   * Start all configured schedules and the polling loop.
   */
  start(): void {
    logger.info("scheduler", "Starting scheduler...");

    // Start task polling
    if (this.config.polling.enabled) {
      const cronExpr = `*/${this.config.polling.intervalMinutes} * * * *`;
      logger.info("scheduler", `Task polling: every ${this.config.polling.intervalMinutes} minutes (${cronExpr})`);

      this.pollJob = cron.schedule(cronExpr, () => {
        this.dispatcher.pollAndDispatch();
      });

      // Calculate next poll time
      this.health.setNextScheduledRun("poll", this.getNextCronRun(cronExpr));
    }

    // Start scheduled commands
    for (const [name, schedule] of Object.entries(this.config.schedule)) {
      if (!schedule.enabled) {
        logger.debug("scheduler", `Schedule "${name}" is disabled, skipping`);
        continue;
      }

      if (!cron.validate(schedule.cron)) {
        logger.error("scheduler", `Invalid cron expression for "${name}": ${schedule.cron}`);
        continue;
      }

      logger.info("scheduler", `Schedule "${name}": ${schedule.cron} → /${schedule.command}`);

      const job = cron.schedule(schedule.cron, () => {
        logger.info("scheduler", `Triggered scheduled command: /${schedule.command} (schedule: ${name})`);
        this.dispatcher.runScheduledCommand(schedule.command);
      });

      this.jobs.set(name, job);

      // Calculate next run time
      this.health.setNextScheduledRun(schedule.command, this.getNextCronRun(schedule.cron));
    }

    const totalJobs = (this.pollJob ? 1 : 0) + this.jobs.size;
    logger.info("scheduler", `Scheduler started with ${totalJobs} active schedule(s)`);

    this.health.flush();
  }

  /**
   * Stop all scheduled jobs.
   */
  stop(): void {
    logger.info("scheduler", "Stopping scheduler...");

    if (this.pollJob) {
      this.pollJob.stop();
      this.pollJob = null;
    }

    for (const [name, job] of this.jobs) {
      job.stop();
      logger.debug("scheduler", `Stopped schedule: ${name}`);
    }
    this.jobs.clear();

    logger.info("scheduler", "Scheduler stopped");
  }

  /**
   * Reload schedules from updated config.
   */
  reload(newConfig: DaemonConfig): void {
    logger.info("scheduler", "Reloading scheduler with new config...");
    this.stop();
    this.config = newConfig;
    this.dispatcher.updateConfig(newConfig);
    this.start();
  }

  /**
   * Calculate approximate next run time for a cron expression.
   */
  private getNextCronRun(cronExpr: string): string {
    // Simple approximation — for display purposes
    // node-cron doesn't provide a nextRun method, so we estimate
    try {
      const now = new Date();
      // Parse the cron parts
      const parts = cronExpr.split(" ");
      if (parts.length !== 5) return "unknown";

      const [min, hour] = parts;

      // If it's a simple "every N minutes" pattern
      if (min.startsWith("*/")) {
        const interval = parseInt(min.slice(2));
        const nextMinute = Math.ceil(now.getMinutes() / interval) * interval;
        const next = new Date(now);
        next.setMinutes(nextMinute, 0, 0);
        if (next <= now) next.setMinutes(next.getMinutes() + interval);
        return next.toISOString();
      }

      // For specific times
      if (min !== "*" && hour !== "*") {
        const targetHour = parseInt(hour);
        const targetMin = parseInt(min);
        const next = new Date(now);
        next.setHours(targetHour, targetMin, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
        return next.toISOString();
      }

      return "scheduled";
    } catch {
      return "unknown";
    }
  }
}
