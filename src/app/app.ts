import { Component } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ApiService } from './core/services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [JsonPipe],
  template: `<h1>Angular OK</h1><pre>{{ data | json }}</pre>`,
})
export class AppComponent {
  data: any;

  constructor(api: ApiService) {
    api.health().subscribe(res => this.data = res);
  }
}
