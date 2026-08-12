import {
	ChangeDetectorRef,
	Component,
	OnInit,
} from '@angular/core';

import {
	CommonModule,
} from '@angular/common';

import {
	Router,
	RouterModule,
} from '@angular/router';

import {
	finalize,
} from 'rxjs/operators';

import {
	AgreementDashboardAgreement,
	AgreementDashboardDrilldownFilter,
	AgreementDashboardOverview,
	ApiService,
} from '../../../core/services/api.service';


type TimelineRange =
	| 3
	| 6
	| 12
	| 'all';


interface AgreementTimelineVm {
	id: number;

	agreement_no: string;
	title: string;

	status_code: string;
	status_name: string;

	counterparty: string | null;
	department: string | null;
	owner: string | null;

	effective_date?: string | null;
	timeline_start_date?: string | null;
	expiry_date?: string | null;

	days_until_expiry?: number | null;

	auto_renewal: boolean;

	contract_value?:
		number |
		string |
		null;

	currency_code?: string | null;
}


type ExpiryBucket =
	| 'expired'
	| '0_30'
	| '31_60'
	| '61_90'
	| '91_180'
	| '181_365'
	| 'no_expiry';


@Component({
	standalone: true,

	selector:
		'app-agreement-dashboard',

	imports: [
		CommonModule,
		RouterModule,
	],

	templateUrl:
		'./agreement-dashboard.html',

	styleUrls: [
		'./agreement-dashboard.scss',
	],
})
export class AgreementDashboardComponent
implements OnInit {

	loading = true;

	timelineLoading = false;

	error:
		string | null = null;

	overview:
		AgreementDashboardOverview |
		null = null;


	// =========================================================================
	// Timeline
	// =========================================================================

	timelineRange:
		TimelineRange = 6;


	readonly timelineRanges:
		TimelineRange[] = [
			3,
			6,
			12,
			'all',
		];


	constructor(
		private api: ApiService,
		private router: Router,
		private cdr: ChangeDetectorRef,
	) {}


	ngOnInit(): void {
		this.load();
	}


	// =========================================================================
	// Load
	// =========================================================================

	load(
		fullPage = true
	): void {

		if (fullPage) {

			this.loading =
				true;

		} else {

			this.timelineLoading =
				true;
		}


		this.error =
			null;


		const isAll =
			this.timelineRange ===
			'all';


		this.api
			.agreementDashboardOverview({

				/*
				 * Standard dashboard request loads
				 * twelve months.
				 *
				 * 3 / 6 / 12 month views are then
				 * filtered locally.
				 */
				timeline_months:
					isAll
						? undefined
						: 12,


				/*
				 * Requires the corresponding
				 * backend enhancement.
				 */
				timeline_all:
					isAll,

				include_no_expiry:
					isAll,


				timeline_limit:
					isAll
						? 1000
						: 100,
			})
			.pipe(

				finalize(() => {

					this.loading =
						false;

					this.timelineLoading =
						false;


					this.cdr
						.detectChanges();
				})
			)
			.subscribe({

				next: response => {

					this.overview =
						response.data;
				},


				error: (
					err: any
				) => {

					console.error(
						err
					);


					this.error =
						err?.error
							?.message ||
						'Failed to load agreement overview.';
				},
			});
	}


	// =========================================================================
	// Navigation
	// =========================================================================

	openAgreement(
		id: number
	): void {

		this.router.navigate([
			'/agreements',
			id,
		]);
	}


	openManagement(): void {

		this.router.navigate([
			'/agreements',
		]);
	}


	openManagementPreset(
		filter:
			AgreementDashboardDrilldownFilter
	): void {

		this.router.navigate(
			[
				'/agreements',
			],
			{
				queryParams: {
					dashboard_filter:
						filter,
				},
			}
		);
	}


	// =========================================================================
	// Summary
	// =========================================================================

	expiringSoonCount(): number {

		return (
			this.overview
				?.summary
				.expiring_within_90_days ??
			0
		);
	}


	expiredCount(): number {

		if (!this.overview) {
			return 0;
		}


		const storedExpired =
			this.statusCount(
				'EXPIRED'
			);


		return (
			storedExpired +
			this.overview
				.summary
				.overdue_unclosed
		);
	}


	statusCount(
		code: string
	): number {

		return (
			this.overview
				?.status_distribution
				.find(
					item =>
						item.code ===
							code
				)
				?.count ??
			0
		);
	}


	expiryBucketCount(
		bucket:
			ExpiryBucket
	): number {

		if (!this.overview) {
			return 0;
		}


		const summary =
			this.overview.summary;


		switch (bucket) {

			case 'expired':

				return this
					.expiredCount();


			case '0_30':

				return (
					summary
						.expiring_within_30_days
				);


			case '31_60':

				return Math.max(
					0,

					summary
						.expiring_within_60_days -
					summary
						.expiring_within_30_days
				);


			case '61_90':

				return Math.max(
					0,

					summary
						.expiring_within_90_days -
					summary
						.expiring_within_60_days
				);


			case '91_180':

				return this
					.timelineViewModels
					.filter(
						item => {

							const days =
								item
									.days_until_expiry;

							return (
								days !== null &&
								days !== undefined &&
								days >= 91 &&
								days <= 180
							);
						}
					)
					.length;


			case '181_365':

				return this
					.timelineViewModels
					.filter(
						item => {

							const days =
								item
									.days_until_expiry;

							return (
								days !== null &&
								days !== undefined &&
								days >= 181 &&
								days <= 365
							);
						}
					)
					.length;


			case 'no_expiry':

				return (
					summary
						.without_expiry_date
				);
		}
	}


	// =========================================================================
	// Backend timeline -> frontend view model
	// =========================================================================

	private get timelineViewModels():
		AgreementTimelineVm[] {

		const rows =
			this.overview
				?.expiry_timeline
				?.agreements ??
			[];


		return rows.map(
			row =>
				this.mapTimelineRow(
					row
				)
		);
	}


	private mapTimelineRow(
		row:
			AgreementDashboardAgreement
	): AgreementTimelineVm {

		const counterparty =
			row.counterparty
				?.trading_name ||
			row.counterparty
				?.legal_name ||
			null;


		return {

			id:
				row.id,


			agreement_no:
				row.agreement_no,

			title:
				row.title,


			status_code:
				row.status
					?.code ||
				'UNKNOWN',

			status_name:
				row.status
					?.name ||
				'Unknown',


			counterparty,


			department:
				row.department
					?.name ??
				null,


			owner:
				row.owner
					?.name ??
				null,


			effective_date:
				row.effective_date ??
				null,


			timeline_start_date:
				row.timeline_start_date ??
				null,


			expiry_date:
				row.expiry_date ??
				null,


			days_until_expiry:
				row.days_to_expiry ??
				null,


			auto_renewal:
				row.auto_renewal,


			contract_value:
				row.contract_value ??
				null,


			currency_code:
				row.currency_code ??
				null,
		};
	}


	get upcomingExpiries():
		AgreementTimelineVm[] {

		return this
			.timelineViewModels
			.filter(
				item => {

					const days =
						item
							.days_until_expiry;

					return (
						days !== null &&
						days !== undefined &&
						days >= 0
					);
				}
			)
			.sort(
				(a, b) =>

					(
						a.days_until_expiry ??
						Number.MAX_SAFE_INTEGER
					) -

					(
						b.days_until_expiry ??
						Number.MAX_SAFE_INTEGER
					)
			)
			.slice(
				0,
				10
			);
	}


	// =========================================================================
	// Timeline range
	// =========================================================================

	setTimelineRange(
		range:
			TimelineRange
	): void {

		if (
			this.timelineRange ===
			range
		) {
			return;
		}


		this.timelineRange =
			range;


		/*
		 * Standard 3 / 6 / 12 month views are
		 * already contained in the standard
		 * twelve-month API response.
		 *
		 * All requires a new backend request.
		 */
		if (
			range ===
			'all'
		) {

			this.load(
				false
			);
		}
	}


	get timelineDisplayMonths():
		number {

		if (
			this.timelineRange !==
			'all'
		) {

			return this
				.timelineRange;
		}


		const start =
			this.timelineStartDate();


		const expiryDates =
			this.timelineViewModels
				.map(
					item =>
						this.parseDate(
							item.expiry_date
						)
				)
				.filter(
					(
						date
					): date is Date =>
						date !== null
				);


		/*
		 * All mode with only No Expiry
		 * agreements still displays a
		 * reasonable twelve-month grid.
		 */
		if (
			!expiryDates.length
		) {
			return 12;
		}


		const latest =
			new Date(
				Math.max(
					...expiryDates.map(
						date =>
							date.getTime()
					)
				)
			);


		const monthDifference =
			(
				latest.getFullYear() -
				start.getFullYear()
			) *
			12 +
			(
				latest.getMonth() -
				start.getMonth()
			) +
			1;


		return Math.max(
			12,
			monthDifference
		);
	}


	get timelineGridTemplate():
		string {

		return (
			`repeat(` +
			`${this.timelineDisplayMonths}, ` +
			`minmax(0, 1fr))`
		);
	}


	get timelineMonthLabels():
		string[] {

		const start =
			this.timelineStartDate();


		const formatter =
			new Intl.DateTimeFormat(
				'en-MY',
				{
					month:
						'short',

					year:
						'numeric',
				}
			);


		return Array.from(
			{
				length:
					this.timelineDisplayMonths,
			},

			(
				_,
				index
			) => {

				const date =
					new Date(
						start.getFullYear(),
						start.getMonth() +
							index,
						1,
						12,
						0,
						0,
						0
					);


				return formatter
					.format(
						date
					);
			}
		);
	}


	get visibleTimeline():
		AgreementTimelineVm[] {

		const start =
			this.timelineStartDate();


		const rows =
			this.timelineViewModels
				.filter(
					item => {

						const expiry =
							this.parseDate(
								item.expiry_date
							);


						/*
						 * No Expiry agreements are
						 * displayed separately.
						 */
						if (!expiry) {
							return false;
						}


						return (
							expiry.getTime() >=
								start.getTime()
						);
					}
				);


		if (
			this.timelineRange ===
			'all'
		) {

			return rows;
		}


		const end =
			this.timelineEndDate();


		return rows.filter(
			item => {

				const expiry =
					this.parseDate(
						item.expiry_date
					);


				return (
					expiry !== null &&
					expiry.getTime() <=
						end.getTime()
				);
			}
		);
	}


	get noExpiryTimeline():
		AgreementTimelineVm[] {

		if (
			this.timelineRange !==
			'all'
		) {
			return [];
		}


		return this
			.timelineViewModels
			.filter(
				item =>
					!item.expiry_date
			);
	}


	get timelineMinWidthPx():
		number {

		const monthWidth =
			145;


		const graphWidth =
			Math.max(
				720,

				this.timelineDisplayMonths *
					monthWidth
			);


		/*
		 * 280px = sticky agreement details.
		 */
		return (
			280 +
			graphWidth
		);
	}


	// =========================================================================
	// Timeline geometry
	// =========================================================================

	timelineLeft(
		item:
			AgreementTimelineVm
	): number {

		const timelineStart =
			this.timelineStartDate();


		const suppliedStart =
			this.parseDate(
				item.timeline_start_date
			);


		const agreementStart =
			this.parseDate(
				item.effective_date
			);


		const start =
			suppliedStart ||
			agreementStart ||
			timelineStart;


		const actualStart =
			start.getTime() >
			timelineStart.getTime()
				? start
				: timelineStart;


		return this
			.timelinePosition(
				actualStart
			);
	}


	timelineWidth(
		item:
			AgreementTimelineVm
	): number {

		const expiry =
			this.parseDate(
				item.expiry_date
			);


		if (!expiry) {
			return 0;
		}


		const left =
			this.timelineLeft(
				item
			);


		const right =
			this.timelinePosition(
				expiry
			);


		/*
		 * Keep very short agreement
		 * ranges visible.
		 */
		return Math.max(
			1.25,
			right - left
		);
	}


	todayPosition():
		number {

		return this
			.timelinePosition(
				this.asOfDate()
			);
	}


	private timelinePosition(
		date: Date
	): number {

		const start =
			this.timelineStartDate();


		const end =
			this.timelineEndDate();


		const total =
			end.getTime() -
			start.getTime();


		if (
			total <= 0
		) {
			return 0;
		}


		const position =
			(
				(
					date.getTime() -
						start.getTime()
				) /
				total
			) *
			100;


		return this.clamp(
			position,
			0,
			100
		);
	}


	private timelineStartDate():
		Date {

		const base =
			this.asOfDate();


		return new Date(
			base.getFullYear(),
			base.getMonth(),
			1,
			12,
			0,
			0,
			0
		);
	}


	private timelineEndDate():
		Date {

		const start =
			this.timelineStartDate();


		return new Date(
			start.getFullYear(),
			start.getMonth() +
				this.timelineDisplayMonths,
			0,
			23,
			59,
			59,
			999
		);
	}


	private asOfDate():
		Date {

		const parsed =
			this.parseDate(
				this.overview
					?.scope
					?.as_of_date
			);


		return (
			parsed ||
			new Date()
		);
	}


	private clamp(
		value: number,
		minimum: number,
		maximum: number
	): number {

		return Math.min(
			maximum,

			Math.max(
				minimum,
				value
			)
		);
	}


	// =========================================================================
	// Timeline appearance
	// =========================================================================

	timelineBarClass(
		item:
			AgreementTimelineVm
	): string {

		const days =
			item
				.days_until_expiry;


		if (
			days !== null &&
			days !== undefined
		) {

			if (
				days <= 30
			) {
				return (
					'timeline-bar-danger'
				);
			}


			if (
				days <= 90
			) {
				return (
					'timeline-bar-warning'
				);
			}
		}


		return (
			'timeline-bar-success'
		);
	}


	timelineTooltip(
		item:
			AgreementTimelineVm
	): string {

		const parts = [

			item.agreement_no,

			item.title,

			`Status: ${
				item.status_name
			}`,

			`Effective: ${
				this.formatDate(
					item.effective_date
				)
			}`,

			`Expiry: ${
				this.formatDate(
					item.expiry_date
				)
			}`,

			`Remaining: ${
				this.daysRemainingLabel(
					item
				)
			}`,
		];


		if (
			item.counterparty
		) {

			parts.push(
				`Counterparty: ${
					item.counterparty
				}`
			);
		}


		return parts.join(
			'\n'
		);
	}


	// =========================================================================
	// Status
	// =========================================================================

	statusBadgeClass(
		code?:
			string |
			null
	): string {

		switch (
			String(
				code ??
					''
			)
				.trim()
				.toUpperCase()
		) {

			case 'ACTIVE':

				return 'bg-success';


			case 'APPROVED':

				return (
					'bg-info text-dark'
				);


			case 'UNDER_REVIEW':
			case 'PENDING_APPROVAL':

				return 'bg-primary';


			case 'EXPIRING_SOON':

				return (
					'bg-warning text-dark'
				);


			case 'EXPIRED':
			case 'TERMINATED':

				return 'bg-danger';


			case 'ARCHIVED':
			case 'CANCELLED':
			case 'RENEWED':

				return 'bg-secondary';


			default:

				return (
					'bg-light text-dark border'
				);
		}
	}


	daysRemainingLabel(
		item:
			AgreementTimelineVm
	): string {

		const days =
			item
				.days_until_expiry;


		if (
			days === null ||
			days === undefined
		) {

			return (
				'No expiry date'
			);
		}


		if (
			days < 0
		) {

			const overdue =
				Math.abs(
					days
				);


			return (
				`${overdue} ` +
				`day${
					overdue === 1
						? ''
						: 's'
				} expired`
			);
		}


		if (
			days === 0
		) {

			return (
				'Expires today'
			);
		}


		if (
			days === 1
		) {

			return (
				'1 day remaining'
			);
		}


		return (
			`${days} days remaining`
		);
	}


	daysRemainingClass(
		item:
			AgreementTimelineVm
	): string {

		const days =
			item
				.days_until_expiry;


		if (
			days === null ||
			days === undefined
		) {

			return 'text-muted';
		}


		if (
			days <= 30
		) {

			return (
				'text-danger fw-semibold'
			);
		}


		if (
			days <= 90
		) {

			return (
				'text-warning-emphasis fw-semibold'
			);
		}


		return 'text-muted';
	}


	// =========================================================================
	// Formatting
	// =========================================================================

	formatDate(
		value?:
			string |
			null
	): string {

		const date =
			this.parseDate(
				value
			);


		if (!date) {
			return '—';
		}


		return new Intl
			.DateTimeFormat(
				'en-MY',
				{
					day:
						'2-digit',

					month:
						'short',

					year:
						'numeric',
				}
			)
			.format(
				date
			);
	}


	formatDateShort(
		value?:
			string |
			null
	): string {

		const date =
			this.parseDate(
				value
			);


		if (!date) {
			return '—';
		}


		return new Intl
			.DateTimeFormat(
				'en-MY',
				{
					day:
						'2-digit',

					month:
						'short',
				}
			)
			.format(
				date
			);
	}


	private parseDate(
		value?:
			string |
			null
	): Date | null {

		if (!value) {
			return null;
		}


		const match =
			String(
				value
			)
				.slice(
					0,
					10
				)
				.match(
					/^(\d{4})-(\d{2})-(\d{2})$/
				);


		if (match) {

			return new Date(
				Number(
					match[1]
				),

				Number(
					match[2]
				) - 1,

				Number(
					match[3]
				),

				12,
				0,
				0,
				0
			);
		}


		const parsed =
			new Date(
				value
			);


		return Number.isNaN(
			parsed.getTime()
		)
			? null
			: parsed;
	}
}