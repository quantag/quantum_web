import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
        pathMatch: 'full'
    },
    {
        path: 'privacy-policy',
        loadComponent: () => import('./pages/privacy/privacy.component').then(m => m.PrivacyComponent)
    },
    {
        path: 'labs/xyz',
        loadComponent: () => import('./pages/labs/pages/xyz/xyz.component').then(m => m.XyzComponent)
    },
    {
        path: 'labs/qir',
        loadComponent: () => import('./pages/labs/pages/qir/qir.component').then(m => m.QirComponent)
    },
    {
        path: 'labs/qbin',
        loadComponent: () => import('./pages/labs/pages/qbin/qbin.component').then(m => m.QbinComponent)
    },
    {
        path: 'labs/qic',
        loadComponent: () => import('./pages/labs/pages/qic/qic.component').then(m => m.QicComponent)
    },
    {
        path: 'labs/qedit',
        loadComponent: () => import('./pages/labs/pages/qedit/qedit.component').then(m => m.QeditComponent)
    },
    {
        path: 'labs/base64',
        loadComponent: () => import('./pages/labs/pages/base64/base64.component').then(m => m.Base64Component)
    },
    {
        path: 'labs/compare-sql',
        loadComponent: () => import('./pages/labs/pages/compare-sql/compare-sql.component').then(m => m.CompareSqlComponent)
    },
    {
        path: 'labs/guppy-compiler',
        loadComponent: () => import('./pages/labs/pages/guppy-compiler/guppy-compiler.component').then(m => m.GuppyCompilerComponent)
    },
    {
        path: 'labs/quantum-portfolio-optimizer',
        loadComponent: () => import('./pages/labs/pages/quantum-portfolio-optimizer/quantum-portfolio-optimizer.component').then(m => m.QuantumPortfolioOptimizerComponent)
    },
    {
        path: 'labs/script-generator',
        loadComponent: () => import('./pages/labs/pages/script-generator/script-generator.component').then(m => m.ScriptGeneratorComponent)
    },
    {
        path: 'labs',
        loadComponent: () => import('./pages/labs/labs.component').then(m => m.LabsComponent),
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: ''
    }
];
