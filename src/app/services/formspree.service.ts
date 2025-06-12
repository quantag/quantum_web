import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormspreeService {
  private readonly formEndpoint = 'https://formspree.io/f/mdkzgzwv';

  constructor(private http: HttpClient) {}

  sendMessage(formData: ContactFormData): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const payload = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      message: formData.message,
    };

    return this.http.post(this.formEndpoint, payload, { headers });
  }
}