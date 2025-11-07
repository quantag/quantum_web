import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  // Hardcoded credentials
  private readonly ADMIN_USERNAME = 'admin';
  private readonly ADMIN_PASSWORD = 'Nx8265w';

  constructor(private router: Router) {}

  onLogin(): void {
    this.errorMessage = '';
    
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter username and password';
      return;
    }

    this.isLoading = true;

    // Simulate async login
    setTimeout(() => {
      if (this.username === this.ADMIN_USERNAME && this.password === this.ADMIN_PASSWORD) {
        // Store auth state
        localStorage.setItem('adminAuth', 'true');
        // Navigate to dashboard
        this.router.navigate(['/admin/dashboard']);
      } else {
        this.errorMessage = 'Invalid username or password';
      }
      this.isLoading = false;
    }, 500);
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onLogin();
    }
  }
}
