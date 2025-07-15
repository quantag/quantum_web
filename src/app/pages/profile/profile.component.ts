import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GoogleAuthService } from '../../services/google-auth.service';
import { UserService } from '../../services/user.service';
import { IGoogleUser } from '../../interfaces/googleUser.interface';
import { IApiUser } from '../../interfaces/apiUser.interface';
import { IJob } from '../../interfaces/job.interface';
import { ProviderService } from '../../services/provider.service';
import { IProvider } from '../../interfaces/provider.interface';

@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit, OnDestroy {
  googleUser: IGoogleUser | null = null;
  apiUser: IApiUser | null = null;
  jobs: IJob[] = [];
  providers: IProvider[] = [];
  isLoadingApiUser = false;
  isLoadingJobs = false;
  private userSubscription: Subscription = new Subscription();

  constructor(
    private googleAuthService: GoogleAuthService,
    private userService: UserService,
    private providerService: ProviderService
  ) {}

  ngOnInit(): void {
    // Load providers once on initialization
    this.loadProviders();
    
    // Subscribe to Google user changes
    this.userSubscription = this.googleAuthService.user$.subscribe(user => {
      this.googleUser = user;
      if (user) {
        this.loadApiUserData(user.id);
        this.loadUserJobs(user.id);
      } else {
        this.apiUser = null;
        this.jobs = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
  }

  private loadApiUserData(googleId: string): void {
    this.isLoadingApiUser = true;
    this.userService.getUserData(googleId).subscribe({
      next: (apiUser) => {
        // Override first and last name with Google data if available
        this.apiUser = {
          ...apiUser,
          firstname: this.googleUser?.given_name || apiUser.firstname,
          lastname: this.googleUser?.family_name || apiUser.lastname
        };
        this.isLoadingApiUser = false;
      },
      error: (error) => {
        console.error('Error loading API user data:', error);
        this.isLoadingApiUser = false;
      }
    });
  }

  private loadUserJobs(userId: string): void {
    this.isLoadingJobs = true;
    this.userService.getUserJobs(userId).subscribe({
      next: (jobs) => {
        this.jobs = jobs;
        this.isLoadingJobs = false;
      },
      error: (error) => {
        console.error('Error loading user jobs:', error);
        this.isLoadingJobs = false;
      }
    });
  }

  private loadProviders(): void {
    this.providerService.getProviders().subscribe({
      next: (providers) => {
        this.providers = providers;
      },
      error: (error) => {
        console.error('Error loading providers:', error);
        this.providers = []; // Set empty array on error
      }
    });
  }

  getFullName(): string {
    if (this.googleUser) {
      return `${this.googleUser.given_name} ${this.googleUser.family_name}`;
    }
    return 'N/A';
  }

  formatBalance(): string {
    if (this.apiUser?.balance !== null && this.apiUser?.balance !== undefined) {
      return `$${this.apiUser.balance.toFixed(2)}`;
    }
    return 'N/A';
  }

  formatJobTime(time: string | null): string {
    if (!time) return 'N/A';
    return new Date(time).toLocaleString();
  }

  getProviderName(providerId: string): string {
    const provider = this.providers.find(p => p.uid === providerId);
    return provider ? provider.name : 'Unknown';
  }

  getJobStatusClass(status: number): string {
    switch (status) {
      case 1: return 'status--completed';
      case 0: return 'status--pending';
      case -1: return 'status--failed';
      default: return 'status--unknown';
    }
  }

  truncateText(text: string | null, maxLength: number = 50): string {
    if (!text) return 'N/A';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  trackByJobId(index: number, job: IJob): string {
    return job.job_id || index.toString();
  }
}
