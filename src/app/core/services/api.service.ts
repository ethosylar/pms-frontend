import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DashboardOverviewResponse } from '../../features/dashboard/dashboard/dashboard.models';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
	constructor(private http: HttpClient) {}
	
	health() {
		return this.http.get(`${environment.apiBaseUrl}/health`);
	}
	
	me() {
		return this.http.get(`${environment.apiBaseUrl}/me`);
	}
	
	// ******************************************************************************************************************************
	// Dashboard Overview
	// ******************************************************************************************************************************
	
	dashboardOverview() {
		return this.http.get<DashboardOverviewResponse>(
			`${environment.apiBaseUrl}/dashboard/overview`
		);
	}
	
	// ******************************************************************************************************************************
	// User's Section
	// ******************************************************************************************************************************
	
	getUsers(params?: { search?: string; page?: number; per_page?: number }) {
		let httpParams = new HttpParams();
		if (params?.search) httpParams = httpParams.set('search', params.search);
		if (params?.page) httpParams = httpParams.set('page', params.page);
		if (params?.per_page) httpParams = httpParams.set('per_page', params.per_page);
		return this.http.get<ApiCollection<UserDto>>(`${environment.apiBaseUrl}/users`, { params: httpParams });
	}
	
	getUser(id: number) {
		return this.http.get<ApiResource<UserDto>>(`${environment.apiBaseUrl}/users/${id}`);
	}
	
	createUser(payload: { name: string; username: string; email: string; password: string; role_ids: number[]; department_id?: number | null; }) {
		return this.http.post<ApiResource<UserDto>>(`${environment.apiBaseUrl}/users`, payload);
	}
	
	updateUser(id: number, payload: { name?: string; email?: string; password?: string; department_id?: number | null; }) {
		return this.http.put<{ ok: true; message?: string }>(`${environment.apiBaseUrl}/users/${id}`, payload);
	}
	
	deleteUser(id: number) {
		return this.http.delete<{ ok: true }>(`${environment.apiBaseUrl}/users/${id}`);
	}
	
	syncUserRoles(userId: number, roleIds: number[]) {
		return this.http.put(`${environment.apiBaseUrl}/users/${userId}/roles`, {
			role_ids: roleIds
		});
	}
	
	// ******************************************************************************************************************************
	// Roles's Section
	// ******************************************************************************************************************************
	
	
	getRoles(params?: { search?: string; is_active?: number; page?: number; per_page?: number }) {
		let httpParams = new HttpParams();
		if (params?.search) httpParams = httpParams.set('search', params.search);
		if (params?.is_active !== undefined) httpParams = httpParams.set('is_active', String(params.is_active));
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<RoleDto>>(`${environment.apiBaseUrl}/roles`, { params: httpParams });
	}
	
	getRole(id: number) {
		return this.http.get<ApiResource<RoleDto>>(`${environment.apiBaseUrl}/roles/${id}`);
	}
	
	createRole(payload: { code: string; name: string; is_active?: boolean }) {
		return this.http.post<ApiResource<RoleDto>>(`${environment.apiBaseUrl}/roles`, payload);
	}
	
	updateRole(id: number, payload: { code?: string; name?: string; is_active?: boolean }) {
		return this.http.put<ApiResource<RoleDto>>(`${environment.apiBaseUrl}/roles/${id}`, payload);
	}
	
	deleteRole(id: number) {
		return this.http.delete<{ ok: boolean; mode: 'SOFT' | 'HARD' }>(`${environment.apiBaseUrl}/roles/${id}`);
	}	
	
	// ******************************************************************************************************************************
	// Department's Section
	// ******************************************************************************************************************************
	
	getDepartments(params?: { search?: string; page?: number; per_page?: number }) {
		let httpParams = new HttpParams();
		if (params?.search) httpParams = httpParams.set('search', params.search);
		if (params?.page) httpParams = httpParams.set('page', params.page);
		if (params?.per_page) httpParams = httpParams.set('per_page', params.per_page);
		
		return this.http.get<ApiCollection<DepartmentDto>>(
			`${environment.apiBaseUrl}/departments`,
			{ params: httpParams }
		);
	}
	
	getDepartment(id: number) {
		return this.http.get<ApiResource<DepartmentDto>>(`${environment.apiBaseUrl}/departments/${id}`);
	}
	
	createDepartment(payload: { code: string; name: string }) {
		return this.http.post<ApiResource<DepartmentDto>>(`${environment.apiBaseUrl}/departments`, payload);
	}
	
	updateDepartment(id: number, payload: { code?: string; name?: string }) {
		return this.http.put<{ ok: true; message?: string }>(`${environment.apiBaseUrl}/departments/${id}`, payload);
	}
	
	deleteDepartment(id: number) {
		return this.http.delete<{ ok: true }>(`${environment.apiBaseUrl}/departments/${id}`);
	}
	
	// ******************************************************************************************************************************
	// Audit Log's Section
	// ******************************************************************************************************************************
	
	getAuditLogs(params?: { search?: string;entity_type?: string;entity_id?: number;action?: string;user_id?: number;from?: string;	to?: string;page?: number;per_page?: number;}): Observable<AuditLogListResponse> {
		let httpParams = new HttpParams();
		
		if (params?.search) httpParams = httpParams.set('search', params.search);
		if (params?.entity_type) httpParams = httpParams.set('entity_type', params.entity_type);
		if (params?.entity_id != null) httpParams = httpParams.set('entity_id', String(params.entity_id));
		if (params?.action) httpParams = httpParams.set('action', params.action);
		if (params?.user_id != null) httpParams = httpParams.set('user_id', String(params.user_id));
		if (params?.from) httpParams = httpParams.set('from', params.from);
		if (params?.to) httpParams = httpParams.set('to', params.to);
		
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<AuditLogListResponse>(`${environment.apiBaseUrl}/audit-logs`, { params: httpParams });
	}
	
	getAuditLog(id: number): Observable<AuditLogShowResponse> {
		return this.http.get<AuditLogShowResponse>(`${environment.apiBaseUrl}/audit-logs/${id}`);
	}
	
	// ******************************************************************************************************************************
	// Priorities's Section
	// ******************************************************************************************************************************
	
	getPriorities(params?: { search?: string; is_active?: number; page?: number; per_page?: number }) {
		let httpParams = new HttpParams();
		if (params?.search) httpParams = httpParams.set('search', params.search);
		if (params?.is_active !== undefined) httpParams = httpParams.set('is_active', String(params.is_active));
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<PriorityDto>>(
			`${environment.apiBaseUrl}/priorities`,
			{ params: httpParams }
		);
	}
	
	getPriority(id: number) {
		return this.http.get<ApiResource<PriorityDto>>(`${environment.apiBaseUrl}/priorities/${id}`);
	}
	
	createPriority(payload: { code: string; name: string; sort_order?: number; is_active?: boolean }) {
		return this.http.post<ApiResource<PriorityDto>>(`${environment.apiBaseUrl}/priorities`, payload);
	}
	
	updatePriority(id: number, payload: { code?: string; name?: string; sort_order?: number; is_active?: boolean }) {
		return this.http.put<ApiResource<PriorityDto>>(`${environment.apiBaseUrl}/priorities/${id}`, payload);
	}
	
	deletePriority(id: number) {
		return this.http.delete<{ ok: boolean; mode: 'SOFT' | 'HARD' }>(`${environment.apiBaseUrl}/priorities/${id}`);
	}
	
	// ******************************************************************************************************************************
	// Risk Issue Type's Section
	// ******************************************************************************************************************************
	
	getRiskIssueTypes(params?: { search?: string; is_active?: number; page?: number; per_page?: number }) {
		let httpParams = new HttpParams();
		if (params?.search) httpParams = httpParams.set('search', params.search);
		if (params?.is_active !== undefined) httpParams = httpParams.set('is_active', String(params.is_active));
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<RiskIssueTypeDto>>(
			`${environment.apiBaseUrl}/risk-issue-types`,
			{ params: httpParams }
		);
	}
	
	getRiskIssueType(id: number) {
		return this.http.get<ApiResource<RiskIssueTypeDto>>(
			`${environment.apiBaseUrl}/risk-issue-types/${id}`
		);
	}
	
	createRiskIssueType(payload: { code: string; name: string; is_active?: boolean }) {
		return this.http.post<ApiResource<RiskIssueTypeDto>>(
			`${environment.apiBaseUrl}/risk-issue-types`,
			payload
		);
	}
	
	updateRiskIssueType(id: number, payload: { code?: string; name?: string; is_active?: boolean }) {
		return this.http.put<ApiResource<RiskIssueTypeDto>>(
			`${environment.apiBaseUrl}/risk-issue-types/${id}`,
			payload
		);
	}
	
	deleteRiskIssueType(id: number) {
		// backend returns { ok: true, mode: 'SOFT' }
		return this.http.delete<{ ok: boolean; mode: 'SOFT' }>(
			`${environment.apiBaseUrl}/risk-issue-types/${id}`
		);
	}
	
	// ******************************************************************************************************************************
	// External Sources's Section
	// ******************************************************************************************************************************
	
	getExternalSources(params?: { search?: string; is_active?: number; page?: number; per_page?: number }) {
		let httpParams = new HttpParams();
		if (params?.search) httpParams = httpParams.set('search', params.search);
		if (params?.is_active !== undefined) httpParams = httpParams.set('is_active', String(params.is_active));
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<ExternalSourceDto>>(
			`${environment.apiBaseUrl}/external-sources`,
			{ params: httpParams }
		);
	}
	
	getExternalSource(id: number) {
		return this.http.get<ApiResource<ExternalSourceDto>>(
			`${environment.apiBaseUrl}/external-sources/${id}`
		);
	}
	
	createExternalSource(payload: { code: string; name: string; base_url?: string | null; is_active?: boolean }) {
		return this.http.post<ApiResource<ExternalSourceDto>>(
			`${environment.apiBaseUrl}/external-sources`,
			payload
		);
	}
	
	updateExternalSource(id: number, payload: { code?: string; name?: string; base_url?: string | null; is_active?: boolean }) {
		return this.http.put<ApiResource<ExternalSourceDto>>(
			`${environment.apiBaseUrl}/external-sources/${id}`,
			payload
		);
	}
	
	deleteExternalSource(id: number) {
		return this.http.delete<{ ok: boolean; mode: 'SOFT' }>(
			`${environment.apiBaseUrl}/external-sources/${id}`
		);
	}
	
	// ******************************************************************************************************************************
	// Project Statuses's Section
	// ******************************************************************************************************************************
	
	getProjectStatuses(params?: { search?: string; is_active?: number; page?: number; per_page?: number }) {
		let httpParams = new HttpParams();
		if (params?.search) httpParams = httpParams.set('search', params.search);
		if (params?.is_active !== undefined) httpParams = httpParams.set('is_active', String(params.is_active));
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<ProjectStatusDto>>(
			`${environment.apiBaseUrl}/project-statuses`,
			{ params: httpParams }
		);
	}
	
	getProjectStatus(id: number) {
		return this.http.get<ApiResource<ProjectStatusDto>>(
			`${environment.apiBaseUrl}/project-statuses/${id}`
		);
	}
	
	/**
		* NOTE: backend returns { id: number } (not ApiResource)
	*/
	createProjectStatus(payload: { code: string; name: string; sort_order?: number; is_active?: boolean }) {
		return this.http.post<{ id: number }>(
			`${environment.apiBaseUrl}/project-statuses`,
			payload
		);
	}
	
	updateProjectStatus(id: number, payload: { code?: string; name?: string; sort_order?: number; is_active?: boolean }) {
		return this.http.put<{ ok: true; message?: string }>(
			`${environment.apiBaseUrl}/project-statuses/${id}`,
			payload
		);
	}
	
	deleteProjectStatus(id: number) {
		return this.http.delete<{ ok: true; mode: 'SOFT' | 'HARD' }>(
			`${environment.apiBaseUrl}/project-statuses/${id}`
		);
	}
	
	// ******************************************************************************************************************************
	// Risk Issue Statuses's Section
	// ******************************************************************************************************************************
	
	getRiskIssueStatuses(params?: { search?: string; is_active?: number; page?: number; per_page?: number }) {
		let httpParams = new HttpParams();
		if (params?.search) httpParams = httpParams.set('search', params.search);
		if (params?.is_active !== undefined) httpParams = httpParams.set('is_active', String(params.is_active));
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<RiskIssueStatusDto>>(
			`${environment.apiBaseUrl}/risk-statuses`,
			{ params: httpParams }
		);
	}
	
	getRiskIssueStatus(id: number) {
		return this.http.get<ApiResource<RiskIssueStatusDto>>(
			`${environment.apiBaseUrl}/risk-statuses/${id}`
		);
	}
	
	createRiskIssueStatus(payload: { code: string; name: string; sort_order?: number; is_active?: boolean }) {
		return this.http.post<ApiResource<RiskIssueStatusDto>>(
			`${environment.apiBaseUrl}/risk-statuses`,
			payload
		);
	}
	
	updateRiskIssueStatus(id: number, payload: { code?: string; name?: string; sort_order?: number; is_active?: boolean }) {
		return this.http.put<ApiResource<RiskIssueStatusDto>>(
			`${environment.apiBaseUrl}/risk-statuses/${id}`,
			payload
		);
	}
	
	deleteRiskIssueStatus(id: number) {
		return this.http.delete<{ ok: boolean; mode: 'SOFT' | 'HARD' }>(
			`${environment.apiBaseUrl}/risk-statuses/${id}`
		);
	}
	
	// ******************************************************************************************************************************
	// Severities's Section
	// ******************************************************************************************************************************
	
	getSeverities(params?: { search?: string; is_active?: number; page?: number; per_page?: number }) {
		let httpParams = new HttpParams();
		
		if (params?.search) httpParams = httpParams.set('search', params.search);
		if (params?.is_active !== undefined) httpParams = httpParams.set('is_active', String(params.is_active));
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<SeverityDto>>(
			`${environment.apiBaseUrl}/severities`,
			{ params: httpParams }
		);
	}
	
	getSeverity(id: number) {
		return this.http.get<ApiResource<SeverityDto>>(
			`${environment.apiBaseUrl}/severities/${id}`
		);
	}
	
	createSeverity(payload: { code: string; name: string; sort_order?: number; is_active?: boolean }) {
		return this.http.post<ApiResource<SeverityDto>>(
			`${environment.apiBaseUrl}/severities`,
			payload
		);
	}
	
	updateSeverity(id: number, payload: { code?: string; name?: string; sort_order?: number; is_active?: boolean }) {
		return this.http.put<ApiResource<SeverityDto>>(
			`${environment.apiBaseUrl}/severities/${id}`,
			payload
		);
	}
	
	deleteSeverity(id: number) {
		return this.http.delete<{ ok: boolean; mode: 'SOFT' | 'HARD' }>(
			`${environment.apiBaseUrl}/severities/${id}`
		);
	}
	
	// ******************************************************************************************************************************
	// Task Statuses's Section
	// ******************************************************************************************************************************
	
	getTaskStatuses(params?: { search?: string; is_active?: number; page?: number; per_page?: number }) {
		let httpParams = new HttpParams();
		
		if (params?.search) httpParams = httpParams.set('search', params.search);
		if (params?.is_active !== undefined) httpParams = httpParams.set('is_active', String(params.is_active));
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<TaskStatusDto>>(
			`${environment.apiBaseUrl}/task-statuses`,
			{ params: httpParams }
		);
	}
	
	getTaskStatus(id: number) {
		return this.http.get<ApiResource<TaskStatusDto>>(
			`${environment.apiBaseUrl}/task-statuses/${id}`
		);
	}
	
	createTaskStatus(payload: { code: string; name: string; sort_order?: number; is_active?: boolean }) {
		return this.http.post<ApiResource<TaskStatusDto>>(
			`${environment.apiBaseUrl}/task-statuses`,
			payload
		);
	}
	
	updateTaskStatus(id: number, payload: { code?: string; name?: string; sort_order?: number; is_active?: boolean }) {
		return this.http.put<ApiResource<TaskStatusDto>>(
			`${environment.apiBaseUrl}/task-statuses/${id}`,
			payload
		);
	}
	
	deleteTaskStatus(id: number) {
		return this.http.delete<{ ok: boolean; mode: 'SOFT' | 'HARD' }>(
			`${environment.apiBaseUrl}/task-statuses/${id}`
		);
	}
	
	// ******************************************************************************************************************************
	// External Risk Issues's Section
	// ******************************************************************************************************************************
	
	getExternalRiskIssues(params: ExternalRiskIssueListParams = {}) {
		let httpParams = new HttpParams();
		
		if (params.search) httpParams = httpParams.set('search', params.search);
		
		const intKeys = [
			'project_id',
			'external_source_id',
			'type_id',
			'severity_id',
			'risk_issue_status_id',
		] as const satisfies ReadonlyArray<keyof ExternalRiskIssueListParams>;
		
		for (const k of intKeys) {
			const v = params[k];
			if (v != null) httpParams = httpParams.set(String(k), String(v));
		}
		
		if (params.source_updated_from) httpParams = httpParams.set('source_updated_from', params.source_updated_from);
		if (params.source_updated_to) httpParams = httpParams.set('source_updated_to', params.source_updated_to);
		
		if (params.page) httpParams = httpParams.set('page', String(params.page));
		if (params.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<ExternalRiskIssueDto>>(
			`${environment.apiBaseUrl}/external-risk-issues`,
			{ params: httpParams }
		);
	}
	
	
	// include_payload=1 supported by resource
	getExternalRiskIssue(id: number, includePayload = false) {
		let httpParams = new HttpParams();
		if (includePayload) httpParams = httpParams.set('include_payload', '1');
		
		return this.http.get<ApiResource<ExternalRiskIssueDto>>(
			`${environment.apiBaseUrl}/external-risk-issues/${id}`,
			{ params: httpParams }
		);
	}
	
	createExternalRiskIssue(payload: ExternalRiskIssueUpsertPayload) {
		return this.http.post<ApiResource<ExternalRiskIssueDto>>(
			`${environment.apiBaseUrl}/external-risk-issues`,
			payload
		);
	}
	
	updateExternalRiskIssue(id: number, payload: ExternalRiskIssueUpsertPayload) {
		return this.http.put<ApiResource<ExternalRiskIssueDto>>(
			`${environment.apiBaseUrl}/external-risk-issues/${id}`,
			payload
		);
	}
	
	deleteExternalRiskIssue(id: number) {
		return this.http.delete<{ ok: boolean; mode: 'HARD' }>(
			`${environment.apiBaseUrl}/external-risk-issues/${id}`
		);
	}
	
	// ******************************************************************************************************************************
	// Project's Section
	// ******************************************************************************************************************************
	
	getProjects(params?: {
		search?: string;
		department_id?: number;
		status_id?: number;     // NOTE: backend expects status_id
		priority_id?: number;
		delayed?: boolean;
		page?: number;
		per_page?: number;
	}) {
	let httpParams = new HttpParams();
	if (params?.search) httpParams = httpParams.set('search', params.search);
	if (params?.department_id != null) httpParams = httpParams.set('department_id', String(params.department_id));
	if (params?.status_id != null) httpParams = httpParams.set('status_id', String(params.status_id));
	if (params?.priority_id != null) httpParams = httpParams.set('priority_id', String(params.priority_id));
	if (params?.delayed) httpParams = httpParams.set('delayed', '1');
	if (params?.page) httpParams = httpParams.set('page', String(params.page));
	if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
	
	return this.http.get<ApiCollection<ProjectDto>>(`${environment.apiBaseUrl}/projects`, { params: httpParams });
	}
	
	getProject(id: number) {
		return this.http.get<ApiResource<ProjectDto>>(`${environment.apiBaseUrl}/projects/${id}`);
	}
	
	/** backend returns { id } */
	createProject(payload: ProjectUpsertPayload) {
		return this.http.post<{ id: number }>(`${environment.apiBaseUrl}/projects`, payload);
	}
	
	/** backend returns { ok:true } */
	updateProject(id: number, payload: ProjectUpsertPayload) {
		return this.http.put<{ ok: true; message?: string }>(`${environment.apiBaseUrl}/projects/${id}`, payload);
	}
	
	deleteProject(id: number) {
		return this.http.delete<{ ok: true; mode: 'HARD' }>(`${environment.apiBaseUrl}/projects/${id}`);
	}
	
	// ******************************************************************************************************************************
	// Project Milestone's Section
	// ******************************************************************************************************************************
	
	getProjectMilestones(projectId: number, params?: { page?: number; per_page?: number }) {
		let httpParams = new HttpParams();
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<ProjectMilestoneDto>>(
			`${environment.apiBaseUrl}/projects/${projectId}/milestones`,
			{ params: httpParams }
		);
	}
	
	getProjectMilestone(projectId: number, milestoneId: number) {
		return this.http.get<ApiResource<ProjectMilestoneDto>>(
			`${environment.apiBaseUrl}/projects/${projectId}/milestones/${milestoneId}`
		);
	}
	
	createProjectMilestone(projectId: number, payload: ProjectMilestoneUpsertPayload) {
		return this.http.post<ApiResource<ProjectMilestoneDto>>(
			`${environment.apiBaseUrl}/projects/${projectId}/milestones`,
			payload
		);
	}
	
	updateProjectMilestone(projectId: number, milestoneId: number, payload: ProjectMilestoneUpsertPayload) {
		return this.http.put<ApiResource<ProjectMilestoneDto>>(
			`${environment.apiBaseUrl}/projects/${projectId}/milestones/${milestoneId}`,
			payload
		);
	}
	
	deleteProjectMilestone(projectId: number, milestoneId: number) {
		return this.http.delete<{ ok: true; mode: 'HARD' }>(
			`${environment.apiBaseUrl}/projects/${projectId}/milestones/${milestoneId}`
		);
	}
	
	// ******************************************************************************************************************************
	// Project Task's Section
	// ******************************************************************************************************************************
	
	getProjectGantt(projectId: number) {
		return this.http.get<{ project_id: number; tasks: ProjectTaskGanttDto[] }>(
			`${environment.apiBaseUrl}/projects/${projectId}/gantt`
		);
	}
	
	
	/** backend returns { id } */
	createProjectTask(projectId: number, payload: ProjectTaskUpsertPayload) {
		return this.http.post<{ id: number }>(
			`${environment.apiBaseUrl}/projects/${projectId}/tasks`,
			payload
		);
	}
	
	/** backend returns { ok:true } */
	updateProjectTask(taskId: number, payload: ProjectTaskUpsertPayload) {
		return this.http.put<{ ok: true; message?: string }>(
			`${environment.apiBaseUrl}/tasks/${taskId}`,
			payload
		);
	}
	
	deleteProjectTask(taskId: number) {
		return this.http.delete<{ ok: true; mode: 'HARD' }>(
			`${environment.apiBaseUrl}/tasks/${taskId}`
		);
	}
	
	// ******************************************************************************************************************************
	// Project File's Section
	// ******************************************************************************************************************************
	
	getProjectFiles(projectId: number, params?: { page?: number; per_page?: number }) {
		let httpParams = new HttpParams();
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<StoredFileDto>>(
			`${environment.apiBaseUrl}/projects/${projectId}/files`,
			{ params: httpParams }
		);
	}
	
	uploadProjectFile(projectId: number, file: File) {
		const fd = new FormData();
		fd.append('file', file); // must match backend request field name
		return this.http.post(`/api/projects/${projectId}/files`, fd);
	}
	
	attachExistingProjectFile(projectId: number, payload: AttachExistingFilePayload) {
		return this.http.post<FileAttachResponse>(
			`${environment.apiBaseUrl}/projects/${projectId}/files/attach`,
			payload
		);
	}
	
	detachProjectFile(projectId: number, fileId: number) {
		return this.http.delete<FileDetachResponse>(
			`${environment.apiBaseUrl}/projects/${projectId}/files/${fileId}`
		);
	}
	
	downloadProjectFile(projectId: number, fileId: number) {
		return this.http.get(
			`${environment.apiBaseUrl}/projects/${projectId}/files/${fileId}/download`,
			{ responseType: 'blob' }
		);
	}
	
	// ******************************************************************************************************************************
	// Task File's Section
	// ******************************************************************************************************************************
	
	getTaskFiles(taskId: number, params?: { page?: number; per_page?: number }) {
		let httpParams = new HttpParams();
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<StoredFileDto>>(
			`${environment.apiBaseUrl}/tasks/${taskId}/files`,
			{ params: httpParams }
		);
	}
	
	uploadTaskFile(taskId: number, file: File) {
		const formData = new FormData();
		formData.append('file', file);
		
		return this.http.post<StoredFileDto>(
			`${environment.apiBaseUrl}/tasks/${taskId}/files`,
			formData
		);
	}
	
	attachExistingTaskFile(taskId: number, payload: AttachExistingFilePayload) {
		return this.http.post<FileAttachResponse>(
			`${environment.apiBaseUrl}/tasks/${taskId}/files/attach`,
			payload
		);
	}
	
	detachTaskFile(taskId: number, fileId: number) {
		return this.http.delete<FileDetachResponse>(
			`${environment.apiBaseUrl}/tasks/${taskId}/files/${fileId}`
		);
	}
	
	downloadTaskFile(taskId: number, fileId: number) {
		return this.http.get(
			`${environment.apiBaseUrl}/tasks/${taskId}/files/${fileId}/download`,
			{ responseType: 'blob' }
		);
	}
	
}

export interface LaravelPaginated<T> {
	data: T[];
	meta?: {
		current_page?: number;
		last_page?: number;
		per_page?: number;
		total?: number;
	};
	links?: any;
}

export interface UserRow {
	id: number;
	name: string;
	username: string;
	email: string;
	department?: { id: number; code?: string; name?: string } | null;
	roles?: Array<{ name: string } | string>;
	created_at?: string;
}

export interface ApiResource<T> {
	data: T;
}

export interface ApiCollection<T> {
	data: T[];
	meta?: {
		current_page?: number;
		last_page?: number;
		per_page?: number;
		total?: number;
	};
	links?: any;
}

export interface RoleDto {
	id: number;
	code: string;
	name: string;
	is_active: boolean;     // backend may return 0/1, but we’ll treat as boolean
	created_at?: string;
	updated_at?: string;
}

export interface UserDto {
	id: number;
	name: string;
	username: string;
	email: string;
	roles?: RoleDto[];
	created_at?: string;
	updated_at?: string;
	department_id?: number | null;
	department?: DepartmentDto | null;
}

export interface DepartmentDto {
	id: number;
	code: string;
	name: string;
	created_at?: string;
	updated_at?: string;
}

// ---- Audit Logs ----
export interface AuditLogUserMini {
	id: number;
	name: string;
	email?: string | null;
}

export interface AuditLogDto {
	id: number;
	entity_type: string;
	entity_id: number | null;
	action: string;
	source?: string | null;
	performed_at: string;
	
	performed_by_user_id?: number | null;
	user?: AuditLogUserMini | null;
	
	// resource may include any extra payload fields
	changes?: unknown;
	payload?: unknown;
	
	[key: string]: unknown;
}

export interface AuditLogListResponse {
	ok: boolean;
	data: AuditLogDto[] | { data: AuditLogDto[] }; // backend might wrap
	meta: {
		current_page: number;
		per_page: number;
		total: number;
		last_page: number;
	};
}

export interface AuditLogShowResponse {
	ok: boolean;
	data: AuditLogDto | { data: AuditLogDto };
}

export interface PriorityDto {
	id: number;
	code: string;
	name: string;
	sort_order: number;
	is_active: boolean; // backend might send 0/1, we handle it in UI
	created_at?: string;
	updated_at?: string;
}

export interface RiskIssueTypeDto {
	id: number;
	code: string;
	name: string;
	is_active: boolean; // backend may send 0/1, we normalize in UI
	created_at?: string;
	updated_at?: string;
}

export interface ExternalSourceDto {
	id: number;
	code: string;
	name: string;
	base_url: string | null; // allow null just in case
	is_active: boolean;      // backend may send 0/1
	created_at?: string;
	updated_at?: string;
}

export interface ProjectStatusDto {
	id: number;
	code: string;
	name: string;
	sort_order: number;
	is_active: boolean; // backend may send 0/1 or true/false
	created_at?: string;
	updated_at?: string;
}

export interface RiskIssueStatusDto {
	id: number;
	code: string;
	name: string;
	sort_order: number;
	is_active: boolean; // backend may send 0/1
	created_at?: string;
	updated_at?: string;
}

export interface SeverityDto {
	id: number;
	code: string;
	name: string;
	sort_order: number;
	is_active: boolean; // backend may send 0/1 or true/false
	created_at?: string;
	updated_at?: string;
}

export interface TaskStatusDto {
	id: number;
	code: string;
	name: string;
	sort_order: number;
	is_active: boolean; // backend may send 0/1 or true/false
	created_at?: string;
	updated_at?: string;
}

export interface LookupMiniDto {
	id: number;
	code: string;
	name: string;
}

export interface ExternalRiskIssueDto {
	id: number;
	
	external_source_id?: number | null;
	external_id: string;
	
	project_id?: number | null;
	type_id: number;
	severity_id: number;
	risk_issue_status_id: number;
	
	title: string;
	owner?: string | null;
	
	source_created_at?: string | null;
	source_updated_at?: string | null;
	last_synced_at?: string | null;
	
	raw_payload?: unknown; // if include_payload=1, resource might return decoded object/string
	created_at?: string;
	updated_at?: string;
	
	// lookups (from controller withLookups)
	externalSource?: LookupMiniDto | null;
	project?: LookupMiniDto | null;
	type?: LookupMiniDto | null;
	severity?: LookupMiniDto | null;
	status?: LookupMiniDto | null;
}

export type ExternalRiskIssueUpsertPayload = {
	external_source_id?: number | null;
	external_id?: string;
	
	project_id?: number | null;
	type_id?: number | null;
	severity_id?: number | null;
	risk_issue_status_id?: number | null;
	
	title?: string;
	owner?: string | null;
	
	source_created_at?: string | null;
	source_updated_at?: string | null;
	last_synced_at?: string | null;
	
	// backend accepts JSON string OR object/array OR null
	raw_payload?: string | Record<string, unknown> | unknown[] | null;
};

export interface UserMiniDto {
	id: number;
	name: string;
	email?: string | null;
}

export interface ProjectDto {
	id: number;
	code: string;
	name: string;
	
	sponsor?: string | null;
	progress?: number | null;
	
	department_id?: number | null;
	project_status_id?: number | null;
	priority_id?: number | null;
	owner_user_id?: number | null;
	
	start_date?: string | null;
	target_start_date?: string | null;
	target_end_date?: string | null;
	actual_end_date?: string | null;
	
	created_at?: string;
	updated_at?: string;
	
	department?: DepartmentDto | null;
	status?: ProjectStatusDto | null;
	priority?: PriorityDto | null;
	owner?: UserMiniDto | null;
}

export type ProjectUpsertPayload = {
	code?: string;
	name?: string;
	sponsor?: string | null;
	progress?: number;
	
	department_id?: number | null;
	project_status_id?: number | null;
	priority_id?: number | null;
	owner_user_id?: number | null;
	
	start_date?: string | null;
	target_start_date?: string | null;
	target_end_date?: string | null;
	actual_end_date?: string | null;
};

type ExternalRiskIssueListParams = {
	search?: string;
	project_id?: number;
	external_source_id?: number;
	type_id?: number;
	severity_id?: number;
	risk_issue_status_id?: number;
	source_updated_from?: string;
	source_updated_to?: string;
	page?: number;
	per_page?: number;
};

export interface ProjectMilestoneDto {
	id: number;
	project_id: number;
	name: string;
	milestone_date: string | null;
	status: string;
	created_at?: string;
	updated_at?: string;
}

export type ProjectMilestoneUpsertPayload = {
	name?: string;
	milestone_date?: string | null;
	status?: string;
};

export interface ProjectTaskGanttDto {
	id: number;
	project_id: number;
	
	parent_task_id?: number | null;
	depends_on_task_id?: number | null;
	
	name: string;
	description?: string | null;
	
	task_color?: string | null;
	
	progress?: number | null;
	
	start_date?: string | null;        // 'YYYY-MM-DD'
	end_date?: string | null;
	
	actual_start_date?: string | null;
	actual_end_date?: string | null;
	
	duration?: number | null;
	sort_order?: number | null;
	
	task_status_id?: number | null;
	status_code?: string | null;
	status_name?: string | null;
	
	actual_task_status_id?: number | null;
	actual_status_code?: string | null;
	actual_status_name?: string | null;
	
	assigned_to_user_id?: number | null;
	assigned_to_name?: string | null;
	
	milestone_id?: number | null;
	milestone?: ProjectMilestoneMiniDto | null;
}

export type ProjectTaskUpsertPayload = {
	name?: string;
	description?: string | null;
	
	task_color?: string | null;
	task_status_id?: number | null;
	actual_task_status_id?: number | null;
	
	progress?: number | null;
	start_date?: string | null;
	end_date?: string | null;
	actual_start_date?: string | null;
	actual_end_date?: string | null;
	
	duration?: number | null;
	assigned_to_user_id?: number | null;
	
	sort_order?: number | null;
	parent_task_id?: number | null;
	depends_on_task_id?: number | null;
	
	// ✅ NEW
	milestone_id?: number | null;
};

type ProjectTaskGanttResponse = {
	project_id: number;
	tasks: ProjectTaskGanttDto[];
};

export type ProjectGanttResponse = {
	project_id: number;
	// tasks: ProjectTaskGanttDto[] | { data: ProjectTaskGanttDto[] };
	tasks: ProjectTaskGanttDto[];
};

type GanttResp = {
	project_id: number;
	tasks: any; // supports array OR {data:[]}
};

export interface ProjectMilestoneMiniDto {
	id: number;
	project_id: number;
	name: string;
	milestone_date: string | null;
}

export interface StoredFileDto {
	id: number;
	original_name: string;
	mime_type?: string | null;
	size: number;
	checksum?: string | null;
	
	disk: string;
	path: string;
	
	uploaded_by_user_id?: number | null;
	created_at?: string | null;
	updated_at?: string | null;
}

export interface AttachExistingFilePayload {
	file_id: number;
}

export interface FileDetachResponse {
	ok: boolean;
	deleted: boolean;
}

export interface FileAttachResponse {
	ok: boolean;
}

export interface FileUploadResponse extends StoredFileDto {}

