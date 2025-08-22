import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { IAlgorithmInterface } from '../../../../interfaces/IAlgoritm.interface';
import { ICircuit } from '../../../../interfaces/qasm.interface';
import { HttpService } from '../../../../services/http.service';
import { MatFormField, MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../../services/seo.service';
import { ThemeService } from '../../../../services/theme.service';

declare var QuantumCircuit: any;

@Component({
    selector: 'app-qedit',
    templateUrl: './qedit.component.html',
    styleUrls: ['./qedit.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, MonacoEditorModule, MatFormField, MatListModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule, MatSelectModule, RouterLink]
})
export class QeditComponent implements OnInit, OnDestroy {
    public editorOptions = {language: 'qasm3', theme: 'vs', minimap: {enabled: false}};
    public loading: boolean = false;
    public algorithms: IAlgorithmInterface[] = [];
    public code: string = '';
    public version: string = '';
    public circuit: ICircuit;

    public status: string | null = null;
    public errorMsg: string | null = null;
    public image: any;
    private themeSubscription?: Subscription;
    
    get statusText(): string {
        if (this.status === '0') {
            return 'Successfully parsed';
        }
        if(this.errorMsg) {
            return this.errorMsg;
        }

        if (this.status === '2') {
            return 'OpenQASM3 syntaxis error';
        }
        return 'Unexpected error, please try later';
    }

    constructor(
        private httpService: HttpService,
        private seoService: SeoService,
        private themeService: ThemeService
    ) {}

    ngOnInit(): void {
        this.seoService.updateSeoTags(this.seoService.getSeoData('qedit'));
        this.httpService.getAlgoritms().subscribe((data: any) => {
            this.algorithms = data.algos;
        });

        this.themeSubscription = this.themeService.isDarkMode$.subscribe(isDark => {
            this.editorOptions = {
                ...this.editorOptions,
                theme: isDark ? 'vs-dark' : 'vs'
            };
        });
    }

    ngOnDestroy(): void {
        this.themeSubscription?.unsubscribe();
    }

    public sendCode(): void {
        this.loading = true;
        this.httpService.sendQasmCode(this.code,this.version).pipe(
            catchError(error => {
                this.loading = false;
                this.status = error.status;
                this.errorMsg = error.error.message || null;
                throw error
            })
        ).subscribe((data: any) => {
            this.loading = false;
            this.status = data.status;
            this.errorMsg = data.msg || null;
            this.image = data.image;
        });
    }

    public selectAlgorithm(algorithm: IAlgorithmInterface): void {
        this.code = algorithm.source;
    }
}
