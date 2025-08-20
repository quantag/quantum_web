import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { SeoService } from './seo.service';

@Injectable({
  providedIn: 'root'
})
export class SeoResolver implements Resolve<void> {
  constructor(private seoService: SeoService) {}

  resolve(route: ActivatedRouteSnapshot): void {
    // Extract route path
    const routePath = route.routeConfig?.path || '';
    
    // Update SEO tags based on route
    this.seoService.updateSeoTags(this.seoService.getSeoData(routePath));
  }
}
