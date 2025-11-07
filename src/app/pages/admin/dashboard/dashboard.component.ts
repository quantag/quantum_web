import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface Endpoint {
  name: string;
  url: string;
  status?: 'checking' | 'success' | 'error';
  statusCode?: number;
  message?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  endpoints: Endpoint[] = [];

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if authenticated
    if (!localStorage.getItem('adminAuth')) {
      this.router.navigate(['/admin']);
      return;
    }

    // Load endpoints from JSON
    this.http.get<Endpoint[]>('/assets/endpoints.json').subscribe({
      next: (data) => {
        this.endpoints = data;
      },
      error: (error) => {
        console.error('Failed to load endpoints:', error);
      }
    });
  }

  checkEndpoint(endpoint: Endpoint): void {
    endpoint.status = 'checking';
    endpoint.statusCode = undefined;
    endpoint.message = undefined;

    this.http.get<any>(endpoint.url).subscribe({
      next: (response) => {
        console.log(response);
        endpoint.status = response.status === 0 ? 'success' : 'error';
        endpoint.statusCode = response.status;
        endpoint.message = response.status === 0 ? 'Endpoint is healthy' : `Status: ${response.status}`;
      },
      error: (error) => {
        endpoint.status = 'error';
        endpoint.statusCode = error.status;
        endpoint.message = error.message || 'Request failed';
      }
    });
  }

  checkAllEndpoints(): void {
    this.endpoints.forEach(endpoint => this.checkEndpoint(endpoint));
  }

  logout(): void {
    localStorage.removeItem('adminAuth');
    this.router.navigate(['/admin']);
  }
}
