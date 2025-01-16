import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Service pour interagir avec les API DSpace.
 */
@Injectable({
  providedIn: 'root'
})
export class DSpaceService {

  constructor(private http: HttpClient) { }

  /**
   * Récupère une liste de personnes correspondant à une requête de recherche.
   * @param query Chaîne de recherche.
   * @returns Observable contenant les résultats de la recherche.
   */
  getPersonnes(query: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/eperson/epersons/search?query=${query}`);
  }

  /**
   * Récupère les items associés à un utilisateur spécifique.
   * @param userId Identifiant de l'utilisateur.
   * @returns Observable contenant la liste des items de l'utilisateur.
   */
  getUserItems(userId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/eperson/items?userId=${userId}`);
  }

  /**
   * Récupère les détails d'un item spécifique.
   * @param itemId Identifiant de l'item.
   * @returns Observable contenant les détails de l'item.
   */
  getItemDetails(itemId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/eperson/item/details?itemId=${itemId}`);
  }

  /**
   * Récupère la liste des collections disponibles.
   * @returns Observable contenant la liste des collections.
   */
  getCollections(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/collections`);
  }

  /**
   * Récupère les items en workflow via un flux d'événements.
   * @returns Observable émettant les données des items en workflow.
   */
  getWorkflowItemsStream(): Observable<any> {
    return new Observable(observer => {
      const eventSource = new EventSource(`${environment.apiUrl}/rapports/workflowitems`);

      eventSource.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          observer.next(data);
        } catch (error) {
          observer.error(error);
        }
      };

      eventSource.onerror = error => {
        observer.error(error);
        eventSource.close();
      };

      return () => {
        eventSource.close();
      };
    });
  }

  /**
   * Récupère le nom d'une collection mappée à partir d'un identifiant d'item.
   * @param itemId Identifiant de l'item.
   * @returns Observable contenant le nom de la collection ou une chaîne vide si non trouvé.
   */
  getMappedCollection(itemId: string): Observable<string> {
    return this.http.get<any>(`${environment.apiUrl}/items?query=${itemId}`).pipe(
      map(response => {
        if (response?.name) {
          return response.name;
        } else {
          console.warn('Propriété name non trouvée dans la réponse.');
          return '';
        }
      })
    );
  }

  /**
   * Récupère le nom d'une collection à partir de son UUID.
   * @param uuid UUID de la collection.
   * @returns Observable contenant le nom de la collection ou une chaîne vide si non trouvé.
   */
  getNameCollectionById(uuid: string): Observable<string> {
    return this.http.get<any>(`${environment.apiUrl}/collections/${uuid}`).pipe(
      map((response) => {
        if (response) {
          return response;
        }
        console.warn(`Aucun nom trouvé pour la collection avec UUID: ${uuid}`);
        return '';
      })
    );
  }

  /**
   * Récupère les statistiques du système.
   * @returns Observable contenant les données statistiques.
   */
  getStatistics(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/home/statistics`);
  }

}
