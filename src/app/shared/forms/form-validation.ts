import { AbstractControl, FormGroup, } from '@angular/forms';

export function controlInvalid(form: FormGroup, controlName: string): boolean {
	const control = form.get(controlName);
	
	return !!control && control.invalid && (control.touched || control.dirty);
}

export function controlErrorMessage(form: FormGroup, controlName: string, label: string): string | null {
	const control = form.get(controlName);
	
	if (!control || !control.invalid || !(control.touched || control.dirty)) {
		return null;
	}
	
	const errors = control.errors ?? {};
	
	if (errors['server']) {
		return String(errors['server']);
	}
	
	if (errors['required']) {
		return `${label} is required.`;
	}
	
	if (errors['maxlength']) {
		return (`${label} cannot exceed ` + `${errors['maxlength'].requiredLength} characters.`);
	}
	
	if (errors['minlength']) {
		return (`${label} must contain at least ` + `${errors['minlength'].requiredLength} characters.`
		);
	}
	
	if (errors['pattern']) {
		return `${label} has an unsupported format.`;
	}
	
	if (errors['email']) {
		return `Enter a valid ${label.toLowerCase()}.`;
	}
	
	if (errors['min']) {
		return (`${label} must be at least ` + `${errors['min'].min}.`);
	}
	
	if (errors['max']) {
		return (`${label} cannot exceed ` + `${errors['max'].max}.`);
	}
	
	if (errors['json']) {
		return String(errors['json']);
	}
	
	if (errors['dateOrder']) {
		return String(errors['dateOrder']);
	}
	
	return `${label} is invalid.`;
}

export function applyApiValidationErrors(form: FormGroup, err: any): boolean {
	if (err?.status !== 422 || !err?.error?.errors || typeof err.error.errors !== 'object') {
		return false;
	}
	
	let applied = false;
	
	for (const [backendField, messages,] of Object.entries(err.error.errors)) {
		const candidates = [
			backendField,
			backendField.split('.')[0],
			backendField.split('.').at(-1) ?? '',
		];
		
		const controlName = candidates.find(name => !!name && !!form.get(name));
		
		if (!controlName) {
			continue;
		}
		
		const message = Array.isArray(messages) ? String(messages[0] ?? 'Invalid value.') : String(messages);
		const control = form.get(controlName);
		
		control?.setErrors({
			...(control.errors ?? {}),
			server: message,
		});
		
		control?.markAsTouched();
		
		applied = true;
	}
	
	return applied;
}

export function extractApiFieldErrors(err: any): Record<string, string> {
	const result: Record<string, string> = {};
	
	const errors = err?.error?.errors;
	
	if (!errors || typeof errors !== 'object') {
		return result;
	}
	
	for (const [backendField,messages,] of Object.entries(errors)) {
		const field = backendField.split('.')[0];
		
		result[field] = Array.isArray(messages) ? String(messages[0] ?? 'Invalid value.') : String(messages);
	}
	
	return result;
}

export function enableServerErrorClearing(form: FormGroup): void {
	for (const control of Object.values(form.controls)) {
		control.valueChanges.subscribe(() => {
			const errors = control.errors;
			
			if (!errors || !errors['server']) {
				return;
			}
			
			const {
				server: _server,
				...remainingErrors
			} = errors;
			control.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null, { emitEvent: false, });
		}
		);
	}
}

export function focusFirstInvalidField(): void {
	setTimeout(() => {
		const element = window.document.querySelector<HTMLElement>('.is-invalid');
		
		if (!element) {
			return;
		}
		
		element.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
		});
		
		element.focus();
	});
}

export function removeControlError(control: AbstractControl | null, errorName: string): void {
	if (!control?.errors?.[errorName]) {
		return;
	}
	
	const {
		[errorName]: _removed,
		...remaining
	} = control.errors;
	
	control.setErrors(Object.keys(remaining).length ? remaining : null);
}