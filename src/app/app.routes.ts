import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { PrivacyComponent } from './pages/privacy/privacy.component';
import { ProfileComponent } from './pages/profile/profile.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        pathMatch: 'full'
    },
    {
        path: 'privacy-policy',
        component: PrivacyComponent
    },
    {
        path: 'profile',
        component: ProfileComponent
    },
    {
        path: '**',
        redirectTo: ''
    }
];
