/**
 * A navigation object for progressing through steps in an operation.
 *
 * The next step is called when the current step is completed
 * using the `next()` method.
 *
 * Steps can only go forward, not backward. If attempting to go beyond
 * the last step, an error is thrown.
 */
export class StepNav<TStep extends string> {
	private _index: number = 0;

	private constructor(
		public readonly steps: readonly TStep[]
	) {}

	static fromSteps<TStep extends string>(
		...steps: readonly TStep[]
	) {
		return new StepNav(steps);
	}

	get index(): number {
		return this._index;
	}

	get step(): TStep {
		if (this.isComplete)
			throw new Error(
				"StepNav.step: nav state is complete, step is undefined"
			);
		return this.steps[this._index];
	}

	get isComplete(): boolean {
		return this._index === this.steps.length;
	}

	get isNotComplete(): boolean {
		return this._index < this.steps.length;
	}

	next(): void {
		if (this.isComplete)
			throw new Error(
				"StepNav.next(): nav state is already complete"
			);
		this._index++;
	}

	copyNew(): StepNav<TStep> {
		return new StepNav(this.steps);
	}
}
