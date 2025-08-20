import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { PrivacyComponent } from './pages/privacy/privacy.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { LabsComponent } from './pages/labs/labs.component';
import { QirComponent } from './pages/labs/pages/qir/qir.component';
import { XyzComponent } from './pages/labs/pages/xyz/xyz.component';
import { QicComponent } from './pages/labs/pages/qic/qic.component';
import { QeditComponent } from './pages/labs/pages/qedit/qedit.component';
import { Base64Component } from './pages/labs/pages/base64/base64.component';
import { CompareSqlComponent } from './pages/labs/pages/compare-sql/compare-sql.component';

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
        path: 'labs',
        component: LabsComponent
    },
    {
        path: 'labs/xyz',
        component: XyzComponent
    },
    {
        path: 'labs/qir',
        component: QirComponent
    },
    {
        path: 'labs/qic',
        component: QicComponent
    },
    {
        path: 'labs/qedit',
        component: QeditComponent
    },
    {
        path: 'labs/base64',
        component: Base64Component
    },
    {
        path: 'labs/compare-sql',
        component: CompareSqlComponent
    },
    {
        path: '**',
        redirectTo: ''
    }
];
