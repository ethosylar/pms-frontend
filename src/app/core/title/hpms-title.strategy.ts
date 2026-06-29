import { Injectable } from '@angular/core';
import {
	RouterStateSnapshot,
	TitleStrategy
} from '@angular/router';
import { Title } from '@angular/platform-browser';

@Injectable()
export class HpmsTitleStrategy extends TitleStrategy {
	constructor(private title: Title) {
		super();
	}
	
	override updateTitle(snapshot: RouterStateSnapshot): void {
		const routeTitle = this.buildTitle(snapshot);
		const fallbackTitle = this.titleFromUrl(snapshot.url);
		
		this.title.setTitle(`HPMS - ${routeTitle || fallbackTitle || 'Dashboard'}`);
	}
	
	private titleFromUrl(url: string): string {
		const cleanUrl = url.split('?')[0].split('#')[0];
		const segments = cleanUrl
		.split('/')
		.filter(Boolean)
		.filter(x => !/^\d+$/.test(x));
		
		if (!segments.length) return 'Dashboard';
		
		const last = segments[segments.length - 1];
		
		return last
		.split('-')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
	}
}