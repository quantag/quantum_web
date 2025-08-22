import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SeoService } from '../../services/seo.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-labs',
  imports: [CommonModule, RouterLink],
  templateUrl: './labs.component.html',
  styleUrls: ['./labs.component.scss']
})
export class LabsComponent implements OnInit, OnDestroy {
  isDarkMode: boolean = false;
  private themeSubscription?: Subscription;

  constructor(
    private seoService: SeoService,
    private themeService: ThemeService
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
}
