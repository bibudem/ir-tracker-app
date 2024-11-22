import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {map} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class DSpaceService {

  // Remplacez l'URL par l'URL de votre backend Node.js
  private apiUrl = 'http://localhost:3100';

  constructor(private http: HttpClient) { }

  // Fonction pour récupérer les collections à partir du backend Node.js
  getCollections(): Observable<any> {
    return this.http.get<any>(this.apiUrl+'/collections');
  }

  getAuthor(query: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/discover/objects?query=${query}`);
  }

  getMappedCollections(itemId: string): Observable<string[]> {
    return this.http.get<any>(`${this.apiUrl}/items?query=${itemId}`).pipe(
      map(response => response._embedded.mappedCollections.map(collection => collection.name))
    );
  }

}
