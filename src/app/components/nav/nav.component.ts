import { AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent } from '../button/button.component';
import { Observable } from 'rxjs';
import { GoogleUser, GoogleAuthService } from '../../services/google-auth.service';

@Component({
  selector: 'app-nav',
  imports: [RouterModule, ButtonComponent],
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements OnInit, AfterViewInit {
  // Add mobile menu state
  isMobileMenuOpen = false;
  @ViewChild('googleButton', { static: false }) googleButton!: ElementRef;
  user$: Observable<GoogleUser | null>;
  isLogin: boolean = false;

  constructor(
    private googleAuthService: GoogleAuthService,
    private router: Router
  ) {
    this.user$ = this.googleAuthService.user$;
  }

  ngOnInit(): void {
    this.user$.subscribe(user => {
      this.isLogin = user !== null;
      console.log('User status:', this.isLogin ? 'Logged in' : 'Not logged in');
    });
  }

  ngAfterViewInit(): void {
    if (this.googleButton) {
      this.googleAuthService.renderButton(this.googleButton.nativeElement);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const menu = document.querySelector('.navigation__hamburger');
    const isMenuOpen = this.isMobileMenuOpen && menu?.contains(target);
    const isHamburger = target.classList.contains('navigation__hamburger') || target.closest('.navigation__hamburger') !== null;

    if (!isMenuOpen && !isHamburger) {
      this.closeMobileMenu();
    }
  }

  signIn(): void {
    this.googleAuthService.signIn();
  }

  openProfile(): void {
  }

  signOut(): void {
    this.googleAuthService.signOut();
    this.router.navigate(['/']);
  }

  // Toggle mobile menu
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  // Close mobile menu (called when link is clicked)
  closeMobileMenu(): void {
    if (this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
    }
  }
}
