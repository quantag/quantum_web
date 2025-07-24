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

  /**
   * Refresh job status
   * @param jobId Job ID
   * @param userId User ID
   * @returns Observable<void>
   */
  refreshJob(jobId: string, userId: string): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/check_job`, { job_id: jobId, user_id: userId });
  }

  /**
   * Fetch user jobs from the API
   * @param userId User ID
   * @returns Observable<IJob[]>
   */
  getUserJobs(uid: string): Observable<IJob[]> {
    // return this.http.get<IJob[]>(`${this.apiBaseUrl}/users/${uid}/jobs`);
    return this.http.get<IJob[]>(`${this.apiBaseUrl}/users/cde5e204-d172-4f0b-9e4d-7a43e3bd2d8c/jobs`);
  }

  /**
   * Remove a job from the user's job list
   * @param jobId Job ID
   * @param userId User ID
   * @returns Observable<void>
   */
  removeJob(jobId: string, userId: string): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/del_job`, { job_id: jobId, user_id: userId });
  }
}
