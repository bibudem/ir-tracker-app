import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
   * @param query Object contenant les critères de recherche (nom, prenom, email).
   * @returns Observable contenant les résultats de la recherche.
   */
  getPersonnes(query: { email: string; nom: string; prenom: string }): Observable<any> {
    let params = new HttpParams();

    if (query.email) {
      params = params.set('email', query.email);
    }
    if (query.nom) {
      params = params.set('nom', query.nom);
    }
    if (query.prenom) {
      params = params.set('prenom', query.prenom);
    }

    return this.http.get<any>(`${environment.apiUrl}/eperson/epersons/search`, { params: params });
  }

  /**
   * Récupère les items associés à un utilisateur spécifique.
   * @param userId Identifiant de l'utilisateur.
   * @returns Observable contenant la liste des items de l'utilisateur.
   */
  getUserItems(userId: string, fullName: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/eperson/items?userId=${userId}&fullName=${fullName}`);
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
   * Récupère la liste des items selon un index author
   */
  getItemsByIndex(indexQuery: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/discover/objects/?query=${indexQuery}`);
  }

  /**
   * Récupère les items en workflow via un flux d'événements.
   * @returns Observable émettant les données des items en workflow.
   */
  getWorkflowItemsStream(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/rapports/itemsRapport`);
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


  getFilteredItems(params: any): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/rapports/itemsRapport`, { params });
  }

  /**
   * Récupère la liste des administrateurs d'une collection spécifique
   * @param collectionId ID de la collection
   * @returns Liste des groupes administrateurs
   */
  getCollectionAdmins(collectionId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/collections/groups/${collectionId}`);
  }


}
