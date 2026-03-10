import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';

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
        path: 'labs/circuit-optimizer',
        loadComponent: () => import('./pages/labs/pages/circuit-optimizer/circuit-optimizer.component').then(m => m.CircuitOptimizerComponent)
    },
    {
        path: 'labs/envi-visualizer',
        loadComponent: () => import('./pages/labs/pages/envi-visualizer/envi-visualizer.component').then(m => m.EnviVisualizerComponent)
    },
    {
        path: 'labs',
        loadComponent: () => import('./pages/labs/labs.component').then(m => m.LabsComponent),
        pathMatch: 'full'
    },
    {
        path: 'admin',
        loadComponent: () => import('./pages/admin/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'admin/dashboard',
        loadComponent: () => import('./pages/admin/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [adminGuard]
    },
    {
        path: '**',
        redirectTo: ''
    }
];
