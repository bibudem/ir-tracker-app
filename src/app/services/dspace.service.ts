import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {map} from "rxjs/operators";
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DSpaceService {

  constructor(private http: HttpClient) { }

  getPersonnes(query: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/eperson/epersons/search?query=${query}`);
  }

  getUserItems(userId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/eperson/items?userId=${userId}`);
  }

  getItemDetails(itemId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/eperson/item/details?itemId=${itemId}`);
  }

  // Fonction pour récupérer les collections à partir du backend Node.js
  getCollections(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/collections`);
  }

  // Fonction pour récupérer les collections à partir du backend Node.js
  getWorkflowItems(page: number = 1, size: number = 20): Observable<any> {
    return this.http.get(`${environment.apiUrl}/rapports/workflowitems?page=${page}&size=${size}`);
  }

  getMappedCollection(itemId: string): Observable<string> {
    return this.http.get<any>(`${environment.apiUrl}/items?query=${itemId}`).pipe(
      map(response => {
        //console.log('Réponse du serveur :', response);
        if (response?.name) {
          return response.name; // Retourne le nom de la collection
        } else {
          console.warn('Propriété name non trouvée dans la réponse.');
          return '';
        }
      })
    );
  }


}
