import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ButtonComponent } from '../../components/button/button.component';
import { IPlan } from '../../interfaces/plan.interface';
import { ActivatedRoute, Router } from '@angular/router';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { FormspreeService } from '../../services/formspree.service';
import { GoogleAuthService } from '../../services/google-auth.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, ButtonComponent, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  public isMonthlyPlan = true; // Default to monthly plan
  public slides = [
    {
      image: 'assets/images/header-1.jpg',
      title: 'Unified <br> Quantum <br> Development <br> Platform',
      active: true
    },
    {
      image: 'assets/images/header-2.jpg',
      title: 'Many <br> different IDEs',
      active: false
    },
    {
      image: 'assets/images/header-3.jpg',
      title: 'Support of <br> different <br> simulators',
      active: false
    },
    {
      image: 'assets/images/header-4.jpg',
      title: 'Support of <br> different <br> hardware',
      active: false
    },
    {
      image: 'assets/images/header-5.png',
      title: 'Develop <br> quantum as <br> easy as classic <br> software',
      active: false
    }
  ];

  public sampleSlides = [
    {
      image: 'assets/images/sample-7.png',
      title: '3D circuit visualization',
      active: true
    },
    {
      image: 'assets/images/sample-1.png',
      title: 'OpenQASM Code <br> In Disassemply View ',
      active: false
    },
    {
      image: 'assets/images/sample-5.png',
      title: 'Circuit Visualization <br> In IDE',
      active: false
    },
    {
      image: 'assets/images/sample-6.png',
      title: 'Convert OpenQASM to QIR',
      active: false
    },
    {
      image: 'assets/images/sample-2.png',
      title: 'Qiskit <br> Framework Support',
      active: false
    },
    {
      image: 'assets/images/sample-3.png',
      title: 'Quantum State <br> As Local Variables',
      active: false
    },
    {
      image: 'assets/images/sample-4.png',
      title: 'pyTKET Framework <br> Support',
      active: false
    },
  ];

  public partners = [
    {
      logo: 'assets/images/IBM-logo.svg',
      name: 'IBM',
      link:'https://www.ibm.com'
    },
    {
      logo: 'assets/images/microsoft-logo.svg',
      name: 'Microsoft',
      link: 'https://www.microsoft.com/'
    },
    {
      logo: 'assets/images/qir-logo.svg',
      name: 'QIR',
      link: 'https://github.com/qir-alliance'
    }
    // {logo: 'assets/images/nvidia-logo.svg', name: 'NVIDIA'},
  ]

  public activePlans: IPlan[] = []

  public monthlyPlans: IPlan[] = [
    {
      title: 'Individual',
      price: 39,
      type: 'month',
      buttonText: 'Get 30 days free',
      features: [
        '1 license',
        'Software Based QVM (up to 20 qubits)',
        '10 min Quantum Hardware time'
      ]
    },
    {
      title: 'University',
      price: 149,
      type: 'month',
      buttonText: 'Get 30 days free',
      features: [
        '5 licenses',
        'Hardware Based QVM (up to 30 qubits)',
        '60 min Quantum hardware time'
      ]
    },
    {
      title: 'Enterprise',
      type: 'month',
      price: 499,
      buttonText: 'Get 30 days free',
      features: [
        '25 licenses',
        'Hardware Based QVM (up to 40 qubits)',
        '400 min Quantum hardware time'
      ]
    }
  ];

  public yearlyPlans: IPlan[] = [
    {
      title: 'Individual',
      price: 399, // 39 * 12 * 0.9 = 421.2 rounded to 421
      type: 'year',
      buttonText: 'Get 30 days free',
      features: [
        '1 license',
        'Software Based QVM (up to 20 qubits)',
        '10 min Quantum Hardware time'
      ]
    },
    {
      title: 'University',
      price: 1599, // 149 * 12 * 0.9 = 1609.2 rounded to 1609
      type: 'year',
      buttonText: 'Get 30 days free',
      features: [
        '5 licenses',
        'Hardware Based QVM (up to 30 qubits)',
        '60 min Quantum hardware time'
      ]
    },
    {
      title: 'Enterprise',
      type: 'year',
      price: 4999, // 499 * 12 * 0.9 = 5389.2 rounded to 5389
      buttonText: 'Get 30 days free',
      features: [
        '25 licenses',
        'Hardware Based QVM (up to 40 qubits)',
        '400 min Quantum hardware time'
      ]
    }
  ];

  private currentIndex = 0;
  private timer: any;
  private readonly interval = 5000; // 5 seconds
  public samplesHighlightOpacity = 1; // Track opacity instead of just visibility
  // Add contactForm property
  contactForm: FormGroup;
  formSubmitted = false;
  private isBrowser: boolean;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private googleAuthService: GoogleAuthService,
    private route: ActivatedRoute,
    private formspreeService: FormspreeService, // Import HttpClient for future API calls
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.handleAuthCallback();
    this.startAutoScroll();
    this.activePlans = this.monthlyPlans;

    // Initialize the contact form
    this.initContactForm();
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
  }

  // Initialize the reactive form with validation
  private initContactForm(): void {
    this.contactForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  private startAutoScroll(): void {
    if (this.isBrowser) {
      this.timer = setInterval(() => {
        this.nextSlide();
      }, this.interval);
    }
  }

  private stopAutoScroll(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  public goToSlide(index: number): void {
    // Reset auto-scroll when user interacts
    this.stopAutoScroll();
    
    // Set all slides to inactive
    this.slides.forEach(slide => slide.active = false);
    
    // Set selected slide to active
    this.slides[index].active = true;
    this.currentIndex = index;
    
    // Restart auto-scroll
    this.startAutoScroll();
  }

  public goToSampleSlide(index: number): void {
    this.sampleSlides.forEach(slide => slide.active = false);
    this.samplesHighlightOpacity = 0;
    this.sampleSlides[index].active = true;

    if (this.isBrowser) {
      setTimeout(() => {
        this.samplesHighlightOpacity = 1;
      }, 500);
    } else {
      // For SSR, set opacity immediately
      this.samplesHighlightOpacity = 1;
    }
  }
  
  public getIndicatorScale(index: number): number {
    return Math.max(0.5, 1 - (index * 0.1));
  }

  public togglePlan(monthly: boolean): void {
    this.isMonthlyPlan = monthly;
    this.activePlans = monthly ? this.monthlyPlans : this.yearlyPlans;
  }

  public goToForInvestors(): void {
    this.router.navigate(['/for-investors']);
  }

  public gotToExtension() {
    if (!this.isBrowser) return; // Don't use window during SSR
    const link = 'https://marketplace.visualstudio.com/items?itemName=QuantagITSolutionsGmbH.openqasm-debug';
    window.open(link, '_blank');
  }

  private nextSlide(): void {
    const nextIndex = (this.currentIndex + 1) % this.slides.length;
    this.goToSlide(nextIndex);
  }

  public goToNextSampleSlide(): void {
    const currentIndex = this.sampleSlides.findIndex(slide => slide.active);
    const nextIndex = (currentIndex + 1) % this.sampleSlides.length;
    this.goToSampleSlide(nextIndex);
  }

  goToPreviousSampleSlide(): void {
    const currentIndex = this.sampleSlides.findIndex(slide => slide.active);
    const previousIndex = (currentIndex - 1 + this.sampleSlides.length) % this.sampleSlides.length;
    this.goToSampleSlide(previousIndex);
  }

  // Get form controls for easy access in the template
  get f() {
    return this.contactForm.controls;
  }

  // Handle form submission
  onSubmitContactForm(): void {
    this.formSubmitted = true;
    
    // Stop if form is invalid
    if (this.contactForm.invalid) {
      return;
    }
    
    // Process the form submission
    this.formspreeService.sendMessage(this.contactForm.value).subscribe({
      next: (response) => {
          alert('Thank you for your message! We will get back to you soon.');
          this.contactForm.reset();
          this.formSubmitted = false;
      },
      error: (error) => {
        console.error('Form submission failed:', error);
        alert('There was an error submitting your message. Please try again later.');
        this.formSubmitted = false;
      }
    });
  }

  public handleAuthCallback(): void {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const error = params['error'];
      
      if (error) {
        console.error('Authentication error:', error);
        return;
      }
      
      if (code) {
        this.googleAuthService.authenticateWithCode(code).subscribe();
      }
    });
  }
}
