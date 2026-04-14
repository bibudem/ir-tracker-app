import { Injectable } from '@angular/core';
import {DSpaceService} from '../services/dspace.service';  // Assurez-vous que vous avez ce service ou ajustez selon le cas.
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CollectionData {
  private collectionNames: { [key: string]: string } = {};

  constructor(private dspaceService: DSpaceService) {}

  /**
   * Obtenir le nom de la collection associée à un item.
   * @param itemId - L'identifiant de l'item.
   * @param collectionId - L'identifiant de la collection.
   * @returns Observable contenant le nom de la collection.
   */
  getNameCollection(itemId: string, collectionId: string): Observable<string> {
    if (!itemId) {
      throw new Error('itemId est requis');
    }

    return new Observable((observer) => {
      if (collectionId) {
        this.dspaceService.getNameCollectionById(collectionId).subscribe({
          next: (name) => {
            if (name) {
              this.collectionNames[itemId] = name;
              observer.next(name);
            } else {
              console.warn(`Aucun nom trouvé pour la collection UUID: ${collectionId}`);
              observer.error(`Aucun nom trouvé pour la collection UUID: ${collectionId}`);
            }
          },
          error: (err) => {
            console.error('Erreur lors de la récupération du nom de la collection:', err);
            observer.error(err);
          },
        });
      } else {
        this.dspaceService.getMappedCollection(itemId).subscribe({
          next: (names) => {
            if (names) {
              this.collectionNames[itemId] = names;
              observer.next(names);
            }
          },
          error: (error) => {
            console.error('Erreur lors de la récupération des collections', error);
            observer.error(error);
          },
        });
      }
    });
  }
}
