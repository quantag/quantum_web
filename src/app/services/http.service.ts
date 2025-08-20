import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IAlgorithmInterface } from '../interfaces/IAlgoritm.interface';
import { Observable } from 'rxjs';
import { IUserContact } from '../interfaces/userData.interface';

@Injectable({
    providedIn: 'root'
})
export class HttpService {
    private _baseUrl: string = 'https://quantum.quantag-it.com/';
    
    constructor(private httpClient: HttpClient) {}

    public sendQasmCode(code: string,version:string):any {
        const base64Code = btoa(code);
        const payload = {
            version,
            code:base64Code 
        }
        return this.httpClient.post(this._baseUrl+'qapi2/render_base64', payload);
    }

    public getAlgoritms():Observable<{algos:IAlgorithmInterface[]}> {
        return this.httpClient.get<{algos:IAlgorithmInterface[]}>(this._baseUrl+'qapi/algos');
    }

    public sendUserContact(userContact:IUserContact):Observable<any> {
        return this.httpClient.post(this._baseUrl+'/api3/storeContact', userContact);
    }
}
