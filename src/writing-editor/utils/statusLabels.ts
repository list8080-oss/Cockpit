import type { Status } from "../types";
import type { WeMessageKey } from "../i18n";

const STATUS_LABEL_KEYS: Record<Status, WeMessageKey> = {
  draft: "statusDraft",
  "in-revision": "statusInRevision",
  revised: "statusRevised",
  final: "statusFinal",
  stuck: "statusStuck",
  cut: "statusCut",
};

export function statusLabelKey(status: Status): WeMessageKey {
  return STATUS_LABEL_KEYS[status] ?? "statusDraft";
}
