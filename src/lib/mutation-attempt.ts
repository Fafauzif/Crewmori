/** Keep an uncertain mutation's exact payload, including its reviewed version, until reconciled. */
export class MutationAttempt<T> {
  private value: T | undefined;
  get unresolved(): boolean { return this.value !== undefined; }
  begin(payload: T): T {
    if (this.value === undefined) this.value = structuredClone(payload);
    return structuredClone(this.value);
  }
  settle(result: { ok: boolean; outcomeUnknown?: boolean }): void {
    if (result.ok || !result.outcomeUnknown) this.clear();
  }
  clear(): void { this.value = undefined; }
}
