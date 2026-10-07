import { CronCapability, HTTPClient, consensusIdenticalAggregation, handler, Runner, json, ok, type HTTPSendRequester, type Runtime } from "@chainlink/cre-sdk";

export type Config = {
  schedule: string;
  apiUrl: string;
};

export const parseDecision = (payload: unknown): number => {
  if (typeof payload !== "object" || payload === null || !("status" in payload)) {
    throw new Error("API must return an object with integer status 1 or 2");
  }
  const status = payload.status;
  if (status !== 1 && status !== 2) throw new Error("API status must be integer 1 or 2");
  return status;
};

export const fetchDecision = (requester: HTTPSendRequester, url: string): number => {
  const response = requester.sendRequest({ url, method: "GET" }).result();
  if (!ok(response)) throw new Error(`HTTP request failed: ${response.statusCode}`);
  return parseDecision(json(response));
};

export const onCronTrigger = (runtime: Runtime<Config>): number => {
  const decision = new HTTPClient()
    .sendRequest(runtime, fetchDecision, consensusIdenticalAggregation<number>())(runtime.config.apiUrl)
    .result();
  runtime.log(`Validated Oracle decision: ${decision}. Simulation only; no escrow vote or transaction submitted.`);
  return decision;
};

export const initWorkflow = (config: Config) => {
  if (!config.apiUrl.startsWith("https://")) throw new Error("API URL must use HTTPS");
  const cron = new CronCapability();

  return [
    handler(
      cron.trigger(
        { schedule: config.schedule }
      ),
      onCronTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
