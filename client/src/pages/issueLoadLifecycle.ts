import type { Issue } from '../types';

type IssueFetcher = (id: string | number, signal?: AbortSignal) => Promise<Issue>;

type IssueLoadOptions = {
  id: string;
  fetchIssue: IssueFetcher;
  onReset: () => void;
  onIssue: (issue: Issue) => void;
  onAssigneeDraft: (assignee: string) => void;
  onNotFound: () => void;
};

export function startIssueLoad({
  id,
  fetchIssue,
  onReset,
  onIssue,
  onAssigneeDraft,
  onNotFound,
}: IssueLoadOptions) {
  const controller = new AbortController();
  let active = true;

  onReset();
  fetchIssue(id, controller.signal).then(
    (data) => {
      if (!active) return;
      onIssue(data);
      onAssigneeDraft(data.assignee);
    },
    () => {
      if (!active || controller.signal.aborted) return;
      onNotFound();
    }
  );

  return () => {
    active = false;
    controller.abort();
  };
}
