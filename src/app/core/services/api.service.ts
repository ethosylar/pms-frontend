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
	
	updateUser(id: number, payload: {
		name?: string;
		username?: string;
		email?: string;
		password?: string;
		department_id?: number | null;
	}) {
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
	
	
	getRoles(params?: {
		search?: string;
		is_active?: number;
		include_permissions?: boolean | number;
		page?: number;
		per_page?: number;
	}) {
	let httpParams = new HttpParams();
	
	if (params?.search) httpParams = httpParams.set('search', params.search);
	if (params?.is_active !== undefined) httpParams = httpParams.set('is_active', String(params.is_active));
	if (params?.include_permissions !== undefined) {
		httpParams = httpParams.set(
			'include_permissions',
			params.include_permissions ? '1' : '0'
		);
	}
	if (params?.page) httpParams = httpParams.set('page', String(params.page));
	if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
	
	return this.http.get<ApiCollection<RoleDto>>(
		`${environment.apiBaseUrl}/roles`,
		{ params: httpParams }
	);
	}
	
	getRole(id: number) {
		return this.http.get<ApiResource<RoleDto>>(
			`${environment.apiBaseUrl}/roles/${id}`
		);
	}
	
	createRole(payload: RoleUpsertPayload) {
		return this.http.post<ApiResource<RoleDto>>(
			`${environment.apiBaseUrl}/roles`,
			payload
		);
	}
	
	updateRole(id: number, payload: RoleUpsertPayload) {
		return this.http.put<ApiResource<RoleDto> | { ok: true; message?: string }>(
			`${environment.apiBaseUrl}/roles/${id}`,
			payload
		);
	}
	
	deleteRole(id: number) {
		return this.http.delete<{ ok: boolean; mode: 'SOFT' | 'HARD' }>(
			`${environment.apiBaseUrl}/roles/${id}`
		);
	}
	
	syncRolePermissions(roleId: number, permissionIds: number[]) {
		return this.http.put<ApiResource<RoleDto>>(
			`${environment.apiBaseUrl}/roles/${roleId}/permissions`,
			{
				permission_ids: permissionIds
			}
		);
	}
	
	// ******************************************************************************************************************************
	// Permission's Section
	// ******************************************************************************************************************************
	
	
	getPermissions(params?: {
		search?: string;
		module?: string;
		is_active?: number;
		page?: number;
		per_page?: number;
	}) {
	let httpParams = new HttpParams();
	
	if (params?.search) httpParams = httpParams.set('search', params.search);
	if (params?.module) httpParams = httpParams.set('module', params.module);
	if (params?.is_active !== undefined) httpParams = httpParams.set('is_active', String(params.is_active));
	if (params?.page) httpParams = httpParams.set('page', String(params.page));
	if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
	
	return this.http.get<ApiCollection<PermissionDto>>(
		`${environment.apiBaseUrl}/permissions`,
		{ params: httpParams }
	);
	}
	
	getPermission(id: number) {
		return this.http.get<ApiResource<PermissionDto>>(
			`${environment.apiBaseUrl}/permissions/${id}`
		);
	}
	
	createPermission(payload: PermissionUpsertPayload) {
		return this.http.post<ApiResource<PermissionDto>>(
			`${environment.apiBaseUrl}/permissions`,
			payload
		);
	}
	
	updatePermission(id: number, payload: PermissionUpsertPayload) {
		return this.http.put<ApiResource<PermissionDto> | { ok: true; message?: string }>(
			`${environment.apiBaseUrl}/permissions/${id}`,
			payload
		);
	}
	
	deletePermission(id: number) {
		return this.http.delete<{ ok: boolean; mode: 'SOFT' | 'HARD' }>(
			`${environment.apiBaseUrl}/permissions/${id}`
		);
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
	
	getExternalRiskIssues(
		params: ExternalRiskIssueListParams = {}
		) {
		let httpParams =
		new HttpParams();
		
		if (params.search) {
			httpParams =
			httpParams.set(
				'search',
				params.search
			);
		}
		
		const intKeys = [
			'project_id',
			'task_id',
			'milestone_id',
			'permit_id',
			'external_source_id',
			'type_id',
			'severity_id',
			'risk_issue_status_id',
		] as const satisfies ReadonlyArray<
		keyof ExternalRiskIssueListParams
		>;
		
		for (const key of intKeys) {
			const value = params[key];
			
			if (value != null) {
				httpParams =
				httpParams.set(
					String(key),
					String(value)
				);
			}
		}
		
		if (
			params.source_updated_from
			) {
			httpParams =
			httpParams.set(
				'source_updated_from',
				params.source_updated_from
			);
		}
		
		if (
			params.source_updated_to
			) {
			httpParams =
			httpParams.set(
				'source_updated_to',
				params.source_updated_to
			);
		}
		
		if (
			params.include_links !==
			undefined
			) {
			httpParams =
			httpParams.set(
				'include_links',
				params.include_links
				? '1'
				: '0'
			);
		}
		
		if (params.page) {
			httpParams =
			httpParams.set(
				'page',
				String(params.page)
			);
		}
		
		if (params.per_page) {
			httpParams =
			httpParams.set(
				'per_page',
				String(params.per_page)
			);
		}
		
		return this.http.get<
		ApiCollection<ExternalRiskIssueDto>
		>(
			`${environment.apiBaseUrl}/external-risk-issues`,
			{ params: httpParams }
		);
	}
	
	getExternalRiskIssue(
		id: number,
		includePayload = false
		) {
		let httpParams =
		new HttpParams();
		
		if (includePayload) {
			httpParams =
			httpParams.set(
				'include_payload',
				'1'
			);
		}
		
		return this.http.get<
		ApiResource<ExternalRiskIssueDto>
		>(
			`${environment.apiBaseUrl}/external-risk-issues/${id}`,
			{ params: httpParams }
		);
	}
	
	createExternalRiskIssue(
		payload:
		ExternalRiskIssueUpsertPayload
		) {
		return this.http.post<
		ApiResource<ExternalRiskIssueDto>
		>(
			`${environment.apiBaseUrl}/external-risk-issues`,
			payload
		);
	}
	
	updateExternalRiskIssue(
		id: number,
		payload:
		ExternalRiskIssueUpsertPayload
		) {
		return this.http.put<
		ApiResource<ExternalRiskIssueDto>
		>(
			`${environment.apiBaseUrl}/external-risk-issues/${id}`,
			payload
		);
	}
	
	deleteExternalRiskIssue(
		id: number
		) {
		return this.http.delete<{
			ok: boolean;
			mode: 'HARD';
			}>(
			`${environment.apiBaseUrl}/external-risk-issues/${id}`
		);
	}
	
	linkExternalRiskIssue(
		issueId: number,
		payload:
		ExternalRiskIssueLinkPayload
		) {
		return this.http.post<
		ApiResource<ExternalRiskIssueDto>
		>(
			`${environment.apiBaseUrl}/external-risk-issues/${issueId}/links`,
			payload
		);
	}
	
	unlinkExternalRiskIssue(
		issueId: number,
		linkId: number
		) {
		return this.http.delete<{
			ok: boolean;
			message?: string;
			}>(
			`${environment.apiBaseUrl}/external-risk-issues/${issueId}/links/${linkId}`
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
		return this.http.post(`${environment.apiBaseUrl}/projects/${projectId}/files`, fd);
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
	
	// ******************************************************************************************************************************
	// Project Budget Line's Section
	// ******************************************************************************************************************************
	getProjectBudgetLines(
		projectId: number,
		params?: {
			line_type?: ProjectBudgetLineType;
			is_active?: number;
			page?: number;
			per_page?: number;
		}
		) {
		let httpParams = new HttpParams();
		
		if (params?.line_type) httpParams = httpParams.set('line_type', params.line_type);
		if (params?.is_active !== undefined) httpParams = httpParams.set('is_active', String(params.is_active));
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<ProjectBudgetLineDto>>(
			`${environment.apiBaseUrl}/projects/${projectId}/budget-lines`,
			{ params: httpParams }
		);
	}
	
	getProjectBudgetLine(projectId: number, lineId: number) {
		return this.http.get<ApiResource<ProjectBudgetLineDto>>(
			`${environment.apiBaseUrl}/projects/${projectId}/budget-lines/${lineId}`
		);
	}
	
	createProjectBudgetLine(projectId: number, payload: ProjectBudgetLineUpsertPayload) {
		return this.http.post<ApiResource<ProjectBudgetLineDto>>(
			`${environment.apiBaseUrl}/projects/${projectId}/budget-lines`,
			payload
		);
	}
	
	updateProjectBudgetLine(projectId: number, lineId: number, payload: ProjectBudgetLineUpsertPayload) {
		return this.http.put<ApiResource<ProjectBudgetLineDto> | { ok: true; message?: string }>(
			`${environment.apiBaseUrl}/projects/${projectId}/budget-lines/${lineId}`,
			payload
		);
	}
	
	deleteProjectBudgetLine(projectId: number, lineId: number) {
		return this.http.delete<{ ok: boolean; mode: 'HARD' }>(
			`${environment.apiBaseUrl}/projects/${projectId}/budget-lines/${lineId}`
		);
	}
	
	// ******************************************************************************************************************************
	// Project Budget Allocation's Section
	// ******************************************************************************************************************************
	
	getProjectBudgetAllocations(
		projectId: number,
		params?: {
			budget_line_id?: number;
			task_id?: number;
			milestone_id?: number;
			line_type?: ProjectBudgetLineType;
			is_active?: number;
			page?: number;
			per_page?: number;
		}
		) {
		let httpParams = new HttpParams();
		
		if (params?.budget_line_id) httpParams = httpParams.set('budget_line_id', String(params.budget_line_id));
		if (params?.task_id) httpParams = httpParams.set('task_id', String(params.task_id));
		if (params?.milestone_id) httpParams = httpParams.set('milestone_id', String(params.milestone_id));
		if (params?.line_type) httpParams = httpParams.set('line_type', params.line_type);
		if (params?.is_active !== undefined) httpParams = httpParams.set('is_active', String(params.is_active));
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<ProjectBudgetAllocationDto>>(
			`${environment.apiBaseUrl}/projects/${projectId}/budget-allocations`,
			{ params: httpParams }
		);
	}
	
	getProjectBudgetAllocation(projectId: number, allocationId: number) {
		return this.http.get<ApiResource<ProjectBudgetAllocationDto>>(
			`${environment.apiBaseUrl}/projects/${projectId}/budget-allocations/${allocationId}`
		);
	}
	
	createProjectBudgetAllocation(projectId: number, payload: ProjectBudgetAllocationUpsertPayload) {
		return this.http.post<ApiResource<ProjectBudgetAllocationDto>>(
			`${environment.apiBaseUrl}/projects/${projectId}/budget-allocations`,
			payload
		);
	}
	
	updateProjectBudgetAllocation(projectId: number, allocationId: number, payload: ProjectBudgetAllocationUpsertPayload) {
		return this.http.put<ApiResource<ProjectBudgetAllocationDto> | { ok: boolean; message?: string }>(
			`${environment.apiBaseUrl}/projects/${projectId}/budget-allocations/${allocationId}`,
			payload
		);
	}
	
	deleteProjectBudgetAllocation(projectId: number, allocationId: number) {
		return this.http.delete<{ ok: boolean; mode: 'HARD' }>(
			`${environment.apiBaseUrl}/projects/${projectId}/budget-allocations/${allocationId}`
		);
	}
	
	getProjectCategories(params?: { search?: string; is_active?: number; page?: number; per_page?: number }) {
		let httpParams = new HttpParams();
		
		if (params?.search) httpParams = httpParams.set('search', params.search);
		if (params?.is_active !== undefined) httpParams = httpParams.set('is_active', String(params.is_active));
		if (params?.page) httpParams = httpParams.set('page', String(params.page));
		if (params?.per_page) httpParams = httpParams.set('per_page', String(params.per_page));
		
		return this.http.get<ApiCollection<ProjectCategoryDto>>(
			`${environment.apiBaseUrl}/project-categories`,
			{ params: httpParams }
		);
	}
	
	// ******************************************************************************************************************************
	// External Permit Section (ePTW Sync)
	// ******************************************************************************************************************************
	
	getExternalPermits(params?: ExternalPermitQueryParams) {
		return this.http.get<ApiPagedResponse<ExternalPermitDto>>(
			`${environment.apiBaseUrl}/external-permits`,
			{
				params: this.hpmsHttpParams(params)
			}
		);
	}
	
	getExternalPermit(id: number) {
		return this.http.get<ApiResource<ExternalPermitDto>>(
			`${environment.apiBaseUrl}/external-permits/${id}`
		);
	}
	
	getIntegrationSyncRuns(params?: IntegrationSyncRunQueryParams) {
		return this.http.get<ApiPagedResponse<IntegrationSyncRunDto>>(
			`${environment.apiBaseUrl}/integrations/eptw/sync-runs`,
			{
				params: this.hpmsHttpParams(params)
			}
		);
	}
	
	getIntegrationSyncRun(id: number) {
		return this.http.get<ApiResource<IntegrationSyncRunDto>>(
			`${environment.apiBaseUrl}/integrations/eptw/sync-runs/${id}`
		);
	}
	
	startEptwSync(payload: EptwSyncPayload) {
		return this.http.post<
		EptwQueuedResponse | ApiResource<IntegrationSyncRunDto>
		>(
			`${environment.apiBaseUrl}/integrations/eptw/sync`,
			payload
		);
	}
	
	syncOneEptwPermit(payload: EptwSyncOnePayload) {
		return this.http.post<
		EptwQueuedResponse | ApiResource<IntegrationSyncRunDto>
		>(
			`${environment.apiBaseUrl}/integrations/eptw/sync-one`,
			payload
		);
	}
	
	importTestEptwPermits(payload: ImportEptwPermitsPayload) {
		return this.http.post<ApiResource<IntegrationSyncRunDto>>(
			`${environment.apiBaseUrl}/integrations/eptw/import-test`,
			payload
		);
	}
	
	linkPermitToProject(projectId: number, payload: ProjectPermitLinkPayload) {
		return this.http.post<ApiCollectionResource<ProjectPermitLinkDto>>(
			`${environment.apiBaseUrl}/projects/${projectId}/permit-links`,
			payload
		);
	}
	
	unlinkPermitFromProject(projectId: number, linkId: number) {
		return this.http.delete<{ ok: boolean; mode?: string; message?: string }>(
			`${environment.apiBaseUrl}/projects/${projectId}/permit-links/${linkId}`
		);
	}
	
	getProjectPermits(projectId: number) {
		return this.http.get<ApiCollectionResource<ExternalPermitDto>>(
			`${environment.apiBaseUrl}/projects/${projectId}/permits`
		);
	}
	
	getTaskPermits(taskId: number) {
		return this.http.get<ApiCollectionResource<ExternalPermitDto>>(
			`${environment.apiBaseUrl}/tasks/${taskId}/permits`
		);
	}
	
	getMilestonePermits(projectId: number, milestoneId: number) {
		return this.http.get<ApiCollectionResource<ExternalPermitDto>>(
			`${environment.apiBaseUrl}/projects/${projectId}/milestones/${milestoneId}/permits`
		);
	}
	
	private hpmsHttpParams(params?: Record<string, any>): HttpParams {
		let httpParams = new HttpParams();
		
		Object.entries(params ?? {}).forEach(([key, value]) => {
			if (
				value === null ||
				value === undefined ||
				value === ''
				) {
				return;
			}
			
			if (typeof value === 'boolean') {
				httpParams = httpParams.set(key, value ? '1' : '0');
				return;
			}
			
			httpParams = httpParams.set(key, String(value));
		});
		
		return httpParams;
	}
	
	// ******************************************************************************************************************************
	// Agreemet Status Section (Agreement Module)
	// ******************************************************************************************************************************
	
	getAgreementStatuses(params:AgreementStatusListParams = {}) {
		let httpParams =
		new HttpParams();
		
		if (params.search) {
			httpParams = httpParams.set('search',params.search);
		}
		
		if (params.is_active !== undefined) {
			httpParams = httpParams.set('is_active',params.is_active ? '1' : '0');
		}
		
		if (params.is_terminal !== undefined) {
			httpParams = httpParams.set('is_terminal', params.is_terminal ? '1' : '0');
		}
		
		if (params.is_system_status !== undefined) {
			httpParams = httpParams.set('is_system_status', params.is_system_status ? '1' : '0');
		}
		
		if (params.page) {
			httpParams = httpParams.set('page', String(params.page));
		}
		
		if (params.per_page) {
			httpParams = httpParams.set('per_page', String(params.per_page));
		}
		
		return this.http.get<ApiCollection<AgreementStatusDto>>(
			`${environment.apiBaseUrl}/agreement-statuses`,
			{ params: httpParams }
		);
	}
	
	getAgreementStatus(id: number) {
		return this.http.get<ApiResource<AgreementStatusDto>>(
			`${environment.apiBaseUrl}/agreement-statuses/${id}`
		);
	}
	
	createAgreementStatus(payload:AgreementStatusUpsertPayload) {
		return this.http.post<ApiResource<AgreementStatusDto>>(
			`${environment.apiBaseUrl}/agreement-statuses`,
			payload
		);
	}
	
	updateAgreementStatus(id: number,payload:AgreementStatusUpsertPayload) {
		return this.http.put<ApiResource<AgreementStatusDto>>(
			`${environment.apiBaseUrl}/agreement-statuses/${id}`,
			payload
		);
	}
	
	deactivateAgreementStatus(id: number) {
		return this.http.delete<{ok: boolean; mode: 'SOFT'; message?: string;}>(
			`${environment.apiBaseUrl}/agreement-statuses/${id}`
		);
	}
	
	
	// ******************************************************************************************************************************
	// Agreement Counterparty Section
	// ******************************************************************************************************************************
	
	getCounterparties(params: CounterpartyQueryParams = {}) {
		let httpParams = new HttpParams();
		
		if (params.search) {
			httpParams = httpParams.set('search',params.search);
		}
		
		if (params.counterparty_type) {
			httpParams = httpParams.set('counterparty_type',params.counterparty_type);
		}
		
		if (params.is_active !== undefined) {
			httpParams = httpParams.set('is_active',params.is_active ? '1' : '0');
		}
		
		if (params.page) {
			httpParams = httpParams.set('page',String(params.page));
		}
		
		if (params.per_page) {
			httpParams = httpParams.set('per_page',String(params.per_page));
		}
		
		return this.http.get<ApiCollection<CounterpartyDto>>(
			`${environment.apiBaseUrl}/counterparties`,{params: httpParams,}
		);
	}
	
	getCounterparty(id: number) {
		return this.http.get<ApiResource<CounterpartyDto>>(
			`${environment.apiBaseUrl}/counterparties/${id}`
		);
	}
	
	createCounterparty(payload: CounterpartyUpsertPayload) {
		return this.http.post<ApiResource<CounterpartyDto>>(
			`${environment.apiBaseUrl}/counterparties`,
			payload
		);
	}
	
	updateCounterparty(id: number,payload: CounterpartyUpsertPayload) {
		return this.http.put<ApiResource<CounterpartyDto>>(
			`${environment.apiBaseUrl}/counterparties/${id}`,payload
		);
	}
	
	deactivateCounterparty(id: number) {
		return this.http.delete<{ ok: boolean; mode: 'SOFT'; message?: string; }>(
			`${environment.apiBaseUrl}/counterparties/${id}`
		);
	}
	
	// ******************************************************************************************************************************
	// Agreement Category Section
	// ******************************************************************************************************************************
	
	getAgreementCategories( params: AgreementCategoryQueryParams = {} ) {
		let httpParams = new HttpParams();
		
		if (params.search) {
			httpParams = httpParams.set('search', params.search);
		}
		
		if (params.is_active !== undefined) {
			httpParams = httpParams.set('is_active', params.is_active ? '1' : '0');
		}
		
		if (params.page) {
			httpParams = httpParams.set('page', String(params.page));
		}
		
		if (params.per_page) {
			httpParams = httpParams.set('per_page', String(params.per_page));
		}
		
		return this.http.get<ApiCollection<AgreementCategoryDto>>(
			`${environment.apiBaseUrl}/agreement-categories`,
			{params: httpParams,}
		);
	}
	
	getAgreementCategory(id: number) {
		return this.http.get<ApiResource<AgreementCategoryDto>>(
			`${environment.apiBaseUrl}/agreement-categories/${id}`
		);
	}
	
	createAgreementCategory(payload: AgreementCategoryUpsertPayload) {
		return this.http.post<ApiResource<AgreementCategoryDto>>(
			`${environment.apiBaseUrl}/agreement-categories`,
			payload
		);
	}
	
	updateAgreementCategory(id: number,payload: AgreementCategoryUpsertPayload) {
		return this.http.put<ApiResource<AgreementCategoryDto>>(
			`${environment.apiBaseUrl}/agreement-categories/${id}`,
			payload
		);
	}
	
	deactivateAgreementCategory(id: number) {
		return this.http.delete<{ ok: boolean; mode: 'SOFT'; message?: string; }>(
			`${environment.apiBaseUrl}/agreement-categories/${id}`
		);
	}
	
	// ******************************************************************************************************************************
	// Agreement Type Section
	// ******************************************************************************************************************************
	
	getAgreementTypes(params: AgreementTypeQueryParams = {}) {
		let httpParams = new HttpParams();
		
		if (params.search) {
			httpParams = httpParams.set('search', params.search);
		}
		
		if (params.agreement_category_id != null) {
			httpParams = httpParams.set('agreement_category_id', String(params.agreement_category_id));
		}
		
		if (params.is_active !== undefined) {
			httpParams = httpParams.set('is_active', params.is_active ? '1' : '0');
		}
		
		if (params.page) {
			httpParams = httpParams.set('page', String(params.page));
		}
		
		if (params.per_page) {
			httpParams = httpParams.set('per_page', String(params.per_page));
		}
		
		return this.http.get<ApiCollection<AgreementTypeDto>>(
			`${environment.apiBaseUrl}/agreement-types`,
			{ params: httpParams, }
		);
	}
	
	getAgreementType(id: number) {
		return this.http.get<ApiResource<AgreementTypeDto>>(
			`${environment.apiBaseUrl}/agreement-types/${id}`
		);
	}
	
	createAgreementType(payload: AgreementTypeUpsertPayload) {
		return this.http.post<ApiResource<AgreementTypeDto>>(
			`${environment.apiBaseUrl}/agreement-types`,
			payload
		);
	}
	
	updateAgreementType(id: number, payload: AgreementTypeUpsertPayload) {
		return this.http.put<ApiResource<AgreementTypeDto>>(
			`${environment.apiBaseUrl}/agreement-types/${id}`,
			payload
		);
	}
	
	deactivateAgreementType(id: number) {
		return this.http.delete<{ ok: boolean; mode: 'SOFT'; message?: string; }>(
			`${environment.apiBaseUrl}/agreement-types/${id}`
		);
	}
	
	// ******************************************************************************************************************************
	// Agreement Section
	// ******************************************************************************************************************************
	
	getAgreements(params: AgreementQueryParams = {}) {
		let httpParams = new HttpParams();
		
		const textKeys = [
			'search',
			'status_code',
			'lifecycle_type',
			'effective_from',
			'effective_to',
			'expiry_from',
			'expiry_to',
		] as const;
		
		for (const key of textKeys) {
			const value = params[key];
			if (value) {
				httpParams = httpParams.set(key,String(value));
			}
		}
		
		const numberKeys = [
			'department_id',
			'owner_user_id',
			'counterparty_id',
			'agreement_category_id',
			'agreement_type_id',
			'agreement_status_id',
		] as const;
		
		for (const key of numberKeys) {
			const value = params[key];
			if (value != null) {
				httpParams = httpParams.set(key,String(value));
			}
		}
		
		if (params.is_current_version !== undefined) {
			httpParams = httpParams.set('is_current_version', params.is_current_version ? '1' : '0');
		}
		
		if (params.include_archived !== undefined) {
			httpParams = httpParams.set('include_archived', params.include_archived ? '1' : '0');
		}
		
		if (params.page) {
			httpParams = httpParams.set('page',String(params.page));
		}
		
		if (params.per_page) {
			httpParams = httpParams.set('per_page', String(params.per_page));
		}
		
		return this.http.get<ApiCollection<AgreementDto>>(
			`${environment.apiBaseUrl}/agreements`, { params: httpParams, }
		);
	}
	
	getAgreement(id: number) {
		return this.http.get<ApiResource<AgreementDto>>(
			`${environment.apiBaseUrl}/agreements/${id}`
		);
	}
	
	createAgreement(payload: AgreementUpsertPayload) {
		return this.http.post<ApiResource<AgreementDto>>(
			`${environment.apiBaseUrl}/agreements`, payload
		);
	}
	
	updateAgreement(id: number, payload: AgreementUpsertPayload) {
		return this.http.put<ApiResource<AgreementDto>>(
			`${environment.apiBaseUrl}/agreements/${id}`, payload
		);
	}
	
	reviewAgreement(id: number, payload: AgreementNotesPayload) {
		return this.http.post<ApiResource<AgreementDto>>(
			`${environment.apiBaseUrl}/agreements/${id}/review`, payload
		);
	}
	
	submitAgreement(id: number, payload: AgreementNotesPayload) {
		return this.http.post<ApiResource<AgreementDto>>(
			`${environment.apiBaseUrl}/agreements/${id}/submit`, payload
		);
	}
	
	approveAgreement(id: number, payload: AgreementNotesPayload) {
		return this.http.post<ApiResource<AgreementDto>>(
			`${environment.apiBaseUrl}/agreements/${id}/approve`, payload
		);
	}
	
	activateAgreement(id: number, payload: AgreementNotesPayload) {
		return this.http.post<ApiResource<AgreementDto>>(
			`${environment.apiBaseUrl}/agreements/${id}/activate`, payload
		);
	}
	
	cancelAgreement(id: number, payload: AgreementNotesPayload) {
		return this.http.post<ApiResource<AgreementDto>>(
			`${environment.apiBaseUrl}/agreements/${id}/cancel`, payload
		);
	}
	
	archiveAgreement(id: number, payload: AgreementNotesPayload) {
		return this.http.post<ApiResource<AgreementDto>>(
			`${environment.apiBaseUrl}/agreements/${id}/archive`, payload
		);
	}
	
	amendAgreement(id: number, payload: AmendAgreementPayload) {
		return this.http.post<ApiResource<AgreementDto>>(
			`${environment.apiBaseUrl}/agreements/${id}/amend`, payload
		);
	}
	
	renewAgreement(id: number, payload: RenewAgreementPayload) {
		return this.http.post<ApiResource<AgreementDto>>(
			`${environment.apiBaseUrl}/agreements/${id}/renew`, payload
		);
	}
	
	terminateAgreement(id: number, payload: TerminateAgreementPayload) {
		return this.http.post<ApiResource<AgreementDto>>(
			`${environment.apiBaseUrl}/agreements/${id}/terminate`, payload
		);
	}
	
	linkProjectToAgreement(agreementId: number, payload: AgreementProjectLinkPayload) {
		return this.http.post<{ ok: boolean; link_id: number; agreement_id: number; project_id: number; }>(
			`${environment.apiBaseUrl}/agreements/${agreementId}/project-links`, payload
		);
	}
	
	unlinkProjectFromAgreement(agreementId: number, linkId: number) {
		return this.http.delete<{ ok: boolean; }>(
			`${environment.apiBaseUrl}/agreements/${agreementId}/project-links/${linkId}`
		);
	}
	
	// ******************************************************************************************************************************
	// Agreement Document Type Section
	// ******************************************************************************************************************************
	
	getAgreementDocumentTypes(params: AgreementDocumentTypeQueryParams = {}) {
		let httpParams = new HttpParams();
		
		if (params.search) {
			httpParams = httpParams.set('search', params.search);
		}
		
		if (params.is_active !== undefined) {
			httpParams = httpParams.set('is_active', params.is_active ? '1' : '0');
		}
		
		if (params.ocr_eligible !== undefined) {
			httpParams = httpParams.set('ocr_eligible', params.ocr_eligible ? '1' : '0');
		}
		
		if (params.page) {
			httpParams = httpParams.set('page', String(params.page));
		}
		
		if (params.per_page) {
			httpParams = httpParams.set('per_page', String(params.per_page));
		}
		
		return this.http.get<ApiCollection<AgreementDocumentTypeDto>>(
			`${environment.apiBaseUrl}/agreement-document-types`,{ params: httpParams, }
		);
	}
	
	getAgreementDocumentType(id: number) {
		return this.http.get<ApiResource<AgreementDocumentTypeDto>>(
			`${environment.apiBaseUrl}/agreement-document-types/${id}`
		);
	}
	
	createAgreementDocumentType(payload: AgreementDocumentTypeUpsertPayload) {
		return this.http.post<ApiResource<AgreementDocumentTypeDto>>(
			`${environment.apiBaseUrl}/agreement-document-types`, payload
		);
	}
	
	updateAgreementDocumentType(id: number, payload: AgreementDocumentTypeUpsertPayload) {
		return this.http.put<ApiResource<AgreementDocumentTypeDto>>(
			`${environment.apiBaseUrl}/agreement-document-types/${id}`, payload
		);
	}
	
	deactivateAgreementDocumentType(id: number) {
		return this.http.delete<{ ok: boolean; mode: 'SOFT'; message?: string; }>(
			`${environment.apiBaseUrl}/agreement-document-types/${id}`
		);
	}
	
	// ******************************************************************************************************************************
	// Agreement Document Section
	// ******************************************************************************************************************************
	
	getAgreementDocuments(agreementId: number, params: AgreementDocumentQueryParams = {}) {
		let httpParams = new HttpParams();
		
		if (params.document_type_id != null) {
			httpParams = httpParams.set('document_type_id', String(params.document_type_id));
		}
		
		if (params.is_current !== undefined) {
			httpParams = httpParams.set('is_current', params.is_current ? '1' : '0');
		}
		
		if (params.is_executed_copy !== undefined) {
			httpParams = httpParams.set('is_executed_copy', params.is_executed_copy ? '1' : '0');
		}
		
		if (params.ocr_status) {
			httpParams = httpParams.set('ocr_status', params.ocr_status);
		}
		
		if (params.page) {
			httpParams = httpParams.set('page', String(params.page));
		}
		
		if (params.per_page) {
			httpParams = httpParams.set('per_page', String(params.per_page));
		}
		
		return this.http.get<ApiCollection<AgreementDocumentDto>>(
			`${environment.apiBaseUrl}/agreements/${agreementId}/documents`, { params: httpParams, }
		);
	}
	
	uploadAgreementDocument(agreementId: number, payload: AgreementDocumentUploadPayload) {
		const formData = new FormData();
		
		formData.append('file', payload.file);
		
		formData.append('document_type_id', String(payload.document_type_id));
		
		if (payload.document_version) {
			formData.append('document_version', payload.document_version);
		}
		
		if (payload.document_date) {
			formData.append('document_date', payload.document_date);
		}
		
		formData.append('is_current', payload.is_current ? '1' : '0');
		
		formData.append('is_executed_copy', payload.is_executed_copy ? '1' : '0');
		
		if (payload.supersedes_agreement_file_id != null) {
			formData.append('supersedes_agreement_file_id', String(payload.supersedes_agreement_file_id));
		}
		
		if (payload.notes) {
			formData.append('notes', payload.notes);
		}
		
		return this.http.post<ApiResource<AgreementDocumentDto>>(
			`${environment.apiBaseUrl}/agreements/${agreementId}/documents`, formData
		);
	}
	
	updateAgreementDocument(agreementId: number, documentId: number, payload: AgreementDocumentUpdatePayload) {
		return this.http.put<ApiResource<AgreementDocumentDto>>(
			`${environment.apiBaseUrl}/agreements/${agreementId}/documents/${documentId}`, payload
		);
	}
	
	removeAgreementDocument(agreementId: number, documentId: number) {
		return this.http.delete<{ ok: boolean; physical_deleted: boolean; }>(
			`${environment.apiBaseUrl}/agreements/${agreementId}/documents/${documentId}`
		);
	}
	
	downloadAgreementDocument(agreementId: number, documentId: number) {
		return this.http.get(
			`${environment.apiBaseUrl}/agreements/${agreementId}/documents/${documentId}/download`, { responseType: 'blob', }
		);
	}
	
	requestAgreementDocumentOcr(agreementId: number, documentId: number) {
		return this.http.post<ApiResource<AgreementDocumentDto>>(
			`${environment.apiBaseUrl}/agreements/${agreementId}/documents/${documentId}/ocr/request`, {}
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

export interface PermissionDto {
	id: number;
	code: string;
	name: string;
	module?: string | null;
	description?: string | null;
	sort_order?: number;
	is_active: boolean;
	created_at?: string;
	updated_at?: string;
}

export interface RoleDto {
	id: number;
	role_id?: number;
	code: string;
	name: string;
	is_active: boolean;
	permissions?: PermissionDto[];
	created_at?: string;
	updated_at?: string;
}

export interface RoleUpsertPayload {
	code?: string;
	name?: string;
	is_active?: boolean;
	permission_ids?: number[];
}

export interface PermissionUpsertPayload {
	code?: string;
	name?: string;
	module?: string | null;
	description?: string | null;
	sort_order?: number | null;
	is_active?: boolean;
}

export interface UserDto {
	id: number;
	name: string;
	username: string;
	email: string;
	roles?: RoleDto[];
	permissions?: string[];
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

export interface AuditLogQueryParams {
	performed_by_user_id?: number;
	action?: string;
	entity_type?: string;
	date_from?: string;
	date_to?: string;
	page?: number;
	per_page?: number;
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

export interface ExternalRiskIssueLinkDto {
	id: number;
	external_risk_issue_id: number;
	
	project_id?: number | null;
	project_code?: string | null;
	project_name?: string | null;
	
	task_id?: number | null;
	task_title?: string | null;
	task_name?: string | null;
	
	milestone_id?: number | null;
	milestone_name?: string | null;
	milestone_date?: string | null;
	
	permit_id?: number | null;
	permit_external_form_id?: string | null;
	permit_external_permit_id?: string | null;
	permit_status?: string | null;
	
	linked_by_user_id?: number | null;
	linked_by_name?: string | null;
	linked_at?: string | null;
	
	notes?: string | null;
	is_active: boolean;
	
	created_at?: string | null;
	updated_at?: string | null;
}

export interface ExternalRiskIssueDto {
	id: number;
	
	external_source_id?: number | null;
	external_source_code?: string | null;
	external_source_name?: string | null;
	
	external_id: string;
	
	project_id?: number | null;
	project_code?: string | null;
	project_name?: string | null;
	
	type_id?: number | null;
	type_code?: string | null;
	type_name?: string | null;
	
	title: string;
	description?: string | null;
	
	severity_id?: number | null;
	severity_code?: string | null;
	severity_name?: string | null;
	
	risk_issue_status_id?: number | null;
	risk_issue_status_code?: string | null;
	risk_issue_status_name?: string | null;
	
	owner?: string | null;
	
	source_created_at?: string | null;
	source_updated_at?: string | null;
	last_synced_at?: string | null;
	
	active_links?: ExternalRiskIssueLinkDto[];
	links?: ExternalRiskIssueLinkDto[];
	active_link_count?: number;
	
	raw_payload?: unknown;
	
	created_at?: string | null;
	updated_at?: string | null;
}

export type ExternalRiskIssueUpsertPayload = {
	external_source_id?: number | null;
	external_id?: string;
	
	project_id?: number | null;
	type_id?: number | null;
	severity_id?: number | null;
	risk_issue_status_id?: number | null;
	
	title?: string;
	description?: string | null;
	owner?: string | null;
	
	source_created_at?: string | null;
	source_updated_at?: string | null;
	last_synced_at?: string | null;
	
	raw_payload?:
	| string
	| Record<string, unknown>
	| unknown[]
	| null;
};

export type ExternalRiskIssueLinkPayload = {
	project_id?: number | null;
	task_id?: number | null;
	milestone_id?: number | null;
	permit_id?: number | null;
	notes?: string | null;
	is_active?: boolean;
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
	description?: string | null;
	
	sponsor?: string | null;
	
	department_id?: number | null;
	project_status_id?: number | null;
	priority_id?: number | null;
	owner_user_id?: number | null;
	
	project_category_id?: number | null;
	category_code?: string | null;
	category_name?: string | null;
	
	planned_progress?: number | null;
	progress?: number | null;
	
	start_date?: string | null;
	actual_start_date?: string | null;
	target_end_date?: string | null;
	actual_end_date?: string | null;
	
	notes?: string | null;
	
	currency_code?: string | null;
	planned_cost_total?: number | null;
	actual_cost_total?: number | null;
	committed_cost_total?: number | null;
	planned_funding_total?: number | null;
	actual_funding_total?: number | null;
	budget_notes?: string | null;
	budget_updated_at?: string | null;
	
	cost_utilization_pct?: number | null;
	cost_variance?: number | null;
	funding_utilization_pct?: number | null;
	funding_variance?: number | null;
	
	department?: DepartmentDto | null;
	status?: ProjectStatusDto | null;
	priority?: PriorityDto | null;
	owner?: UserMiniDto | null;
	
	created_at?: string;
	updated_at?: string;
}

export type ProjectUpsertPayload = {
	code?: string;
	name?: string;
	description?: string | null;
	
	sponsor?: string | null;
	
	department_id?: number | null;
	project_status_id?: number | null;
	priority_id?: number | null;
	owner_user_id?: number | null;
	project_category_id?: number | null;
	
	planned_progress?: number;
	progress?: number;
	
	start_date?: string | null;
	actual_start_date?: string | null;
	target_end_date?: string | null;
	actual_end_date?: string | null;
	
	notes?: string | null;
	
	currency_code?: string | null;
	planned_cost_total?: number | null;
	actual_cost_total?: number | null;
	committed_cost_total?: number | null;
	planned_funding_total?: number | null;
	actual_funding_total?: number | null;
	budget_notes?: string | null;
	budget_updated_at?: string | null;
};

export type ProjectBudgetLineType = 'COST' | 'FUND';

export type ExternalRiskIssueListParams = {
	search?: string;
	
	project_id?: number;
	task_id?: number;
	milestone_id?: number;
	permit_id?: number;
	
	external_source_id?: number;
	type_id?: number;
	severity_id?: number;
	risk_issue_status_id?: number;
	
	source_updated_from?: string;
	source_updated_to?: string;
	
	include_links?: boolean;
	
	page?: number;
	per_page?: number;
};

export interface ProjectMilestoneDto {
	id: number;
	project_id: number;
	name: string;
	milestone_date: string | null;
	status: string;
	budget?: ProjectBudgetSummaryDto;
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
	
	start_date?: string | null;
	end_date?: string | null;
	
	actual_start_date?: string | null;
	actual_end_date?: string | null;
	
	duration?: number | null;
	sort_order?: number | null;
	
	budget?: ProjectBudgetSummaryDto;
	
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

export interface ProjectBudgetLineDto {
	id: number;
	project_id: number;
	line_type: ProjectBudgetLineType;
	code: string;
	name: string;
	planned_amount: number;
	actual_amount: number;
	committed_amount: number;
	sort_order: number;
	is_active: boolean;
	notes?: string | null;
	created_at?: string | null;
	updated_at?: string | null;
}

export type ProjectBudgetLineUpsertPayload = {
	line_type?: ProjectBudgetLineType;
	code?: string;
	name?: string;
	planned_amount?: number | null;
	actual_amount?: number | null;
	committed_amount?: number | null;
	sort_order?: number | null;
	is_active?: boolean | null;
	notes?: string | null;
};

export interface ProjectBudgetSummaryDto {
	planned_cost: number;
	actual_cost: number;
	committed_cost: number;
	spent_cost: number;
	
	planned_funding: number;
	actual_funding: number;
	committed_funding: number;
	received_funding: number;
	
	net_spent: number;
}

export interface ProjectCategoryDto {
	id: number;
	code: string;
	name: string;
	group?: string | null;
	year?: number | null;
	sort_order?: number;
	is_active?: boolean;
	created_at?: string | null;
	updated_at?: string | null;
}

export interface ProjectBudgetAllocationDto {
	id: number;
	project_id: number;
	budget_line_id: number;
	task_id?: number | null;
	milestone_id?: number | null;
	
	planned_amount: number;
	actual_amount: number;
	committed_amount: number;
	
	sort_order: number;
	is_active: boolean;
	notes?: string | null;
	
	budget_line?: {
		id: number;
		line_type: ProjectBudgetLineType;
		code: string;
		name: string;
	} | null;
	
	created_at?: string | null;
	updated_at?: string | null;
}

export type ProjectBudgetAllocationUpsertPayload = {
	budget_line_id?: number | null;
	task_id?: number | null;
	milestone_id?: number | null;
	planned_amount?: number | null;
	actual_amount?: number | null;
	committed_amount?: number | null;
	sort_order?: number | null;
	is_active?: boolean | null;
	notes?: string | null;
};

export interface ApiPagedResponse<T> {
	data: T[];
	links?: {
		first?: string | null;
		last?: string | null;
		prev?: string | null;
		next?: string | null;
	};
	meta?: {
		current_page: number;
		from?: number | null;
		last_page: number;
		path?: string;
		per_page: number;
		to?: number | null;
		total: number;
	};
}

export interface ExternalPermitSourceDto {
	id: number;
	code: string;
	name: string;
	base_url?: string | null;
}

export interface ProjectPermitLinkMiniDto {
	id: number;
	permit_id: number;
	project_id: number;
	task_id?: number | null;
	linked_by_user_id?: number | null;
	linked_at?: string | null;
	notes?: string | null;
	is_active: boolean;
	project?: {
		id: number;
		code: string;
		name: string;
	};
	task?: {
		id: number;
		project_id: number;
		milestone_id?: number | null;
		name: string;
	};
	linked_by?: {
		id: number;
		name: string;
		email: string;
	};
}

export interface ExternalPermitDto {
	id: number;
	
	external_source_id: number;
	external_form_id: string;
	external_permit_id?: string | null;
	
	raw_status?: string | null;
	normalized_status: string;
	
	applicant_name?: string | null;
	service_name?: string | null;
	company_name?: string | null;
	supervisor_name?: string | null;
	exact_location?: string | null;
	
	work_type?: string | null;
	hazards?: string | null;
	ppe?: string | null;
	worksite_controls?: string | null;
	infection_controls?: string | null;
	remark?: string | null;
	
	work_start_date?: string | null;
	work_end_date?: string | null;
	work_start_time?: string | null;
	work_end_time?: string | null;
	
	brief_date?: string | null;
	brief_time?: string | null;
	brief_conducted_by?: string | null;
	
	source_created_at?: string | null;
	source_updated_at?: string | null;
	last_synced_at?: string | null;
	last_seen_at?: string | null;
	
	source_url?: string | null;
	
	is_source_deleted: boolean;
	source_deleted_at?: string | null;
	
	is_expired: boolean;
	days_until_end?: number | null;
	
	active_links_count?: number | null;
	
	source?: ExternalPermitSourceDto;
	links?: ProjectPermitLinkMiniDto[];
	
	created_at?: string | null;
	updated_at?: string | null;
}

export interface ExternalPermitQueryParams {
	search?: string;
	normalized_status?: string;
	raw_status?: string;
	company_name?: string;
	service_name?: string;
	date_from?: string;
	date_to?: string;
	project_id?: number;
	task_id?: number;
	is_linked?: boolean | '';
	include_deleted?: boolean;
	page?: number;
	per_page?: number;
}

export interface IntegrationSyncRunDto {
	id: number;
	
	external_source_id: number;
	integration_code: string;
	sync_type: string;
	status: string;
	
	started_at?: string | null;
	completed_at?: string | null;
	
	fetched_count: number;
	created_count: number;
	updated_count: number;
	unchanged_count: number;
	deleted_count: number;
	failed_count: number;
	
	cursor_from?: string | null;
	cursor_to?: string | null;
	error_message?: string | null;
	
	triggered_by_user_id?: number | null;
	
	source?: {
		id: number;
		code: string;
		name: string;
	};
	
	triggered_by?: {
		id: number;
		name: string;
		email: string;
	};
	
	created_at?: string | null;
	updated_at?: string | null;
}

export interface IntegrationSyncRunQueryParams {
	status?: string;
	sync_type?: string;
	date_from?: string;
	date_to?: string;
	page?: number;
	per_page?: number;
}

export type EptwSyncMode = 'FULL' | 'INCREMENTAL' | 'MANUAL';

export interface EptwSyncPayload {
	mode: EptwSyncMode;
	run_async?: boolean;
}

export interface EptwSyncOnePayload {
	external_form_id: string;
	run_async?: boolean;
}

export interface EptwQueuedResponse {
	ok: boolean;
	queued: boolean;
	message: string;
	mode?: string;
	external_form_id?: string;
}

export interface ApiCollectionResource<T> {
	data: T[];
}

export interface ImportEptwPermitsPayload {
	sync_type?: 'FULL' | 'INCREMENTAL' | 'MANUAL';
	cursor_from?: string | null;
	cursor_to?: string | null;
	permits: any[];
}

export interface ProjectPermitLinkPayload {
	permit_id: number;
	task_ids?: number[];
	notes?: string | null;
}

export interface ProjectPermitLinkDto {
	id: number;
	permit_id: number;
	project_id: number;
	task_id?: number | null;
	linked_by_user_id?: number | null;
	linked_at?: string | null;
	notes?: string | null;
	is_active: boolean;
	
	permit?: {
		id: number;
		external_form_id: string;
		external_permit_id?: string | null;
		normalized_status: string;
		company_name?: string | null;
		exact_location?: string | null;
		work_start_date?: string | null;
		work_end_date?: string | null;
	};
	
	project?: {
		id: number;
		code: string;
		name: string;
	};
	
	task?: {
		id: number;
		project_id: number;
		milestone_id?: number | null;
		name: string;
	};
	
	linked_by?: {
		id: number;
		name: string;
		email: string;
	};
	
	created_at?: string | null;
	updated_at?: string | null;
}

export interface AgreementStatusDto {
	id: number;
	code: string;
	name: string;
	description?: string | null;
	sort_order: number;
	is_terminal: boolean;
	is_system_status: boolean;
	is_active: boolean;
	created_at?: string | null;
	updated_at?: string | null;
}

export type AgreementStatusListParams = {
	search?: string;
	is_active?: boolean;
	is_terminal?: boolean;
	is_system_status?: boolean;
	page?: number;
	per_page?: number;
};

export type AgreementStatusUpsertPayload = {
	code?: string;
	name?: string;
	description?: string | null;
	sort_order?: number;
	is_terminal?: boolean;
	is_active?: boolean;
};

export type CounterpartyType =
| 'COMPANY'
| 'VENDOR'
| 'GOVERNMENT_AGENCY'
| 'INDIVIDUAL'
| 'OTHER';

export interface CounterpartyDto {
	id: number;
	
	code?: string | null;
	counterparty_type: CounterpartyType;
	
	legal_name: string;
	trading_name?: string | null;
	
	registration_no?: string | null;
	tax_no?: string | null;
	vendor_no?: string | null;
	
	contact_person?: string | null;
	contact_position?: string | null;
	email?: string | null;
	phone?: string | null;
	alternate_phone?: string | null;
	
	address_line_1?: string | null;
	address_line_2?: string | null;
	city?: string | null;
	state?: string | null;
	postcode?: string | null;
	country?: string | null;
	
	notes?: string | null;
	is_active: boolean;
	
	created_at?: string | null;
	updated_at?: string | null;
}

export interface CounterpartyQueryParams {
	search?: string;
	counterparty_type?: CounterpartyType;
	is_active?: boolean;
	page?: number;
	per_page?: number;
}

export interface CounterpartyUpsertPayload {
	code?: string;
	
	counterparty_type?: CounterpartyType;
	
	legal_name?: string;
	trading_name?: string | null;
	
	registration_no?: string | null;
	tax_no?: string | null;
	vendor_no?: string | null;
	
	contact_person?: string | null;
	contact_position?: string | null;
	email?: string | null;
	phone?: string | null;
	alternate_phone?: string | null;
	
	address_line_1?: string | null;
	address_line_2?: string | null;
	city?: string | null;
	state?: string | null;
	postcode?: string | null;
	country?: string | null;
	
	notes?: string | null;
	is_active?: boolean;
}

export interface AgreementCategoryDto {
	id: number;
	
	code: string;
	name: string;
	description?: string | null;
	
	sort_order: number;
	
	is_system_category: boolean;
	is_active: boolean;
	
	types_count?: number;
	
	created_at?: string | null;
	updated_at?: string | null;
}

export interface AgreementCategoryQueryParams {
	search?: string;
	is_active?: boolean;
	page?: number;
	per_page?: number;
}

export interface AgreementCategoryUpsertPayload {
	code?: string;
	name?: string;
	description?: string | null;
	sort_order?: number;
	is_active?: boolean;
}

export interface AgreementTypeCategoryMiniDto {
	id: number;
	code: string;
	name: string;
}

export interface AgreementTypeDto {
	id: number;
	
	agreement_category_id?: number | null;
	category?: AgreementTypeCategoryMiniDto | null;
	
	code: string;
	name: string;
	description?: string | null;
	
	sort_order: number;
	
	is_system_type: boolean;
	is_active: boolean;
	
	created_at?: string | null;
	updated_at?: string | null;
}

export interface AgreementTypeQueryParams {
	search?: string;
	agreement_category_id?: number;
	is_active?: boolean;
	page?: number;
	per_page?: number;
}

export interface AgreementTypeUpsertPayload {
	agreement_category_id?: number | null;
	
	code?: string;
	name?: string;
	description?: string | null;
	
	sort_order?: number;
	is_active?: boolean;
}

export type AgreementLifecycleType =
| 'ORIGINAL'
| 'AMENDMENT'
| 'RENEWAL';

export type AgreementOcrStatus =
| 'NOT_REQUESTED'
| 'PENDING'
| 'PROCESSING'
| 'COMPLETED'
| 'FAILED';

export interface AgreementMiniLookupDto {
	id: number;
	code: string;
	name: string;
}

export interface AgreementUserMiniDto {
	id: number;
	name: string;
	email?: string | null;
}

export interface AgreementCounterpartyMiniDto {
	id: number;
	code?: string | null;
	counterparty_type?: string | null;
	legal_name: string;
	trading_name?: string | null;
	registration_no?: string | null;
}

export interface AgreementStatusMiniDto {
	id: number;
	code: string;
	name: string;
	is_terminal?: boolean;
}

export interface AgreementLifecycleDto {
	type: AgreementLifecycleType;
	parent_agreement_id?: number | null;
	root_agreement_id?: number | null;
	revision_no: number;
	renewal_sequence: number;
	is_current_version: boolean;
}

export interface AgreementWorkflowDto {
	submitted_at?: string | null;
	submitted_by_user_id?: number | null;
	
	approved_at?: string | null;
	approved_by_user_id?: number | null;
	
	terminated_on?: string | null;
	termination_reason?: string | null;
	terminated_by_user_id?: number | null;
	
	archived_at?: string | null;
	archived_by_user_id?: number | null;
}

export interface AgreementRelatedVersionDto {
	id: number;
	agreement_no: string;
	title: string;
	lifecycle_type: AgreementLifecycleType;
	revision_no: number;
	renewal_sequence: number;
	is_current_version: boolean;
}

export interface AgreementProjectDto {
	link_id: number;
	id: number;
	code: string;
	name: string;
	notes?: string | null;
	linked_by_user_id?: number | null;
	linked_at?: string | null;
}

export interface AgreementLifecycleEventDto {
	id: number;
	agreement_id: number;
	event_type: string;
	
	from_status?: AgreementStatusMiniDto | null;
	to_status?: AgreementStatusMiniDto | null;
	
	related_agreement?: {
		id: number;
		agreement_no: string;
		title: string;
	} | null;
	
	performed_by?: AgreementUserMiniDto | null;
	
	reason?: string | null;
	metadata?: unknown;
	event_at?: string | null;
	created_at?: string | null;
}

export interface AgreementDocumentTypeDto {
	id: number;
	code: string;
	name: string;
	description?: string | null;
	ocr_eligible: boolean;
	sort_order: number;
	is_system_type: boolean;
	is_active: boolean;
	created_at?: string | null;
	updated_at?: string | null;
}

export interface AgreementDocumentOcrDto {
	feature_enabled: boolean;
	eligible?: boolean | null;
	status: AgreementOcrStatus;
	engine?: string | null;
	language?: string | null;
	page_count?: number | null;
	requested_by_user_id?: number | null;
	requested_at?: string | null;
	started_at?: string | null;
	completed_at?: string | null;
	error_message?: string | null;
	has_extracted_text?: boolean;
}

export interface AgreementDocumentDto {
	id: number;
	agreement_id: number;
	
	document_type_id: number;
	document_type?: AgreementDocumentTypeDto | null;
	
	document_version?: string | null;
	document_date?: string | null;
	
	is_current: boolean;
	is_executed_copy: boolean;
	
	supersedes_agreement_file_id?: number | null;
	notes?: string | null;
	
	file?: {
		id: number;
		original_name: string;
		mime_type?: string | null;
		size: number;
		checksum?: string | null;
		uploaded_by_user_id?: number | null;
		created_at?: string | null;
	} | null;
	
	linked_by_user_id?: number | null;
	linked_by?: AgreementUserMiniDto | null;
	
	ocr: AgreementDocumentOcrDto;
	
	created_at?: string | null;
	updated_at?: string | null;
}

export interface AgreementDto {
	id: number;
	agreement_no: string;
	title: string;
	
	department_id: number;
	department?: AgreementMiniLookupDto | null;
	
	owner_user_id: number;
	owner?: AgreementUserMiniDto | null;
	
	counterparty_id: number;
	counterparty?: AgreementCounterpartyMiniDto | null;
	
	agreement_category_id: number;
	category?: AgreementMiniLookupDto | null;
	
	agreement_type_id?: number | null;
	type?: AgreementMiniLookupDto | null;
	
	agreement_status_id: number;
	status?: AgreementStatusMiniDto | null;
	
	description?: string | null;
	purpose?: string | null;
	scope?: string | null;
	
	effective_date?: string | null;
	expiry_date?: string | null;
	signed_date?: string | null;
	
	notice_period_days?: number | null;
	auto_renewal: boolean;
	
	contract_value?: number | string | null;
	currency_code?: string | null;
	
	lifecycle: AgreementLifecycleDto;
	
	parent_agreement?: {
		id: number;
		agreement_no: string;
		title: string;
	} | null;
	
	child_agreements?: AgreementRelatedVersionDto[];
	
	workflow: AgreementWorkflowDto;
	
	projects?: AgreementProjectDto[];
	documents?: AgreementDocumentDto[];
	lifecycle_events?: AgreementLifecycleEventDto[];
	
	created_by_user_id: number;
	updated_by_user_id?: number | null;
	
	created_at?: string | null;
	updated_at?: string | null;
}

export interface AgreementQueryParams {
	search?: string;
	
	department_id?: number;
	owner_user_id?: number;
	counterparty_id?: number;
	agreement_category_id?: number;
	agreement_type_id?: number;
	agreement_status_id?: number;
	
	status_code?: string;
	lifecycle_type?: AgreementLifecycleType | '';
	
	effective_from?: string;
	effective_to?: string;
	expiry_from?: string;
	expiry_to?: string;
	
	is_current_version?: boolean;
	include_archived?: boolean;
	
	page?: number;
	per_page?: number;
}

export interface AgreementUpsertPayload {
	agreement_no?: string | null;
	title?: string;
	
	department_id?: number;
	owner_user_id?: number;
	counterparty_id?: number;
	agreement_category_id?: number;
	agreement_type_id?: number | null;
	
	description?: string | null;
	purpose?: string | null;
	scope?: string | null;
	
	effective_date?: string | null;
	expiry_date?: string | null;
	signed_date?: string | null;
	
	notice_period_days?: number | null;
	auto_renewal?: boolean;
	
	contract_value?: number | null;
	currency_code?: string;
}

export interface AgreementNotesPayload {
	reason?: string | null;
	notes?: string | null;
}

export interface AmendAgreementPayload {
	title?: string | null;
	amendment_reason: string;
	effective_date?: string | null;
	expiry_date?: string | null;
	copy_project_links?: boolean;
}

export interface RenewAgreementPayload {
	title?: string | null;
	renewal_reason?: string | null;
	
	effective_date: string;
	expiry_date: string;
	
	contract_value?: number | null;
	currency_code?: string | null;
	notice_period_days?: number | null;
	auto_renewal?: boolean;
	copy_project_links?: boolean;
}

export interface TerminateAgreementPayload {
	termination_reason: string;
	terminated_on?: string | null;
}

export interface AgreementProjectLinkPayload {
	project_id: number;
	notes?: string | null;
}

export interface AgreementDocumentTypeQueryParams {
	search?: string;
	is_active?: boolean;
	ocr_eligible?: boolean;
	page?: number;
	per_page?: number;
}

export interface AgreementDocumentTypeUpsertPayload {
	code?: string;
	name?: string;
	description?: string | null;
	ocr_eligible?: boolean;
	sort_order?: number;
	is_active?: boolean;
}

export interface AgreementDocumentQueryParams {
	document_type_id?: number;
	is_current?: boolean;
	is_executed_copy?: boolean;
	ocr_status?: AgreementOcrStatus | '';
	page?: number;
	per_page?: number;
}

export interface AgreementDocumentUploadPayload {
	file: File;
	document_type_id: number;
	document_version?: string | null;
	document_date?: string | null;
	is_current: boolean;
	is_executed_copy: boolean;
	supersedes_agreement_file_id?: number | null;
	notes?: string | null;
}

export interface AgreementDocumentUpdatePayload {
	document_type_id?: number;
	document_version?: string | null;
	document_date?: string | null;
	is_current?: boolean;
	is_executed_copy?: boolean;
	supersedes_agreement_file_id?: number | null;
	notes?: string | null;
}

