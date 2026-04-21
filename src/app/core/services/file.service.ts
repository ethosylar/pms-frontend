import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface StoredFile {
	id: number;
	original_name: string;
	mime: string;
	size_bytes: number;
	created_at: string;
}

@Injectable({ providedIn: 'root' })
export class FileService {
	private base = environment.apiBaseUrl;
	
	constructor(private http: HttpClient) {}
	
	// ---------- Project ----------
	listProjectFiles(projectId: number) {
		return this.http.get<{ data: StoredFile[] }>(`${this.base}/projects/${projectId}/files`);
	}
	
	uploadProjectFile(projectId: number, file: File) {
		const form = new FormData();
		form.append('file', file);
		return this.http.post(`${this.base}/projects/${projectId}/files`, form);
	}
	
	detachProjectFile(projectId: number, fileId: number) {
		return this.http.delete(`${this.base}/projects/${projectId}/files/${fileId}`);
	}
	
	projectDownloadUrl(projectId: number, fileId: number) {
		return `${this.base}/projects/${projectId}/files/${fileId}/download`;
	}
	
	// ---------- Task ----------
	listTaskFiles(taskId: number) {
		return this.http.get<{ data: StoredFile[] }>(`${this.base}/tasks/${taskId}/files`);
	}
	
	uploadTaskFile(taskId: number, file: File) {
		const form = new FormData();
		form.append('file', file);
		return this.http.post(`${this.base}/tasks/${taskId}/files`, form);
	}
	
	detachTaskFile(taskId: number, fileId: number) {
		return this.http.delete(`${this.base}/tasks/${taskId}/files/${fileId}`);
	}
	
	taskDownloadUrl(taskId: number, fileId: number) {
		return `${this.base}/tasks/${taskId}/files/${fileId}/download`;
	}
}