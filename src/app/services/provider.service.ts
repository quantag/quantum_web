import { Injectable } from '@angular/core';
import { IProvider } from '../interfaces/provider.interface';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { ISubscription } from '../interfaces/subscription.interface';

@Injectable({
  providedIn: 'root'
})
export class ProviderService {
  private apiBaseUrl = environment.baseUrl;

  constructor(private http: HttpClient) { }

  getProviders(): Observable<IProvider[]> {
    return this.http.get<IProvider[]>(`${this.apiBaseUrl}/providers`);
  }

  getSubscription(): Observable<ISubscription[]> {
    return this.http.get<ISubscription[]>(`${this.apiBaseUrl}/subs`);
  }

}
