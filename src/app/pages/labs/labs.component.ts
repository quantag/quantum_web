import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SeoService } from '../../services/seo.service';
import { ThemeService } from '../../services/theme.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-labs',
  imports: [CommonModule, MatIconModule],
  templateUrl: './labs.component.html',
  styleUrls: ['./labs.component.scss']
})
export class LabsComponent implements OnInit, OnDestroy {
  isDarkMode: boolean = false;
  private themeSubscription?: Subscription;

  constructor(
    private seoService: SeoService,
    private themeService: ThemeService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.seoService.updateSeoTags(this.seoService.getSeoData('labs'));
    
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  navigateToLab(labPath: string): void {
    this.router.navigate(['/labs', labPath]);
  }
}
