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
  getUserData(google_id: string, email: string): Observable<IApiUser> {
    return this.http.post<IApiUser>(`${this.apiBaseUrl}/getuser_by_googleid`, { google_id, email });
  }

  /**
   * Update user company
   * @param company Company name
   * @returns Observable<any>
   */
  updateCompany(uid:string, company: string): Observable<any> {
    return this.http.post<any>(`${this.apiBaseUrl}/update_user`, { uid, company });
  }

  refreshJob(jobId: string, userId: string): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/check_job`, { job_id: jobId, user_id: userId });
  }

  /**
   * Fetch user jobs from the API
   * @param userId User ID
   * @returns Observable<IJob[]>
   */
  getUserJobs(uid: string): Observable<IJob[]> {
    return this.http.get<IJob[]>(`${this.apiBaseUrl}/users/${uid}/jobs`);
    // return this.http.get<IJob[]>(`${this.apiBaseUrl}/users/cde5e204-d172-4f0b-9e4d-7a43e3bd2d8c/jobs`);
  }

  // /**
  //  * Update user data
  //  * @param userId User ID
  //  * @param userData Partial user data to update
  //  * @returns Observable<IApiUser>
  //  */
  // updateUserData(userId: string, userData: Partial<IApiUser>): Observable<IApiUser> {
  //   // TODO: Implement actual API call when backend is available
  //   // return this.http.put<IApiUser>(`${this.apiBaseUrl}/users/${userId}`, userData);
    
  //   console.log('Update user data:', userData);
  //   // return this.getUserData(userId, userData.email);
  // }
}
