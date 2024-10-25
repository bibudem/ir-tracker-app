import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DSpaceService {

  // Remplacez l'URL par l'URL de votre backend Node.js
  private apiUrl = 'http://localhost:3000/api/collections';

  constructor(private http: HttpClient) { }

  // Fonction pour récupérer les collections à partir du backend Node.js
  getCollections(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
