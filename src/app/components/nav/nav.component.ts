import { Component, HostListener, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-nav',
  imports: [RouterModule],
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements OnInit {
  // Add mobile menu state
  isMobileMenuOpen = false;

  constructor() {}

  ngOnInit(): void {
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
