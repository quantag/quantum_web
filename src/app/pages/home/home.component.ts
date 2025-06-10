import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ButtonComponent } from '../../components/button/button.component';
import { PlanCardComponent } from '../../components/plan-card/plan-card.component';
import { IPlan } from '../../interfaces/plan.interface';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [CommonModule, ButtonComponent, PlanCardComponent],
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
      title: 'Over 25 <br> different IDEs',
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
      image: 'assets/images/sample-1.png',
      title: 'OpenQASM Code <br> In Disassemply View ',
      active: true
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
    {
      image: 'assets/images/sample-5.png',
      title: 'Circuit Rendering',
      active: false
    }
  ];

  public partners = [
    {logo: 'assets/images/IBM-logo.svg', name: 'IBM'},
    {logo: 'assets/images/microsoft-logo.svg', name: 'Microsoft'},
    {logo: 'assets/images/nvidia-logo.svg', name: 'NVIDIA'},
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
      price: 421, // 39 * 12 * 0.9 = 421.2 rounded to 421
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
      price: 1609, // 149 * 12 * 0.9 = 1609.2 rounded to 1609
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
      price: 5389, // 499 * 12 * 0.9 = 5389.2 rounded to 5389
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

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.startAutoScroll();
    this.activePlans = this.monthlyPlans;
  }

  ngOnDestroy(): void {
    this.stopAutoScroll();
  }

  private startAutoScroll(): void {
    this.timer = setInterval(() => {
      this.nextSlide();
    }, this.interval);
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
    
    setTimeout(() => {
      this.samplesHighlightOpacity = 1;
    }, 500);
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
    const link = 'https://marketplace.visualstudio.com/items?itemName=QuantagITSolutionsGmbH.openqasm-debug';
    window.open(link, '_blank');
  }

  private nextSlide(): void {
    const nextIndex = (this.currentIndex + 1) % this.slides.length;
    this.goToSlide(nextIndex);
  }
}
