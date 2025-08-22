import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';
import { GoogleAuthService } from '../../services/google-auth.service';
import { UserService } from '../../services/user.service';
import { IGoogleUser } from '../../interfaces/googleUser.interface';
import { IApiUser } from '../../interfaces/apiUser.interface';
import { IJob } from '../../interfaces/job.interface';
import { ProviderService } from '../../services/provider.service';
import { IProvider } from '../../interfaces/provider.interface';
import { ISubscription } from '../../interfaces/subscription.interface';
import { LocalStorageService } from '../../services/local-storage.service';
import { ThemeService } from '../../services/theme.service';
import { FileManagerComponent } from '../../components/file-manager/file-manager.component';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule, FileManagerComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit, OnDestroy {
  googleUser: IGoogleUser | null = null;
  apiUser: IApiUser | null = null;
  jobs: IJob[] = [];
  sortedJobs: IJob[] = [];
  providers: IProvider[] = [];
  subscriptions: ISubscription[] = [];
  isLoadingApiUser = false;
  isLoadingJobs = false;
  
  // Sorting properties
  sortColumn: keyof IJob | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Filter properties
  filterText: string = '';
  statusFilter: string = 'all';
  providerFilter: string = 'all';
  modeFilter: string = 'all';
  
  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalItems: number = 0;
  paginatedJobs: IJob[] = [];
  
  // Theme properties
  isDarkMode: boolean = false;
  private themeSubscription?: Subscription;
  
  // Edit properties
  isEditingCompany: boolean = false;
  editCompanyValue: string = '';
  
  // Refresh properties
  refreshingJobIds: string | null = null;

  private userSubscription: Subscription = new Subscription();
  private isBrowser: boolean;

  constructor(
    private googleAuthService: GoogleAuthService,
    private userService: UserService,
    private providerService: ProviderService,
    private themeService: ThemeService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }

  ngOnInit(): void {
    // Only load providers and subscriptions in browser environment
    if (this.isBrowser) {
      this.loadProviders();
      this.loadSubscriptions();
    }
    
    // Subscribe to Google user changes
    this.userSubscription = this.googleAuthService.user$.subscribe(async user => {
      this.googleUser = user;
      if (user && this.isBrowser) {
        this.isLoadingApiUser = true;
        this.apiUser = await this.loadApiUserData(user.id, user.email);
        this.isLoadingApiUser = false;
        this.loadUserJobs(this.apiUser.uid);
      } else {
        this.apiUser = null;
        this.jobs = [];
        this.sortedJobs = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
    this.themeSubscription?.unsubscribe();
  }

  private async loadApiUserData(googleId: string, email: string): Promise<IApiUser> {
    return firstValueFrom(this.userService.getUserData(googleId, email))
  }

  private loadUserJobs(uid: string): void {
    this.isLoadingJobs = true;
    this.userService.getUserJobs(uid).subscribe({
      next: (jobs) => {
        this.jobs = jobs.length > 0 ? jobs : [];
        this.applyFiltersAndSorting();
        this.isLoadingJobs = false;
      },
      error: (error) => {
        console.error('Error loading user jobs:', error);
        this.applyFiltersAndSorting();
        this.isLoadingJobs = false;
      }
    });
  }

  private loadProviders(): void {
    this.providerService.getProviders().subscribe({
      next: (providers) => {
        this.providers = providers.length > 0 ? providers : [];
      },
      error: (error) => {
        console.error('Error loading providers:', error);
        // Use mock data for testing when API fails
        this.providers = [];
      }
    });
  }

  private loadSubscriptions(): void {
    this.providerService.getSubscription().subscribe({
      next: (subscriptions) => {
        this.subscriptions = subscriptions.length > 0 ? subscriptions : [];
      },
      error: (error) => {
        console.error('Error loading subscriptions:', error);
        this.subscriptions = [];
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

  getSubscriptionName(subscriptionId: string | null): string {
    if (!subscriptionId) return 'N/A';
    const subscription = this.subscriptions.find(s => s.uid === subscriptionId);
    return subscription ? subscription.name : 'Unknown';
  }

  truncateText(text: string | null, maxLength: number = 50): string {
    if (!text) return 'N/A';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  // Download methods for job input and results
  downloadJobInput(job: IJob): void {
    if (!this.isBrowser) return; // Don't run during SSR
    if (!job.input) {
      console.warn('No input data available for download');
      return;
    }
    
    const content = job.input;
    const filename = `job-${job.job_id || 'unknown'}-input.qasm`;
    this.downloadJsonFile(content, filename);
  }

  downloadJobResults(job: IJob): void {
    if (!this.isBrowser) return; // Don't run during SSR
    if (!job.results) {
      console.warn('No results data available for download');
      return;
    }
    
    const content = job.results;
    const filename = `job-${job.job_id || 'unknown'}-results.json`;
    this.downloadJsonFile(content, filename);
  }

  private downloadJsonFile(content: string, filename: string): void {
    if (!this.isBrowser) return; // Don't run during SSR
    try {
      // Parse the content to validate it's valid JSON, then stringify it nicely
      const jsonData = JSON.parse(content);
      const formattedJson = JSON.stringify(jsonData, null, 2);
      
      const blob = new Blob([formattedJson], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // If it's not valid JSON, download as plain text with .json extension
      console.warn('Content is not valid JSON, downloading as plain text:', error);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    }
  }

  trackByJobId(index: number, job: IJob): string {
    return job.job_id || index.toString();
  }

  // Sorting methods
  sortTable(column: keyof IJob): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1; // Reset to first page
    this.applyFiltersAndSorting();
  }

  // Filter methods
  applyFiltersAndSorting(): void {
    // First apply filters
    let filteredJobs = this.applyFilters();
    
    // Then apply sorting
    this.sortedJobs = this.applySortingToJobs(filteredJobs);
    
    // Update total items for pagination
    this.totalItems = this.sortedJobs.length;
    
    // Apply pagination
    this.applyPagination();
  }

  applyFilters(): IJob[] {
    return this.jobs.filter(job => {
      // Text filter (searches in job_id, input, results)
      const matchesText = !this.filterText || 
      (job.job_id?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        job.input?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        job.results?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        job.qpu?.toLowerCase().includes(this.filterText.toLowerCase()) ||
        job.instance?.toLowerCase().includes(this.filterText.toLowerCase())
      );

      // Status filter
      const matchesStatus = this.statusFilter === 'all' || 
        job.status_str?.toString() === this.statusFilter;

      // Provider filter
      const matchesProvider = this.providerFilter === 'all' || 
        job.provider_id === this.providerFilter;

      // Mode filter
      const matchesMode = this.modeFilter === 'all' || 
        job.mode === this.modeFilter;

      return matchesText && matchesStatus && matchesProvider && matchesMode;
    });
  }

  applySortingToJobs(jobs: IJob[]): IJob[] {
    if (!this.sortColumn) {
      return [...jobs];
    }

    return [...jobs].sort((a, b) => {
      const aValue = a[this.sortColumn as keyof IJob];
      const bValue = b[this.sortColumn as keyof IJob];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;

      // Special handling for different data types
      if (this.sortColumn === 'submitted_at' || this.sortColumn === 'end_time') {
        const aTime = new Date(aValue as string).getTime();
        const bTime = new Date(bValue as string).getTime();
        comparison = aTime - bTime;
      } else if (this.sortColumn === 'status') {
        comparison = (aValue as number) - (bValue as number);
      } else {
        // String comparison
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        comparison = aStr.localeCompare(bStr);
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  // Filter event handlers
  onFilterTextChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filterText = target.value;
    this.currentPage = 1; // Reset to first page
    this.applyFiltersAndSorting();
  }

  onStatusFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.statusFilter = target.value;
    this.currentPage = 1; // Reset to first page
    this.applyFiltersAndSorting();
  }

  onProviderFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.providerFilter = target.value;
    this.currentPage = 1; // Reset to first page
    this.applyFiltersAndSorting();
  }

  onModeFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.modeFilter = target.value;
    this.currentPage = 1; // Reset to first page
    this.applyFiltersAndSorting();
  }

  clearFilters(): void {
    this.filterText = '';
    this.statusFilter = 'all';
    this.providerFilter = 'all';
    this.modeFilter = 'all';
    this.currentPage = 1; // Reset to first page
    this.applyFiltersAndSorting();
  }

  getUniqueProviders(): string[] {
    const providers = [...new Set(this.jobs.map(job => job.provider_id))];
    return providers.filter(p => p !== null && p !== undefined) as string[];
  }

  getUniqueJobStatuses(): string[] {
    const statuses = [...new Set(this.jobs.map(job => job.status_str))];
    return statuses.filter(s => s !== null && s !== undefined) as string[];
  }

  getUniqueModes(): string[] {
    const modes = [...new Set(this.jobs.map(job => job.mode))];
    return modes.filter(m => m !== null && m !== undefined) as string[];
  }

  // Pagination methods
  applyPagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedJobs = this.sortedJobs.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyPagination();
  }

  onItemsPerPageChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.itemsPerPage = parseInt(target.value, 10);
    this.currentPage = 1; // Reset to first page
    this.applyPagination();
  }

  getTotalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show smart pagination with ellipsis
      if (this.currentPage <= 4) {
        // Near the beginning
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      } else if (this.currentPage >= totalPages - 3) {
        // Near the end
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      }
    }
    
    return pages;
  }

  goToFirstPage(): void {
    this.onPageChange(1);
  }

  goToLastPage(): void {
    this.onPageChange(this.getTotalPages());
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.onPageChange(this.currentPage - 1);
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.onPageChange(this.currentPage + 1);
    }
  }

  getDisplayRange(): string {
    if (this.totalItems === 0) return '0-0 of 0';
    
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
    return `${start}-${end} of ${this.totalItems}`;
  }

  // Edit methods
  startEditingCompany(): void {
    this.isEditingCompany = true;
    this.editCompanyValue = this.apiUser?.company || '';
  }

  cancelEditingCompany(): void {
    this.isEditingCompany = false;
    this.editCompanyValue = '';
  }

  saveCompany(): void {
    if (this.apiUser && this.editCompanyValue.trim() !== '') {
      // Call the user service to update the company
      this.userService.updateCompany(this.apiUser.uid, this.editCompanyValue.trim()).subscribe({
        next: (response: IApiUser) => {
          if(response) {
            this.apiUser!.company = response.company;
          }
          this.isEditingCompany = false;
          this.editCompanyValue = '';
        },
        error: (error: any) => {
          console.error('Error updating company:', error);
          // You could add a toast notification here
        }
      });
    }
  }

  getSortIcon(column: keyof IJob): string {
    if (this.sortColumn !== column) return 'sort';
    return this.sortDirection === 'asc' ? 'sort-up' : 'sort-down';
  }

  isSortedColumn(column: keyof IJob): boolean {
    return this.sortColumn === column;
  }

  // Refresh job method
  refreshJob(jobId: string): void {
    if (!jobId) {
      console.error('Job ID is required for refresh');
      return;
    }

    // Add job ID to refreshing set
    this.refreshingJobIds = jobId;

    // Call the user service to refresh/reload specific job
    this.userService.refreshJob(jobId, this.apiUser!.uid).subscribe({
      next: () => {
        // Find and update the job in the current jobs array
        this.loadUserJobs(this.apiUser!.uid);
        // Remove job ID from refreshing set
        this.refreshingJobIds = null;
      },
      error: (error: any) => {
        console.error('Error refreshing job:', error);
        // Remove job ID from refreshing set even on error
        this.refreshingJobIds = null;
        // You could add a toast notification here
      }
    });
  }

  copyToClipboard(text: string): void {
    if (!this.isBrowser) return; // Don't run during SSR
    if (!text) {
      console.error('Text is required for copying');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  }

  // Remove job method
  removeJob(jobId: string): void {
    if (!this.isBrowser) return; // Don't run during SSR
    if (!jobId) {
      console.error('Job ID is required for removal');
      return;
    }

    // Show confirmation dialog
    if (confirm(`Are you sure you want to remove ${jobId} job? This action cannot be undone.`)) {

      this.userService.removeJob(jobId, this.apiUser!.uid).subscribe({
        next: () => {
          this.loadUserJobs(this.apiUser!.uid);
        },
        error: (error: any) => {
          console.error('Error removing job from server:', error);
        }
      });
    }
  }
}
