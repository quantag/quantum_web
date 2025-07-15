import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { IApiUser } from '../interfaces/apiUser.interface';
import { IJob } from '../interfaces/job.interface';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiBaseUrl = environment.baseUrl;

  constructor(private http: HttpClient) { }

  /**
   * Fetch user data from the API
   * @param google_id Google User ID
   * @returns Observable<IApiUser>
   */
  getUserData(google_id: string): Observable<IApiUser> {
    return this.http.post<IApiUser>(`${this.apiBaseUrl}/getuser_by_googleid`, { google_id });
  }

  /**
   * Fetch user jobs from the API
   * @param userId User ID
   * @returns Observable<IJob[]>
   */
  getUserJobs(userId: string): Observable<IJob[]> {
    // return this.http.get<IJob[]>(`${this.apiBaseUrl}/users/${userId}/jobs`);
    return this.http.get<IJob[]>(`${this.apiBaseUrl}/users/738526c5-9d29-41ba-8414-ad82dcbbcc55/jobs`);

  }

  /**
   * Update user data
   * @param userId User ID
   * @param userData Partial user data to update
   * @returns Observable<IApiUser>
   */
  updateUserData(userId: string, userData: Partial<IApiUser>): Observable<IApiUser> {
    // TODO: Implement actual API call when backend is available
    // return this.http.put<IApiUser>(`${this.apiBaseUrl}/users/${userId}`, userData);
    
    console.log('Update user data:', userData);
    return this.getUserData(userId);
  }
}
