import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ForInvestorsComponent } from './pages/for-investors/for-investors.component';
import { DocsComponent } from './pages/docs/docs.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        pathMatch: 'full'
    },
    // {
    //     path: 'for-investors',
    //     component: ForInvestorsComponent,
    // },
    // {
    //     path: 'docs',
    //     component: DocsComponent
    // },
    {
        path: '**',
        redirectTo: ''
    }
];
